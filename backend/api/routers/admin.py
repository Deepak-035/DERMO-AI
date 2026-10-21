from typing import Literal, Optional, Dict, Any, List
from collections import defaultdict
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, status
from api.auth import require_admin, AuthenticatedUser
from api.supabase_client import supabase
from api.logger import logger
from api.services.audit_service import log_audit_event
from api.ml.labels import CLASS_INFO

router = APIRouter(
    prefix="/admin",
    tags=["Administration"],
)


class RoleUpdateRequest(BaseModel):
    role: Literal["user", "admin"]


@router.get(
    "/stats",
    summary="Admin Dashboard Analytics & Metrics",
    description="Calculates comprehensive user statistics, discrete sign-in metrics, classification timeline, and 7-class breakdown.",
)
def get_admin_stats(current_user: AuthenticatedUser = Depends(require_admin)):
    """
    Returns analytics matching all requirements in Section 2:
    - User statistics: Total registered, distinct users signed in, total sign-in events, registrations timeline
    - Classification statistics: Total classifications, distinct users who classified, activity timeline, breakdown by model classes
    """
    # 1. Initialize result structure with 7 actual model classes
    class_breakdown: Dict[str, Dict[str, Any]] = {}
    for idx, info in CLASS_INFO.items():
        class_breakdown[info["code"]] = {
            "code": info["code"],
            "name": info["name"],
            "count": 0,
            "percentage": 0.0,
        }

    stats: Dict[str, Any] = {
        "user_stats": {
            "total_registered_users": 0,
            "distinct_users_signed_in": 0,
            "total_sign_in_events": 0,
            "admins_count": 0,
            "regular_users_count": 0,
            "registrations_over_time": [],
        },
        "classification_stats": {
            "total_classifications": 0,
            "distinct_users_classified": 0,
            "classification_activity_over_time": [],
            "breakdown_by_class": list(class_breakdown.values()),
        },
    }

    # 2. Fetch Profiles for user metrics
    profiles: List[Dict[str, Any]] = []
    try:
        prof_resp = supabase.table("profiles").select("id, role, created_at, last_sign_in_at").execute()
        profiles = prof_resp.data or []
    except Exception as e:
        logger.warning(f"Failed to query profiles for stats: {e}")

    total_users = len(profiles)
    admins_count = sum(1 for p in profiles if p.get("role") == "admin")
    regular_users = total_users - admins_count
    distinct_signed_in = sum(1 for p in profiles if p.get("last_sign_in_at") is not None)

    # Calculate registrations timeline (by date YYYY-MM-DD)
    reg_by_date = defaultdict(int)
    for p in profiles:
        created = p.get("created_at")
        if created:
            date_str = str(created)[:10]
            reg_by_date[date_str] += 1

    sorted_reg_timeline = [
        {"date": d, "count": count}
        for d, count in sorted(reg_by_date.items())
    ]

    stats["user_stats"]["total_registered_users"] = total_users
    stats["user_stats"]["admins_count"] = admins_count
    stats["user_stats"]["regular_users_count"] = regular_users
    stats["user_stats"]["distinct_users_signed_in"] = distinct_signed_in
    stats["user_stats"]["registrations_over_time"] = sorted_reg_timeline[-14:]  # Last 14 active days

    # 3. Query discrete sign-in events from user_sign_ins table
    try:
        sign_ins_resp = supabase.table("user_sign_ins").select("id, user_id, sign_in_at").execute()
        sign_in_records = sign_ins_resp.data or []
        stats["user_stats"]["total_sign_in_events"] = len(sign_in_records)
        if sign_in_records:
            distinct_uids = {r.get("user_id") for r in sign_in_records if r.get("user_id")}
            stats["user_stats"]["distinct_users_signed_in"] = max(distinct_signed_in, len(distinct_uids))
    except Exception as e:
        logger.debug(f"user_sign_ins table not yet queried or empty: {e}")
        # Fallback to distinct_signed_in count from profiles
        stats["user_stats"]["total_sign_in_events"] = distinct_signed_in

    # 4. Fetch Predictions for classification statistics
    predictions: List[Dict[str, Any]] = []
    try:
        pred_resp = supabase.table("predictions").select("id, code, user_id, created_at").execute()
        predictions = pred_resp.data or []
    except Exception as e:
        logger.warning(f"Failed to query predictions for stats: {e}")

    total_predictions = len(predictions)
    distinct_users_classified_set = {
        p.get("user_id") for p in predictions if p.get("user_id") is not None
    }

    # Class breakdown
    for pred in predictions:
        code = str(pred.get("code") or "").lower().strip()
        if code in class_breakdown:
            class_breakdown[code]["count"] += 1
        else:
            # Handle unknown or unmapped codes
            if "other" not in class_breakdown:
                class_breakdown["other"] = {"code": "other", "name": "Other / Unmapped", "count": 0, "percentage": 0.0}
            class_breakdown["other"]["count"] += 1

    # Compute percentages
    for code, item in class_breakdown.items():
        if total_predictions > 0:
            item["percentage"] = round((item["count"] / total_predictions) * 100, 1)

    # Activity timeline (by date YYYY-MM-DD)
    pred_by_date = defaultdict(int)
    for p in predictions:
        created = p.get("created_at")
        if created:
            date_str = str(created)[:10]
            pred_by_date[date_str] += 1

    sorted_pred_timeline = [
        {"date": d, "count": count}
        for d, count in sorted(pred_by_date.items())
    ]

    stats["classification_stats"]["total_classifications"] = total_predictions
    stats["classification_stats"]["distinct_users_classified"] = len(distinct_users_classified_set)
    stats["classification_stats"]["classification_activity_over_time"] = sorted_pred_timeline[-14:]
    stats["classification_stats"]["breakdown_by_class"] = list(class_breakdown.values())

    return {
        "success": True,
        "stats": stats,
    }


@router.get(
    "/users",
    summary="Searchable & Paginated Registered Users (Admin Only)",
    description="Returns registered users with classification counts, last sign-in timestamp, and role without exposing private credentials.",
)
def list_users(
    query: Optional[str] = Query(None, description="Search by email or name"),
    role: Optional[str] = Query(None, description="Filter by role ('user' or 'admin')"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: AuthenticatedUser = Depends(require_admin),
):
    try:
        # 1. Fetch user profiles
        db_query = supabase.table("profiles").select(
            "id, email, full_name, avatar_url, role, created_at, last_sign_in_at",
            count="exact",
        ).order("created_at", desc=True)

        if role in ["user", "admin"]:
            db_query = db_query.eq("role", role)

        if query and query.strip():
            # Filter by email or full_name (case-insensitive)
            q = query.strip()
            db_query = db_query.or_(f"email.ilike.%{q}%,full_name.ilike.%{q}%")

        resp = db_query.range(offset, offset + limit - 1).execute()
        users_data = resp.data or []
        total_count = resp.count if resp.count is not None else len(users_data)

        # 2. Fetch classification counts per user in bulk
        user_ids = [u["id"] for u in users_data if u.get("id")]
        classification_counts: Dict[str, int] = defaultdict(int)

        if user_ids:
            try:
                preds_resp = supabase.table("predictions").select("user_id").in_("user_id", user_ids).execute()
                for p in (preds_resp.data or []):
                    uid = p.get("user_id")
                    if uid:
                        classification_counts[str(uid)] += 1
            except Exception as e:
                logger.debug(f"Could not aggregate prediction counts: {e}")

        # 3. Enrich users with stats
        enriched_users = []
        for u in users_data:
            uid = str(u.get("id"))
            enriched_users.append({
                "id": uid,
                "email": u.get("email"),
                "full_name": u.get("full_name") or "User",
                "avatar_url": u.get("avatar_url"),
                "role": u.get("role") or "user",
                "created_at": u.get("created_at"),
                "last_sign_in_at": u.get("last_sign_in_at"),
                "classifications_count": classification_counts.get(uid, 0),
            })

        return {
            "success": True,
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "users": enriched_users,
        }
    except Exception as e:
        logger.exception(f"Error fetching users for admin: {e}")
        return {
            "success": False,
            "total": 0,
            "limit": limit,
            "offset": offset,
            "users": [],
            "message": "Could not fetch user list.",
        }


@router.post(
    "/users/{user_id}/role",
    summary="Update User Role (Promote / Demote Admin)",
    description="Admin can promote a user to admin or reassign them to user.",
)
def update_user_role(
    user_id: str,
    payload: RoleUpdateRequest,
    current_user: AuthenticatedUser = Depends(require_admin),
):
    if str(user_id) == str(current_user.id) and payload.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot demote their own account.",
        )

    try:
        check_resp = supabase.table("profiles").select("id, role, full_name, email").eq("id", user_id).limit(1).execute()
        if not check_resp.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} was not found.",
            )

        old_role = check_resp.data[0].get("role")
        resp = supabase.table("profiles").update({"role": payload.role}).eq("id", user_id).execute()

        log_audit_event(
            actor_id=current_user.id,
            action="role_updated",
            target_id=user_id,
            details={"old_role": old_role, "new_role": payload.role},
        )

        return {
            "success": True,
            "message": f"User role successfully updated to '{payload.role}'.",
            "user": resp.data[0] if resp.data else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error updating user role: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user role.",
        )


@router.get(
    "/audit-logs",
    summary="View System Audit Trail (Admin Only)",
    description="Returns security-sensitive events including role modifications and system events.",
)
def get_audit_logs(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: AuthenticatedUser = Depends(require_admin),
):
    try:
        resp = (
            supabase.table("audit_logs")
            .select("*")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return {
            "success": True,
            "logs": resp.data or [],
        }
    except Exception as e:
        logger.warning(f"Could not load audit logs: {e}")
        return {
            "success": True,
            "logs": [],
        }
