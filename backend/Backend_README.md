# Skin Disease Classification API
A FastAPI backend for skin disease classification using a Hybrid CNN–Transformer deep learning model. The API predicts the type of skin lesion from an uploaded image, stores prediction history in Supabase and uploads images to Supabase Storage.
---
## Features
- Skin disease prediction using a Hybrid CNN–Transformer model
- Image upload and validation
- Prediction confidence score
- Prediction history management
- Supabase PostgreSQL integration
- Supabase Storage integration
- Global exception handling
- Logging
- Interactive Swagger UI documentation
---
## Tech Stack
- FastAPI
- Python
- PyTorch
- OpenCV
- Pillow
- Supabase
- Uvicorn
---
## Project Structure
```
backend/
│
├── api/
│   ├── ml/
│   ├── routers/
│   ├── schemas/
│   ├── services/
│   ├── config.py
│   ├── exceptions.py
│   ├── logger.py
│   ├── main.py
│   └── supabase_client.py
│
├── trained_models/
│   └── hybrid_best.pth
│
├── uploads/
├── logs/
├── .env
├── requirements.txt
└── README.md
```
---
## API Endpoints
### General
| Method | Endpoint  | Description  |
|--------|-----------|--------------|
| GET    | `/`       | Home         |
| GET    | `/health` | Health Check |

### Prediction
| Method | Endpoint   | Description          |
|--------|------------|----------------------|
| POST   | `/predict` | Predict skin disease |

### History
| Method | Endpoint        | Description            |
|--------|-----------------|------------------------|
| GET    | `/history`      | Get prediction history |
| GET    | `/history/{id}` | Get prediction by ID   |
| DELETE | `/history/{id}` | Delete prediction      |

---
## Installation
Clone the repository.

```bash
git clone <repository-url>
```
Navigate into the project.

```bash
cd backend
```

Create a virtual environment.
```bash
python -m venv venv
```

Activate it.
Windows
```bash
venv\Scripts\activate
```

Linux / macOS
```bash
source venv/bin/activate
```

Install dependencies.
```bash
pip install -r requirements.txt
```

---
## Environment Variables
Create a `.env` file.
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```
---
## Running the Server
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
ReDoc Documentation
```
http://127.0.0.1:8000/redoc
```
---
## Model
The backend uses a Hybrid CNN–Transformer model trained for multiclass skin disease classification.
Predicted classes include:
- Melanocytic Nevus
- Melanoma
- Basal Cell Carcinoma
- Benign Keratosis
- Actinic Keratoses
- Vascular Lesion
- Dermatofibroma
---
## Pending Work
- Frontend integration
- User authentication
- Model performance improvements - If time permits
---
