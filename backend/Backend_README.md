# DERMO-AI Backend — Developer Quickstart & API Guide

A FastAPI backend for skin disease screening, sequential deep-learning inference, PDF assessment reporting, and dynamic educational guidance.

---

## 🚀 Key Modules & Endpoints

| Endpoint | Method | Description | Auth Required |
|---|:---:|---|:---:|
| `/health` | `GET` | Health check (DB, Storage, Model status) | No |
| `/predict` | `POST` | Upload image & run 3-stage classification pipeline | Yes (User/Admin) |
| `/guides` | `GET` | Retrieve list of all published educational guides | No |
| `/guides/{class_key}` | `GET` | Fetch educational guide for a specific condition | No |
| `/reports/{id}/download` | `GET` | Download PDF medical report by report ID | Yes (Owner/Admin) |
| `/reports/prediction/{id}/download` | `GET` | Download PDF medical report by prediction ID | Yes (Owner/Admin) |
| `/history` | `GET` | Retrieve user's past screening results | Yes (Owner/Admin) |
| `/history/{id}` | `DELETE` | Delete history entry and associated image | Yes (Owner/Admin) |
| `/admin/users` | `GET` | Manage users and view screening statistics | Yes (Admin only) |
| `/admin/stats` | `GET` | System-wide analytics & diagnosis breakdown | Yes (Admin only) |
| `/admin/audit-logs` | `GET` | System activity audit logs | Yes (Admin only) |

---

## 🔬 Sequential Inference Architecture

1. **Pre-processing & Validation**:
   - Resolution, contrast, brightness bounds, and Laplacian blur detection (`OpenCV`).
2. **Stage 1 (MobileNetV2)**:
   - Skin vs. Non-Skin validation. Rejects non-skin images early.
3. **Stage 2 (EfficientNetB0)**:
   - Normal Skin vs. Lesion-Affected Skin classification.
4. **Stage 3 (Hybrid CNN–Transformer)**:
   - Classifies lesion images into 7 classes: `nv`, `mel`, `bkl`, `bcc`, `akiec`, `vasc`, `df`.

---

## 📚 Educational Guides Service

- Route: `/guides/{class_key}`
- Supported codes & keys:
  - `nv` / `melanocytic_nevus`
  - `mel` / `melanoma`
  - `bkl` / `benign_keratosis`
  - `bcc` / `basal_cell_carcinoma`
  - `akiec` / `actinic_keratoses`
  - `vasc` / `vascular_lesion`
  - `df` / `dermatofibroma`
- Connected to Supabase table `public.skin_condition_guides` with in-memory baseline fallback.

---

## 🛠️ Project Structure

```text
backend/
├── api/
│   ├── ml/                    # Models (Hybrid CNN-Transformer), labels, inference
│   ├── routers/               # predict, reports, history, admin, guides
│   ├── schemas/               # Pydantic schemas (prediction, history, guide)
│   ├── services/              # Business logic (prediction, storage, report, guide)
│   ├── auth.py                # Supabase Auth JWT verification & RBAC
│   ├── config.py              # Environment configuration & constants
│   ├── logger.py              # Logging setup
│   ├── main.py                # FastAPI entry point
│   └── supabase_client.py     # Supabase client setup
├── trained_models/            # PyTorch model weights (.pth)
├── uploads/                   # Temporary file processing directory
├── test_educational_guides.py# Automated unit test suite
├── Database_Table_Code.sql    # Complete SQL schema & RLS policies
├── requirements.txt           # Python dependencies
└── .env.example               # Environment variables template
```

---

## 💻 Setup & Run Locally

### 1. Create Virtual Environment
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
```

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key
VITE_API_URL=http://localhost:8000
```

### 4. Start Server
```powershell
python -m uvicorn api.main:app --port 8000
```

Access OpenAPI Swagger docs at: `http://localhost:8000/docs`

---

## 🧪 Running Tests

Run the educational guides unit tests:
```powershell
python -m unittest test_educational_guides.py
```