import os
from dotenv import load_dotenv

load_dotenv()

#Supabase
SUPABASE_URL=os.getenv("SUPABASE_URL")
SUPABASE_KEY=os.getenv("SUPABASE_KEY")

#Storage
UPLOAD_FOLDER="uploads"
BUCKET_NAME="skin-images"

#File Validation
MAX_UPLOAD_SIZE=5*1024*1024  #5 MB
ALLOWED_IMAGE_TYPES={
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
}

#Model
MODEL_PATH="trained_models/hybrid_best.pth"

#API
API_TITLE="Skin Disease Classification API"
API_VERSION="1.0.0"
API_DESCRIPTION=("Backend API for Skin Disease Classification using a Hybrid CNN-Transformer model.""<br>""<b><h4>⚠️DISCLAIMER: This model is intended only for dermoscopic or skin lesion images. Uploading unrelated images may produce invalid predictions.⚠️</b></h4>")