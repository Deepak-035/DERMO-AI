# DERMO-AI — Backend Architecture & API Technical Specification

This document provides a comprehensive technical overview of the **DERMO-AI Backend**, built with **FastAPI**, **PyTorch**, **ReportLab**, and **Supabase**.

---

## 📋 Table of Contents
1. [Overview & Capabilities](#1-overview--capabilities)
2. [Sequential 3-Stage Inference Pipeline](#2-sequential-3-stage-inference-pipeline)
3. [Skin Condition Educational Guides System](#3-skin-condition-educational-guides-system)
4. [PDF Clinical Assessment Report Generation](#4-pdf-clinical-assessment-report-generation)
5. [Database Architecture & Migrations](#5-database-architecture--migrations)
6. [API Endpoints Reference](#6-api-endpoints-reference)
7. [Authentication & Role-Based Access Control (RBAC)](#7-authentication--role-based-access-control-rbac)
8. [Testing & Verification](#8-testing--verification)
9. [Local Development Setup](#9-local-development-setup)

---

## 1. Overview & Capabilities

The DERMO-AI backend orchestrates:
- **Computer Vision & Deep Learning**: Validates images, filters out non-skin inputs, checks for normal skin, and classifies skin lesions using a state-of-the-art Hybrid CNN–Transformer model.
- **RESTful API**: Fast, asynchronous endpoints documented automatically via OpenAPI/Swagger.
- **Dynamic Educational Guides**: Serves medically referenced condition information for the 7 supported disease classes.
- **Automated Clinical PDF Reporting**: Creates formatted medical summary PDFs uploaded to private Supabase Storage buckets without leaking educational guides into the report.
- **Two-Role Security**: Enforces Row Level Security (RLS) for regular users and administrative staff.

---

## 2. Sequential 3-Stage Inference Pipeline

The backend executes a 3-stage sequential inference pipeline to prevent unnecessary computation and false classifications on irrelevant uploads:

```text
                     Uploaded Image
                           │
                           ▼
              ┌──────────────────────────┐
              │ Pre-validation & Quality │ (PIL + OpenCV: Dim, Brightness, Blur)
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │         Stage 1          │
              │  MobileNetV2 Classifier  │ (Skin vs. Non-Skin)
              └────────────┬─────────────┘
                           │
                ┌──────────┴──────────┐
                │ Skin                │ Non-Skin
                ▼                     ▼
     ┌─────────────────────┐    Reject early: 
     │       Stage 2       │    "It appears to not be a lesion image."
     │    EfficientNetB0   │    (HTTP 200, success: false)
     └──────────┬──────────┘
                │
         ┌──────┴──────┐
         │ Lesion      │ Normal Skin
         ▼             ▼
┌──────────────────┐ Early return: 
│     Stage 3      │ "The image was classified as normal-looking skin."
│ Hybrid CNN +     │ (HTTP 200, success: true)
│ Transformer      │
└────────┬─────────┘
         │
         ▼
Prediction Result: 7 Diagnostic Classes + Confidence Score
```

### Stage Details:
1. **Stage 1 (Skin Validation)**:
   - Model: MobileNetV2 fine-tuned on skin vs. non-skin photographic datasets.
   - Threshold: Reject non-skin images (e.g. background scenery, clothes, animals).
2. **Stage 2 (Normal Skin vs. Lesion-Affected Skin)**:
   - Model: EfficientNetB0.
   - Purpose: Identifies healthy epidermis and avoids running lesion classification on non-pathological skin.
3. **Stage 3 (Lesion Classification)**:
   - Model: **Hybrid CNN–Transformer** (`HybridCNNTransformer`).
   - Architecture: Combines convolutional feature extraction with multi-head self-attention mechanisms to capture both fine local textures and global lesion morphology.
   - Accuracy: **79% Test Accuracy on HAM10000**.

---

## 3. Skin Condition Educational Guides System

Implemented in `api/routers/guides.py` and `api/services/guide_service.py`, this system delivers clinically referenced educational content dynamically when requested by the web client.

### Supported Classes & Stable Keys:
1. `melanocytic_nevus` (Melanocytic Nevus - `nv`)
2. `melanoma` (Melanoma - `mel`)
3. `benign_keratosis` (Benign Keratosis - `bkl`)
4. `basal_cell_carcinoma` (Basal Cell Carcinoma - `bcc`)
5. `actinic_keratoses` (Actinic Keratoses - `akiec`)
6. `vascular_lesion` (Vascular Lesion - `vasc`)
7. `dermatofibroma` (Dermatofibroma - `df`)

### Data Model (`api/schemas/guide.py`):
Each educational guide includes:
- `class_key`: Unique canonical identifier.
- `display_name`: Human-readable condition name.
- `overview`: Anatomical and pathological overview.
- `risk_factors`: Array of evidence-based statistical risk factors.
- `warning_signs`: Array of alert signs (including ABCDE criteria).
- `prevention`: Evidence-based preventive guidelines.
- `recommended_actions`: Medical next steps and clinical urgency guidance.
- `treatment_overview`: Clinician-directed treatment options (non-prescriptive).
- `urgency_level`: Categorized urgency (`routine`, `prompt`, `urgent`).
- `sources`: Literature references (AAD, NCCN, NCI, DermNet NZ).
- `review_status`: Publication status (`draft`, `reviewed`, `published`).

### Fallback & Resilience:
- When queried, `guide_service.get_guide_by_key()` attempts to query the `skin_condition_guides` PostgreSQL table.
- If the table is not yet migrated in the cloud project, it automatically falls back to an in-memory baseline dictionary, ensuring 100% server uptime and zero downtime during database setup.

---

## 4. PDF Clinical Assessment Report Generation

Clinical reports are created using **ReportLab** in `api/services/report_service.py`.

### PDF Isolation & Separation:
- **Strict Isolation**: Educational guide content is **never** embedded in or passed to the PDF generator.
- The PDF contains exclusively:
  - Report metadata (Report Number, Timestamp, Prediction Record ID).
  - Diagnostic prediction output and model confidence.
  - Normal/lesion probabilities.
  - Image quality warnings (blur, underexposure, etc.).
  - Uploaded lesion image thumbnail.
  - Official medical screening disclaimer.
- The generated PDF is uploaded to Supabase Storage bucket `medical-reports` and linked in the `reports` table.

---

## 5. Database Architecture & Migrations

All tables are defined with Row Level Security (RLS) enabled. Migrations are organized chronologically in `supabase/migrations/`:

### 1. `public.profiles` (`20261019_auth_rbac_privacy.sql`, `20261020_two_role_system.sql`)
- Stores user accounts and authorization roles (`user` or `admin`).
- Handled automatically via signup triggers on `auth.users`.

### 2. `public.predictions` (`20261019_auth_rbac_privacy.sql`)
- Stores prediction results (`prediction`, `code`, `confidence`, `image_url`, `user_id`).

### 3. `public.reports` (`20261019_auth_rbac_privacy.sql`)
- Stores generated PDF metadata (`report_number`, `prediction_id`, `pdf_storage_path`, `user_id`).

### 4. `public.skin_condition_guides` (`20261021_skin_condition_guides.sql`)
- Stores dynamic educational content.
- **RLS Policies**:
  - `SELECT`: Public and authenticated users can view published records (`review_status = 'published'`). Admins can view all records.
  - `INSERT/UPDATE/DELETE`: Restricted strictly to administrators via `public.is_admin(auth.uid())`.

---

## 6. API Endpoints Reference

### General
- `GET /`: Service heartbeat.
- `GET /health`: Comprehensive health check (Database, Storage, Model status).

### Prediction
- `POST /predict`: Upload image (`multipart/form-data`) and execute 3-stage classification pipeline.
  - Requires: Bearer token (Supabase JWT).
  - Returns: `PredictionResponse` containing classification, confidence, warnings, and report metadata.

### Educational Guides
- `GET /guides`: Returns all published educational guides.
- `GET /guides/{class_key}`: Returns the educational guide for the specified model code or canonical key. Returns 404 for unknown classes.

### Reports
- `GET /reports/{report_id}/download`: Download report PDF by report ID.
- `GET /reports/prediction/{prediction_id}/download`: Download report PDF associated with a prediction ID.

### History
- `GET /history`: Retrieve user's screening history.
- `DELETE /history/{id}`: Delete a prediction record and its associated private scan from storage.

### Admin
- `GET /admin/users`: List registered accounts and classification activity.
- `POST /admin/users/{id}/role`: Update a user's role (`user` vs `admin`).
- `GET /admin/stats`: System-wide screening analytics and diagnostic class breakdown.
- `GET /admin/audit-logs`: Audit log inspection.

---

## 7. Authentication & Role-Based Access Control (RBAC)

- Handled in `api/auth.py`.
- Authenticates requests by verifying Supabase JWTs via **JWKS** (JSON Web Key Set) using public keys from Supabase Auth (`/.well-known/jwks.json`).
- Role determination: Queries `public.profiles` for `role` (`user` or `admin`).
- Functions requiring admin access use FastAPI dependencies to enforce authorization.

---

## 8. Testing & Verification

A dedicated unit test suite in `test_educational_guides.py` verifies the educational guides system:

```powershell
python -m unittest test_educational_guides.py
```

### Verified Test Cases:
1. `test_all_seven_classes_present_in_baseline`: Verifies all 7 classes have complete medical fields.
2. `test_class_info_model_mapping`: Verifies that short codes and names in `CLASS_INFO` map accurately to stable keys.
3. `test_api_endpoint_retrieval_all_classes`: Verifies `GET /guides/{class_key}` returns HTTP 200 with proper payloads.
4. `test_api_endpoint_list_guides`: Verifies `GET /guides` returns all published guides.
5. `test_unknown_class_safe_handling`: Verifies invalid inputs return HTTP 404 without falsifying or crashing.
6. `test_pdf_report_separation`: Verifies `report_service.py` signature does not accept or process educational guide objects.

---

## 9. Local Development Setup

### 1. Environment Configuration
Create a `.env` file in `backend/` from `.env.example`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key
VITE_API_URL=http://localhost:8000
```

### 2. Execution
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn api.main:app --port 8000
```
