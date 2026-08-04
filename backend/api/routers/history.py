from fastapi import APIRouter,Query
from api.services.history_service import(
    get_prediction_history,
    get_prediction_by_id,
    delete_prediction
)

router=APIRouter(
    prefix="/history",
    tags=["Prediction History"]
)

@router.get(
    "",
    summary="Get All Prediction History",
    description="Returns all previous predictions ordered by newest first."
)

def history(
        limit:int=Query(20,ge=1,le=100),
        offset:int=Query(0,ge=0)
):
    predictions=get_prediction_history(limit,offset)

    return{
        "success":True,
        "count":len(predictions),
        "predictions":predictions
    }

@router.get(
    "/{prediction_id}",
    summary="Get Prediction by ID",
    description="Returns a specific prediction record using its database ID."
)

def history_by_id(prediction_id:int):
    prediction=get_prediction_by_id(prediction_id)

    return{
        "success":True,
        "prediction":prediction
    }

@router.delete(
    "/{prediction_id}",
    summary="Delete a Prediction",
    description="Deletes a prediction record and its associated image from Supabase Storage."
)

def delete_history(prediction_id:int):
    success=delete_prediction(prediction_id)
    if not success:
        return{
            "success":False,
            "message":"Prediction not found."
        }

    return{
        "success":True,
        "message":"Prediction deleted successfully."
    }