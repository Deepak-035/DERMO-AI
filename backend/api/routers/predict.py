import uuid
from pathlib import Path
from api.schemas.prediction import PredictionResponse
from api.services.prediction_service import predict_image
from fastapi import APIRouter,UploadFile,File,HTTPException
from api.config import ALLOWED_IMAGE_TYPES,MAX_UPLOAD_SIZE,UPLOAD_FOLDER

router=APIRouter(
    prefix="/predict",
    tags=["Prediction"]
)

UPLOAD_DIR=Path(UPLOAD_FOLDER)
UPLOAD_DIR.mkdir(parents=True,exist_ok=True)

@router.post(
    "",
    summary="Predict Skin Disease",
    description="Upload a skin image and receive the predicted disease with confidence score.",
    response_model=PredictionResponse
)

async def predict(file:UploadFile=File(...)):
    #Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and JPEG images are allowed."
        )

    #Generate unique filename
    extension=Path(file.filename).suffix
    filename=f"{uuid.uuid4()}{extension}"
    file_path=UPLOAD_DIR/filename

    #Read uploaded file
    contents= await file.read()

    #Validate file size
    if len(contents)>MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Maximum file size is 5 MB."
        )

    #Save temporary file
    with open(file_path,"wb") as buffer:
        buffer.write(contents)

    #Run prediction
    result=predict_image(
        str(file_path),
        filename
    )

    #Return response
    return{
        "success":True,
        "message":"Prediction completed successfully.",
        "filename":filename,
        "result":result
    }