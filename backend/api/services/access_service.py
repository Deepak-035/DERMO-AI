from typing import Optional, Any
from datetime import datetime, timezone
from fastapi import HTTPException, status
from api.supabase_client import supabase
from api.logger import logger
from api.services.audit_service import log_audit_event


def has_active_doctor_access(patient_id: str, doctor_id: str) -> bool:
    """
    Check if a doctor currently has an active (non-revoked) sharing consent from the patient.
    """
    if not patient_id or not doctor_id:
        return False
    if str(patient_id) == str(doctor_id):
        return True

    try:
        resp = (
            supabase.table("patient_doctor_access")
            .select("id")
            .eq("patient_id", patient_id)
            .eq("doctor_id", doctor_id)
            .is_("revoked_at", "null")
            .limit(1)
            .execute()
        )
        return bool(resp.data and len(resp.data) > 0)
    except Exception as e:
        logger.warning(f"Error checking doctor access for patient={patient_id} doc={doctor_id}: {e}")
        return False


def get_approved_doctors() -> list[dict[str, Any]]:
    """
    List all doctors registered in profiles with role 'doctor' available for patient sharing.
    """
    try:
        resp = (
            supabase.table("profiles")
            .select("id, full_name, email, avatar_url, role")
            .eq("role", "doctor")
            .execute()
        )
        return resp.data or []
    except Exception as e:
        logger.warning(f"Could not fetch approved doctors: {e}")
        return []


def get_patient_grants(patient_id: str) -> list[dict[str, Any]]:
    """
    Retrieve all sharing grants created by a patient, including doctor profile details.
    """
    try:
        resp = (
            supabase.table("patient_doctor_access")
            .select("id, patient_id, doctor_id, granted_at, revoked_at, notes")
            .eq("patient_id", patient_id)
            .order("granted_at", desc=True)
            .execute()
        )
        grants = resp.data or []

        # Enrich grants with doctor details
        for g in grants:
            doc_id = g.get("doctor_id")
            if doc_id:
                try:
                    p_resp = (
                        supabase.table("profiles")
                        .select("full_name, email, avatar_url")
                        .eq("id", doc_id)
                        .limit(1)
                        .execute()
                    )
                    if p_resp.data:
                        g["doctor"] = p_resp.data[0]
                except Exception:
                    g["doctor"] = None
        return grants
    except Exception as e:
        logger.warning(f"Could not retrieve patient grants: {e}")
        return []


def grant_doctor_access(patient_id: str, doctor_id: str, notes: Optional[str] = None) -> dict[str, Any]:
    """
    Explicitly grant access to an approved doctor for the patient's records.
    """
    if str(patient_id) == str(doctor_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot grant doctor access to your own account.",
        )

    # 1. Verify that doctor_id is actually an approved doctor
    try:
        doc_resp = (
            supabase.table("profiles")
            .select("id, role, full_name, email")
            .eq("id", doctor_id)
            .limit(1)
            .execute()
        )
        if not doc_resp.data or doc_resp.data[0].get("role") != "doctor":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The selected user is not an approved doctor.",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Failed verifying doctor role: {e}")

    # 2. Check if an active grant already exists
    if has_active_doctor_access(patient_id, doctor_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An active access grant already exists for this doctor.",
        )

    # 3. Insert grant
    try:
        new_grant = {
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "notes": notes or "Authorized by patient for clinical review",
            "granted_at": datetime.now(timezone.utc).isoformat(),
        }
        resp = supabase.table("patient_doctor_access").insert(new_grant).execute()
        if not resp.data:
            raise RuntimeError("Failed to insert access grant.")

        grant_record = resp.data[0]
        log_audit_event(
            actor_id=patient_id,
            action="access_granted",
            target_id=str(grant_record["id"]),
            details={"doctor_id": doctor_id},
        )
        return grant_record
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error granting doctor access: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record access grant in database.",
        )


def revoke_doctor_access(grant_id: str, patient_id: str) -> bool:
    """
    Revoke a previously granted doctor access.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        # Check grant ownership
        check_resp = (
            supabase.table("patient_doctor_access")
            .select("id, patient_id, doctor_id, revoked_at")
            .eq("id", grant_id)
            .limit(1)
            .execute()
        )
        if not check_resp.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Access grant record not found.",
            )

        grant = check_resp.data[0]
        if str(grant["patient_id"]) != str(patient_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only revoke your own consent grants.",
            )

        if grant.get("revoked_at") is not None:
            return True  # Already revoked

        resp = (
            supabase.table("patient_doctor_access")
            .update({"revoked_at": now_iso})
            .eq("id", grant_id)
            .eq("patient_id", patient_id)
            .execute()
        )

        log_audit_event(
            actor_id=patient_id,
            action="access_revoked",
            target_id=str(grant_id),
            details={"doctor_id": grant.get("doctor_id")},
        )
        return True
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error revoking access grant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke access in database.",
        )


def get_doctor_shared_patients(doctor_id: str) -> list[dict[str, Any]]:
    """
    Return all patients who have currently granted active access to this doctor.
    """
    try:
        resp = (
            supabase.table("patient_doctor_access")
            .select("id, patient_id, granted_at, notes")
            .eq("doctor_id", doctor_id)
            .is_("revoked_at", "null")
            .order("granted_at", desc=True)
            .execute()
        )
        grants = resp.data or []
        patients = []

        for g in grants:
            p_id = g["patient_id"]
            try:
                # Retrieve profile
                prof_resp = (
                    supabase.table("profiles")
                    .select("id, full_name, email, avatar_url")
                    .eq("id", p_id)
                    .limit(1)
                    .execute()
                )
                patient_profile = prof_resp.data[0] if prof_resp.data else {
                    "id": p_id,
                    "full_name": f"Patient ({p_id[:8]})",
                    "email": None,
                }

                # Retrieve count of predictions
                pred_resp = (
                    supabase.table("predictions")
                    .select("id", count="exact")
                    .eq("user_id", p_id)
                    .execute()
                )
                pred_count = pred_resp.count or len(pred_resp.data or [])

                patients.append({
                    "grant_id": g["id"],
                    "patient_id": p_id,
                    "granted_at": g["granted_at"],
                    "notes": g["notes"],
                    "profile": patient_profile,
                    "predictions_count": pred_count,
                })
            except Exception as item_err:
                logger.warning(f"Error loading shared patient details for {p_id}: {item_err}")

        return patients
    except Exception as e:
        logger.warning(f"Error retrieving shared patients for doctor {doctor_id}: {e}")
        return []
