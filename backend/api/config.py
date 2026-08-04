import os
from dotenv import load_dotenv

load_dotenv(override=True)

#Supabase
SUPABASE_URL=os.getenv("SUPABASE_URL")
SUPABASE_KEY=os.getenv("SUPABASE_KEY")

#Storage
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
BUCKET_NAME="skin-images"

#File Validation
MAX_UPLOAD_SIZE=5*1024*1024  #5 MB
ALLOWED_IMAGE_TYPES={
    "image/jpeg",
    "image/jpg",
    "image/png",
}

#Model
MODEL_PATH = os.path.join(BASE_DIR, "trained_models", "hybrid_best.pth")

#API
API_TITLE="Skin Disease Classification API"
API_VERSION="1.0.0"
API_DESCRIPTION="Backend API for Skin Disease Classification using a Hybrid CNN-Transformer model."