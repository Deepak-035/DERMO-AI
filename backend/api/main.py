from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from api.routers.predict import router as predict_router
from api.routers.history import router as history_router

from api.exceptions import (
    http_exception_handler,
    general_exception_handler
)

from api.config import (
    API_TITLE,
    API_VERSION,
    API_DESCRIPTION
)

app=FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description=API_DESCRIPTION
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite
        "http://127.0.0.1:5173",
        "https://skin-disease.vercel.app",
        "*", #If the below allow_credentials=True, there is no use of "*"
    ],
    allow_credentials=False, #Change it True if you have any particular user credentials to login
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(
    HTTPException,
    http_exception_handler,
)

app.add_exception_handler(
    Exception,
    general_exception_handler
)

@app.get(
    "/",
    tags=["General"],
    summary="Home"
)
def home():
    return{
        "status":"Backend Running",
        "model":"Hybrid CNN-Transformer"
    }

def root():
    return{
        "project":"Skin Disease Classification API",
        "version":"1.0.0",
        "status":"Running"
    }

@app.get(
    "/health",
    tags=["General"],
    summary="Health Check"
)
def health_check():
    return {
        "status":"Healthy, API is running",
        "service":"Skin Disease Classification API"
    }

app.include_router(predict_router)
app.include_router(history_router)