# Skin Disease Classification API
A FastAPI backend for skin disease classification using a Hybrid CNN-Transformer model.
The API accepts a skin lesion image, validates the image quality, predicts the disease class, uploads the image to Supabase Storage and stores prediction history in Supabase Database.
---
## Features
- Skin disease classification
- Hybrid CNN + Transformer model
- FastAPI REST API
- Supabase Storage integration
- Supabase Database integration
- Image upload
- Prediction history
- Confidence score
- Image quality validation
---
## Validation Pipeline
### Image Validation
- File extension validation
- Image verification
- Corrupted image detection

### Quality Checks
- Resolution check
- Brightness check
- Blur detection

### Prediction
- Confidence threshold
---
## Tech Stack
Backend
- FastAPI
- Python

Machine Learning
- PyTorch
- TorchVision

Image Processing
- Pillow
- OpenCV

Database
- Supabase PostgreSQL

Storage
- Supabase Storage

Validation
- Pydantic
---
## Project Structure
```
backend/
│
├── api/
│   ├── routers/
│   ├── services/
│   ├── ml/
│   ├── schemas/
│   ├── main.py
│   ├── config.py
│   ├── logger.py
│   └── supabase_client.py
│
├── requirements.txt
├── .gitignore
└── README.md
```
---
## Installation
Clone the repository
```bash
git clone <repository-url>
```

Move into the project
```bash
cd backend
```

Create virtual environment
```bash
python -m venv venv
```

Activate virtual environment
Windows
```bash
venv\Scripts\activate
```

Linux/macOS
```bash
source venv/bin/activate
```

Install dependencies
```bash
pip install -r requirements.txt
```

---
## Environment Variables
Create a `.env` file.

```env
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_KEY=YOUR_SUPABASE_ANON_KEY
```
---
## Run the API
```bash
uvicorn api.main:app --reload
```

Server
```
http://127.0.0.1:8000
```

Swagger Documentation
```
http://127.0.0.1:8000/docs
```

ReDoc
```
http://127.0.0.1:8000/redoc
```

---
## API Endpoints
### Predict
```
POST /predict
```

Upload an image and receive:
- Predicted disease
- Confidence score
- Warnings (if any)
- Image URL

---
### Prediction History
```
GET /history
```

Returns previously stored predictions.
---
## Model
The backend uses a Hybrid CNN-Transformer model implemented in PyTorch for multi-class skin disease classification.
---

## Remaining Work
- Frontend integration
- Authentication
---

## Supabase PostgreSQL Code
The Code is present in "Database_Table_Code.sql" file.Paste in the Supabase SQL Editor and Run it.

## Supabase Storage Bucket
The Supabase Storage Bucket named "skin-images" needs to be created manually for storing the uploaded images. 