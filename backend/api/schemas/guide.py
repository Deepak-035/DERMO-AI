from typing import Optional, List
from pydantic import BaseModel


class SkinConditionGuide(BaseModel):
    id: Optional[int] = None
    class_key: str
    display_name: str
    overview: str
    risk_factors: List[str] = []
    warning_signs: List[str] = []
    prevention: List[str] = []
    recommended_actions: List[str] = []
    treatment_overview: str
    urgency_level: str
    sources: List[str] = []
    review_status: str = "published"
    reviewed_at: Optional[str] = None


class GuideResponse(BaseModel):
    success: bool
    guide: Optional[SkinConditionGuide] = None
    message: Optional[str] = None


class GuideListResponse(BaseModel):
    success: bool
    count: int
    guides: List[SkinConditionGuide] = []
