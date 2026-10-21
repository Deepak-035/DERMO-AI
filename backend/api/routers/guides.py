from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from api.schemas.guide import SkinConditionGuide, GuideResponse, GuideListResponse
from api.services.guide_service import get_guide_by_key, list_guides
from api.auth import security, _verify_token_claims

router = APIRouter(
    prefix="/guides",
    tags=["Educational Guides"],
)


def get_optional_user(credentials=Depends(security)) -> Optional[dict]:
    """Extract authenticated user info if token is provided, without blocking unauthenticated requests."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return _verify_token_claims(credentials.credentials)
    except Exception:
        return None


@router.get(
    "",
    summary="List Educational Guides",
    description="Returns all published skin condition educational guides.",
    response_model=GuideListResponse,
)
def get_all_guides(user: Optional[dict] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") == "admin")
    guides = list_guides(allow_unpublished=is_admin)
    return {
        "success": True,
        "count": len(guides),
        "guides": guides,
    }


@router.get(
    "/{class_key}",
    summary="Get Educational Guide",
    description="Fetch dynamic educational information for a specific predicted skin condition class.",
    response_model=GuideResponse,
)
def get_guide(class_key: str, user: Optional[dict] = Depends(get_optional_user)):
    is_admin = bool(user and user.get("role") == "admin")
    guide = get_guide_by_key(class_key, allow_unpublished=is_admin)

    if not guide:
        raise HTTPException(
            status_code=404,
            detail=f"No published educational guide found for class '{class_key}'.",
        )

    return {
        "success": True,
        "guide": guide,
    }
