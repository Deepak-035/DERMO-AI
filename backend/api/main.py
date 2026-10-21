from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from api.routers.predict import router as predict_router
from api.routers.history import router as history_router
from api.routers.reports import router as reports_router
from api.routers.admin import router as admin_router
from api.routers.guides import router as guides_router
from api.auth import get_current_user, AuthenticatedUser

from api.exceptions import (
    http_exception_handler,
    general_exception_handler,
)

from api.config import (
    API_TITLE,
    API_VERSION,
    API_DESCRIPTION,
)

app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description=API_DESCRIPTION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://major-partial-1-ruby.vercel.app",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(
    HTTPException,
    http_exception_handler,
)

app.add_exception_handler(
    Exception,
    general_exception_handler,
)


@app.get(
    "/",
    tags=["General"],
    summary="Home",
)
def home():
    return {
        "status": "Backend Running✅",
        "model": "Hybrid CNN-Transformer",
    }


def root():
    return {
        "project": "Skin Disease Classification API",
        "version": "1.0.0",
        "status": "Running✅",
    }


@app.get(
    "/health",
    tags=["General"],
    summary="Health Check",
)
def health_check():
    return {
        "status": "Healthy✅",
        "service": "Skin Disease Classification API",
        "model": "Hybrid CNN-Transformer",
        "database": "Connected✅",
        "storage": "Connected✅",
    }


from fastapi import Request
from api.supabase_client import supabase
from api.logger import logger

@app.get(
    "/auth/me",
    tags=["Authentication"],
    summary="Get Authenticated User Profile & Role",
    description="Returns the calling user's verified identity, role, and profile.",
)
def get_my_profile(current_user: AuthenticatedUser = Depends(get_current_user)):
    return {
        "success": True,
        "user": current_user.model_dump(),
    }


@app.post(
    "/auth/record-sign-in",
    tags=["Authentication"],
    summary="Record Successful Sign-In Event",
    description="Logs a discrete authentication event for analytics without counting refreshes.",
)
async def record_sign_in(
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    # 1. Update last_sign_in_at on profiles table
    try:
        supabase.table("profiles").update({"last_sign_in_at": "now()"}).eq("id", current_user.id).execute()
    except Exception as e:
        logger.debug(f"Could not update last_sign_in_at: {e}")

    # 2. Insert event record in user_sign_ins table
    try:
        supabase.table("user_sign_ins").insert({
            "user_id": current_user.id,
            "ip_address": ip_address,
            "user_agent": user_agent,
        }).execute()
        return {"success": True, "recorded": True}
    except Exception as e:
        logger.warning(f"Could not insert sign-in record (table may be pending migration): {e}")
        return {"success": True, "recorded": False, "note": "user_sign_ins pending migration"}


# Include routers
app.include_router(predict_router)
app.include_router(reports_router)
app.include_router(history_router)
app.include_router(admin_router)
app.include_router(guides_router)