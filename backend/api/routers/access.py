from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from api.auth import get_current_user, require_doctor, AuthenticatedUser
from api.services.access_service import (
    get_approved_doctors,
    get_patient_grants,
    grant_doctor_access,
    revoke_doctor_access,
    get_doctor_shared_patients,
    has_active_doctor_access,
)
from api.services.history_service import get_prediction_history, get_prediction_by_id

router = APIRouter(
    tags=["Patient-Doctor Access"],
)


class GrantAccessRequest(BaseModel):
    doctor_id: str
    notes: Optional[str] = None


# ==============================================================================
# Patient Endpoints: Manage Consent
# ==============================================================================

@router.get(
    "/access/doctors",
    summary="List Approved Doctors",
    description="Returns all doctors approved by administrators, available for patient record sharing.",
)
def list_doctors(current_user: AuthenticatedUser = Depends(get_current_user)):
    doctors = get_approved_doctors()
    # Filter out self if user is a doctor
    return {
        "success": True,
        "doctors": [d for d in doctors if str(d.get("id")) != str(current_user.id)],
    }


@router.get(
    "/access/grants",
    summary="List Patient's Sharing Grants",
    description="Returns all active and revoked sharing permissions granted by the authenticated patient.",
)
def list_my_grants(current_user: AuthenticatedUser = Depends(get_current_user)):
    grants = get_patient_grants(patient_id=current_user.id)
    return {
        "success": True,
        "grants": grants,
    }


@router.post(
    "/access/grant",
    summary="Grant Doctor Access",
    description="Explicitly authorizes an approved doctor to access the patient's predictions and reports.",
)
def create_grant(
    payload: GrantAccessRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    grant = grant_doctor_access(
        patient_id=current_user.id,
        doctor_id=payload.doctor_id,
        notes=payload.notes,
    )
    return {
        "success": True,
        "message": "Access successfully granted to doctor.",
        "grant": grant,
    }


@router.post(
    "/access/revoke/{grant_id}",
    summary="Revoke Doctor Access",
    description="Immediately revokes a previously granted doctor permission.",
)
def revoke_grant(
    grant_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    success = revoke_doctor_access(grant_id=grant_id, patient_id=current_user.id)
    return {
        "success": success,
        "message": "Doctor access successfully revoked.",
    }


# ==============================================================================
# Doctor Endpoints: Clinical Review of Consenting Patients
# ==============================================================================

@router.get(
    "/doctor/patients",
    summary="List Consenting Patients (Doctor Dashboard)",
    description="Returns patients who currently have an active, non-revoked consent grant for this doctor.",
)
def doctor_patients(current_user: AuthenticatedUser = Depends(require_doctor)):
    patients = get_doctor_shared_patients(doctor_id=current_user.id)
    return {
        "success": True,
        "count": len(patients),
        "patients": patients,
    }


@router.get(
    "/doctor/patients/{patient_id}/predictions",
    summary="View Consenting Patient Records",
    description="Returns prediction history for a specific patient who has an active consent grant.",
)
def doctor_view_patient_predictions(
    patient_id: str,
    limit: int = 50,
    offset: int = 0,
    current_user: AuthenticatedUser = Depends(require_doctor),
):
    if not has_active_doctor_access(patient_id=patient_id, doctor_id=current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have active patient consent to view these clinical records.",
        )

    predictions = get_prediction_history(user_id=patient_id, limit=limit, offset=offset)
    return {
        "success": True,
        "patient_id": patient_id,
        "count": len(predictions),
        "predictions": predictions,
    }


@router.get(
    "/doctor/predictions/{prediction_id}",
    summary="View Specific Patient Prediction Record",
    description="Retrieve a single prediction record, verifying active patient consent.",
)
def doctor_view_prediction(
    prediction_id: int,
    current_user: AuthenticatedUser = Depends(require_doctor),
):
    prediction = get_prediction_by_id(prediction_id, current_user=current_user)
    return {
        "success": True,
        "prediction": prediction,
    }
