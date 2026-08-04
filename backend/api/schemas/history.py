from datetime import datetime
from pydantic import BaseModel

class PredictionHistoryItem(BaseModel):
    id:int
    filename:str
    image_url:str
    prediction:str
    code:str
    confidence:float
    created_at:datetime

class PredictionHistoryResponse(BaseModel):
    success:bool
    count:int
    predictions:list[PredictionHistoryItem]