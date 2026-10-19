# Skin Disease Classification using a Hybrid CNN–Transformer Model

This repository contains the implementation of a **Skin Disease Classification** system using deep learning. The project explores the performance of a baseline **EfficientNet-B0 CNN** model and a proposed **Hybrid CNN–Transformer** architecture.

## Repository Structure

```
main
├── MP_1
├── MP_2
│   └── Trained_Model
└── MP_2_H
    └── Hybrid_Model
```

## Branch Details

### `main`
- Contains the initial project files and earlier implementation.
- Retained for reference purposes only.
- No use of it.

### `MP_1`
- EfficientNet-B0 (CNN) with **Frozen Feature Extraction**.
- Only the classifier layers were trained.
- **Test Accuracy:** **63%**

### `MP_2`
- EfficientNet-B0 (CNN) with **Full Fine-Tuning** (all layers unfrozen).
- Represents the improved CNN baseline.
- **Test Accuracy:** **73%**

### `MP_2_H`
- Proposed **Hybrid CNN–Transformer** architecture.
- Combines EfficientNet-B0 (the same `MP_2` code)for local feature extraction with a Transformer Encoder (code) for global feature learning.
- **Test Accuracy:** **79%**

### `Trained_Model`
- Contains the trained weights (`.pth`) for the EfficientNet-B0 `MP_2` model.
- **Model Accuracy:** **73%**

### `Hybrid_Model`
- Contains the trained weights (`.pth`) for the Hybrid CNN–Transformer `MP_2_H` model.
- **Model Accuracy:** **79**

---

## Model Performance

| Model  |                Architecture                 | Test Accuracy |
|--------|---------------------------------------------|--------------:|
| MP_1   | EfficientNet-B0 (Frozen Feature Extraction) | 63%           |
| MP_2   | EfficientNet-B0 (Full Fine-Tuning)          | 73%           |
| MP_2_H | Hybrid CNN–Transformer                      | **79%**       |

---

## Project Highlights

- Skin Disease Classification using the HAM10000 dataset
- Transfer Learning with EfficientNet-B0
- Full Fine-Tuning for improved performance
- Hybrid CNN–Transformer architecture
- Class-weighted Cross Entropy Loss
- AdamW Optimizer
- Learning Rate Scheduling
- Comprehensive model evaluation using:
  - Classification Report
  - Confusion Matrix
  - ROC Curve
  - Precision–Recall Curve
  - Misclassified Image Analysis

---

## Trained Models

The repository includes the trained model weights for:

- EfficientNet-B0 (Full Fine-Tuning)
- Hybrid CNN–Transformer

These models can be directly loaded for inference or deployment without retraining.

--

The project also includes a **Stage 1 Skin/Non-Skin Image Classifier** that acts as an input validation layer before the main disease classification model.

---

## 📌 Project Overview

Skin diseases can exhibit visually similar characteristics, making accurate classification challenging.

This project aims to develop an automated image-based skin disease classification system using deep learning.

The system follows a two-stage prediction pipeline:

```text
                Input Image
                     │
                     ▼
        ┌─────────────────────────┐
        │       Stage 1           │
        │ Skin / Non-Skin         │
        │    Classifier           │
        └────────────┬────────────┘
                     │
             ┌───────┴────────┐
             │                │
          Non-Skin           Skin
             │                │
             ▼                ▼
        Reject Image     ┌───────────────┐
                         │    Stage 2    │
                         │ Hybrid CNN +  │
                         │  Transformer  │
                         └───────┬───────┘
                                 │
                                 ▼
                       Skin Disease Class
                                 │
                                 ▼
                       Confidence Score
                                 │
                                 ▼
                         Supabase Storage
                         + Prediction DB

The final project status is present in "Major_Project_2"

🚧 Current Project Status
Completed
 Skin disease classification project architecture
 Dataset preparation
 Hybrid CNN–Transformer model development
 Stage 3 disease classification model
 Stage 1 skin/non-skin classifier
 Stage 1 MobileNetV2 training
 Stage 1 evaluation
 Stage 2 skin and lesion skin classifier
 FastAPI backend
 Image upload API
 Image validation
 Two-stage prediction pipeline
 Pydantic prediction response schema
 Supabase integration
 Image storage
 Prediction storage
 React + Vite frontend
 Frontend-backend API communication
 Docker containerization
 Google Artifact Registry setup
 Google Cloud Run deployment
 Google Secret Manager integration
 Vercel frontend deployment
 Local FastAPI testing
 Production API deployment

---

## 🌐 Deploying to GitHub & Vercel

### Step 1: Push Project to GitHub
```bash
git init
git add .
git commit -m "Initial commit - DermoAI Full Stack"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dermoAI.git
git push -u origin main
```

### Step 2: Deploy Backend (Render / Railway)
1. Go to [render.com](https://render.com) → **New Web Service** → Connect `dermoAI` repo.
2. Root Directory: `backend` | Build Command: `pip install -r requirements.txt` | Start Command: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
3. Copy your live backend URL (e.g. `https://dermoai-backend.onrender.com`).

### Step 3: Deploy Frontend to Vercel
1. Go to [vercel.com](https://vercel.com) → **New Project** → Import `dermoAI` repo.
2. Select Root Directory: `frontend` (or leave root with preset `Vite`).
3. Add Environment Variable:
   - `VITE_API_URL` = `https://dermoai-backend.onrender.com`
4. Click **Deploy**!
