from fastapi import HTTPException
from api.supabase_client import supabase
from api.services.storage_service import delete_image

def get_prediction_history(limit:int=20,offset:int=0):
    response=(
        supabase
        .table("predictions")
        .select("*")
        .order("created_at",desc=True)
        .range(offset,offset+limit-1)
        .execute()
    )

    return response.data

'''Fetch a single prediction by its ID.'''
def get_prediction_by_id(prediction_id:int):
    response=(
        supabase
        .table("predictions")
        .select("*")
        .eq("id",prediction_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail=f"Prediction with ID {prediction_id} not found."
        )

    return response.data[0]

def delete_prediction(prediction_id:int):
    response=(
        supabase
        .table("predictions")
        .select("*")
        .eq("id",prediction_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail=f"Prediction with ID {prediction_id} not found."
        )

    prediction=response.data[0]
    delete_image(prediction["filename"])
    (
        supabase
        .table("predictions")
        .delete()
        .eq("id",prediction_id)
        .execute()
    )

    return True