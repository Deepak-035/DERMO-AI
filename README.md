# DERMO-AI — Advanced Skin Disease Classification & Clinical Guidance Platform

DERMO-AI is an end-to-end medical deep-learning web platform designed for automated skin lesion screening, clinical report generation, and evidence-based educational guidance.

The system features a **3-stage sequential inference pipeline** powered by a **Hybrid CNN–Transformer** architecture (79% test accuracy on HAM10000), paired with a modern **React 19 + TypeScript** glassmorphic frontend, a **FastAPI** backend, and **Supabase** for role-based authentication (RBAC), private cloud storage, and database persistence.

## Repository Structure

## 🌟 Key Platform Features

- **Sequential 3-Stage Classification Pipeline**:
  - **Stage 1 (Skin Validation)**: MobileNetV2 rejects non-skin uploads (clothing, backgrounds, objects) early.
  - **Stage 2 (Lesion Detection)**: EfficientNetB0 distinguishes normal-looking skin from lesion-affected skin.
  - **Stage 3 (7-Class Disease Classification)**: Hybrid CNN–Transformer model classifies lesion-affected skin into 7 diagnostic categories.
- **Dynamic Skin Condition Educational Guide**:
  - Immediately displays medically referenced educational guidance below the prediction result on the web application.
  - Provides detailed sections: *About this condition*, *Causes & Risk Factors*, *Warning Signs (ABCDEs)*, *Precautions & Prevention*, *Recommended Next Steps & Clinical Urgency*, *Treatment Overview*, and *Literature Sources (AAD, NCCN, DermNet NZ)*.
  - Includes responsive accordions, urgency badges (`Urgent`, `Prompt`, `Routine`), and non-diagnostic safety disclaimers.
- **Strict PDF Report Separation**:
  - Automatically compiles and stores downloadable clinical assessment PDF reports (ReportLab).
  - Educational guide content is strictly isolated to the web result interface and does not leak into or alter clinical PDF reports.
- **Two-Role Authentication & Access Control (RBAC)**:
  - Built on Supabase Auth with Row Level Security (RLS).
  - Supports `user` (patient screening, private history, report download) and `admin` (audit logs, user management, system analytics).
- **Quality & Preprocessing Checks**:
  - OpenCV-based blur detection, brightness validation, and resolution bounds to minimize prediction artifacts.

### `main`
- Contains the initial project files and earlier implementation.
- Retained for reference purposes only.
- No use of it.

## 🔬 Classification Models & Performance

The core lesion classifier was trained and evaluated on the **HAM10000** dermatoscopic dataset across 7 diagnostic classes:

| Model Version | Architecture Description | Test Accuracy | Status |
|---|---|:---:|:---:|
| **MP_1** | EfficientNet-B0 (Frozen Feature Extractor, classifier trained) | 63% | Baseline |
| **MP_2** | EfficientNet-B0 (Full Fine-Tuning across all layers) | 73% | Improved Baseline |
| **MP_2_H** | **Hybrid CNN–Transformer** (EfficientNet-B0 + Transformer Encoder) | **79%** | **Current Production Model** |

### Supported Diagnostic Classes

| Model Code | Diagnostic Class Name | Canonical `class_key` | Clinical Urgency Level |
|:---:|---|---|:---:|
| `nv` | Melanocytic Nevus | `melanocytic_nevus` | Routine |
| `mel` | Melanoma | `melanoma` | Urgent |
| `bkl` | Benign Keratosis | `benign_keratosis` | Routine |
| `bcc` | Basal Cell Carcinoma | `basal_cell_carcinoma` | Prompt |
| `akiec` | Actinic Keratoses | `actinic_keratoses` | Prompt |
| `vasc` | Vascular Lesion | `vascular_lesion` | Routine |
| `df` | Dermatofibroma | `dermatofibroma` | Routine |

---

## 🏗️ System Architecture & Data Flow

```text
                                    Uploaded Image
                                          │
                                          ▼
                               ┌─────────────────────┐
                               │  Image Validation   │ (OpenCV: Blur, Brightness, Resolution)
                               └──────────┬──────────┘
                                          │ Passed
                                          ▼
                               ┌─────────────────────┐
                               │       Stage 1       │
                               │   Skin / Non-Skin   │ (MobileNetV2)
                               └──────────┬──────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        │ Is Skin                           │ Non-Skin
                        ▼                                   ▼
             ┌─────────────────────┐                   Reject Image
             │       Stage 2       │
             │ Normal vs. Lesion   │ (EfficientNetB0)
             └──────────┬──────────┘
                        │
         ┌──────────────┴──────────────┐
         │ Lesion-Affected Skin        │ Normal Skin
         ▼                             ▼
┌──────────────────┐          Return Normal Skin Notice
│     Stage 3      │
│ Hybrid CNN +     │ (EfficientNet-B0 + Transformer Encoder)
│ Transformer      │
└────────┬─────────┘
         │
         ├─────────────────────────────────────────┐
         ▼                                         ▼
┌─────────────────────────┐               ┌─────────────────────────┐
│     Backend Services    │               │  Web Result Page (UI)   │
├─────────────────────────┤               ├─────────────────────────┤
│ • Supabase Storage      │               │ • Diagnostic Result     │
│ • Database Persistence  │               │ • Confidence Progress   │
│ • PDF Report Generation │               │ • Download PDF Button   │
│ • Audit Log Recording   │               │ • Dynamic Educational   │
└─────────────────────────┘               │   Guide (<SkinCondition-│
                                          │   Guide />)             │
                                          └─────────────────────────┘
```

---

## 📁 Repository Directory Structure

```text
dermoAI/
├── .gitignore                     # Git ignore rules for node, python, logs, and .env
├── README.md                      # Comprehensive project documentation
├── vercel.json                    # Vercel deployment routing configuration
│
├── supabase/
│   └── migrations/                # Version-controlled Supabase SQL migrations
│       ├── 20261019_auth_rbac_privacy.sql
│       ├── 20261020_two_role_system.sql
│       └── 20261021_skin_condition_guides.sql # Guides table, RLS, & seed data
│
├── backend/                       # FastAPI Python Backend
│   ├── api/
│   │   ├── ml/                    # Inference pipeline, labels, & hybrid model architecture
│   │   ├── routers/               # Endpoints: predict, reports, history, admin, guides
│   │   ├── schemas/               # Pydantic schemas (prediction, history, guide)
│   │   ├── services/              # Prediction, storage, report, audit, & guide services
│   │   ├── auth.py                # Supabase JWT authentication & RBAC dependency
│   │   ├── config.py              # Environment configuration & constants
│   │   ├── logger.py              # Centralized logging configuration
│   │   ├── main.py                # FastAPI entry point & CORS configuration
│   │   └── supabase_client.py     # Server-side Supabase client initialization
│   ├── trained_models/            # Model weights (hybrid_best.pth, etc.)
│   ├── uploads/                   # Temporary upload processing folder
│   ├── .env.example               # Backend environment variables template
│   ├── Database_Table_Code.sql    # Full SQL script for Supabase SQL Editor
│   ├── test_educational_guides.py# Automated unit test suite
│   ├── requirements.txt           # Python backend dependencies
│   ├── Dockerfile                 # Container image specification
│   ├── Backend_README.md          # Quickstart backend guide
│   └── README.md                  # Detailed backend technical guide
│
└── frontend/                      # React 19 + TypeScript + Vite Frontend
    ├── src/
    │   ├── components/            # UI components (SkinConditionGuide, LevitatingCard, etc.)
    │   ├── context/               # AuthContext (user session & role management)
    │   ├── lib/                   # Supabase client & utility functions
    │   ├── pages/                 # Login, Dashboard, Predict, History, AdminDashboard
    │   ├── services/              # api.ts (centralized fetch layer & guide retriever)
    │   ├── utils/                 # classMapping.ts (model code to class_key mapper)
    │   ├── App.tsx                # Client routing & ProtectedRoute guards
    │   └── main.tsx               # Application root
    ├── .env.example               # Frontend environment variables template
    ├── package.json               # Node dependencies & npm scripts
    ├── tailwind.config.js         # Tailwind theme & color configurations
    ├── vite.config.ts             # Vite build settings & path aliases (@/)
    ├── Frontend_README.md         # Quickstart frontend guide
    └── README.md                  # Step-by-step frontend integration guide
```

---

## ⚡ Quick Start & Local Setup

### Prerequisites
- Python 3.10+ (Recommended: Python 3.11 / 3.12)
- Node.js 18+ & npm 9+
- A free [Supabase](https://supabase.com) account (or existing Supabase project)

---

### Step 1: Database Migration (Supabase)

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Run the migrations in sequence from `supabase/migrations/`:
   - `20261019_auth_rbac_privacy.sql`
   - `20261020_two_role_system.sql`
   - `20261021_skin_condition_guides.sql`
   *(Alternatively, run the consolidated script in `backend/Database_Table_Code.sql`).*

---

### Step 2: Configure Environment Files

#### Backend:
In `backend/`, copy `.env.example` to `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key
VITE_API_URL=http://localhost:8000
```

#### Frontend:
In `frontend/`, copy `.env.example` to `.env`:
```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

### Step 3: Run Backend Server

```powershell
cd backend

# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
python -m uvicorn api.main:app --reload --port 8000
```

- API Base: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/health`

---

### Step 4: Run Frontend Client

Open a new terminal:

```powershell
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

- Web Client: `http://localhost:5173`

---

## 🧪 Testing and Verification

Run the automated test suite to verify endpoints, class mappings, and report safety:

```powershell
cd backend
python -m unittest test_educational_guides.py
```

Run frontend linting and build validation:

```powershell
cd frontend
npm run lint
npx vite build
```

---

## ⚠️ Medical Safety & Regulatory Disclaimer

DERMO-AI is designed as an **educational, research, and preliminary screening assistance tool**. 

1. **Non-Diagnostic**: Predictions generated by DERMO-AI represent statistical pattern recognitions and **do not constitute a confirmed medical diagnosis**.
2. **Clinical Evaluation Mandatory**: No skin lesion can be confirmed benign or malignant without an in-person clinical examination by a qualified dermatologist and, when indicated, a histopathological biopsy.
3. **No Prescriptions**: DERMO-AI does not prescribe medications, dosages, or personalized treatment regimens.
4. **Emergency Guidance**: Suspected high-risk lesions (such as Melanoma) must be evaluated promptly by a medical specialist.
