from pydantic import BaseModel

class PredictionResult(BaseModel):
    prediction:str
    code:str
    confidence:float
    image_url:str

class PredictionResponse(BaseModel):
    success:bool
    message:str
    filename:str
    result:PredictionResult