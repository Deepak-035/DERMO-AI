from fastapi import APIRouter, Query, Depends
from api.services.history_service import (
    get_prediction_history,
    get_prediction_by_id,
    delete_prediction,
)
from api.auth import get_current_user, AuthenticatedUser

router = APIRouter(
    prefix="/history",
    tags=["Prediction History"],
)


@router.get(
    "",
    summary="Get Prediction History",
    description="Returns previous predictions for the authenticated patient, ordered by newest first.",
)
def history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    predictions = get_prediction_history(user_id=current_user.id, limit=limit, offset=offset)

    return {
        "success": True,
        "count": len(predictions),
        "predictions": predictions,
    }


@router.get(
    "/{prediction_id}",
    summary="Get Prediction by ID",
    description="Returns a specific prediction record using its database ID, after verifying patient ownership or authorized doctor access.",
)
def history_by_id(
    prediction_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    prediction = get_prediction_by_id(prediction_id, current_user=current_user)

    return {
        "success": True,
        "prediction": prediction,
    }


@router.delete(
    "/{prediction_id}",
    summary="Delete a Prediction",
    description="Deletes a prediction record and its associated image from private storage if owned by the caller.",
)
def delete_history_endpoint(
    prediction_id: int,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    success = delete_prediction(prediction_id, user_id=current_user.id)
    if not success:
        return {
            "success": False,
            "message": "Prediction not found or not owned by caller.",
        }

    return {
        "success": True,
        "message": "Prediction deleted successfully.",
    }