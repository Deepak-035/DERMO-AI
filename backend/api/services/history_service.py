from typing import Optional, Any
from fastapi import HTTPException, status
from api.supabase_client import supabase
from api.services.storage_service import delete_image, get_signed_image_url
from api.services.audit_service import log_audit_event
from api.auth import AuthenticatedUser


def _enrich_prediction_urls(prediction: dict[str, Any]) -> dict[str, Any]:
    """
    Ensure the prediction has a usable, temporary signed URL for private image viewing.
    """
    storage_path = prediction.get("image_storage_path") or prediction.get("filename")
    if storage_path and (not prediction.get("image_url") or "supabase.co/storage" in str(prediction.get("image_url"))):
        signed = get_signed_image_url(storage_path, expires_in=3600)
        if signed:
            prediction["image_url"] = signed
    return prediction


def get_prediction_history(user_id: str, limit: int = 20, offset: int = 0) -> list[dict[str, Any]]:
    """
    Fetch prediction history strictly for the authenticated patient.
    """
    try:
        # First try query filtering by user_id
        response = (
            supabase
            .table("predictions")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        data = response.data or []
        return [_enrich_prediction_urls(p) for p in data]
    except Exception as e:
        # Fallback if user_id column is not yet queried or migrated
        try:
            response = (
                supabase
                .table("predictions")
                .select("*")
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            data = [p for p in (response.data or []) if str(p.get("user_id")) == str(user_id)]
            return [_enrich_prediction_urls(p) for p in data]
        except Exception:
            return []


def get_prediction_by_id(prediction_id: int, current_user: AuthenticatedUser) -> dict[str, Any]:
    """
    Fetch a single prediction by ID, strictly verifying ownership or admin authorization.
    """
    response = (
        supabase
        .table("predictions")
        .select("*")
        .eq("id", prediction_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prediction with ID {prediction_id} not found."
        )

    prediction = response.data[0]
    owner_id = prediction.get("user_id")

    # If record has an owner, verify permission
    if owner_id:
        is_owner = str(owner_id) == str(current_user.id)
        is_admin = current_user.role == "admin"

        if not (is_owner or is_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view this record.",
            )

    return _enrich_prediction_urls(prediction)


def delete_prediction(prediction_id: int, user_id: str) -> bool:
    """
    Delete a prediction record and its associated image, verifying patient ownership.
    """
    response = (
        supabase
        .table("predictions")
        .select("*")
        .eq("id", prediction_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prediction with ID {prediction_id} not found."
        )

    prediction = response.data[0]
    owner_id = prediction.get("user_id")

    # Verify ownership
    if owner_id and str(owner_id) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete another user's record.",
        )

    # Delete image from storage
    storage_path = prediction.get("image_storage_path") or prediction.get("filename")
    if storage_path:
        delete_image(storage_path)

    # Delete record
    supabase.table("predictions").delete().eq("id", prediction_id).execute()

    log_audit_event(
        actor_id=user_id,
        action="prediction_deleted",
        target_id=str(prediction_id),
    )

    return True