from pydantic import BaseModel
from typing import Optional


class PredictionResult(BaseModel):
    prediction: Optional[str] = None
    code: Optional[str] = None
    confidence: Optional[float] = None
    image_url: Optional[str] = None

    classification: Optional[str] = None
    skin_probability: Optional[float] = None
    non_skin_probability: Optional[float] = None
    threshold: Optional[float] = None


class PredictionResponse(BaseModel):
    success: bool
    message: str
    filename: str
    stage: Optional[int] = None
    result: PredictionResult
    warnings: list[str] = []