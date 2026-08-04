# DermoAI - Automated Skin Disease Classification System

A next-generation automated skin disease classification web application powered by a **Hybrid CNN-Transformer** deep learning model (PyTorch), **FastAPI** backend, and a modern **React + Vite + TypeScript** glassmorphic frontend.

---

## 🚀 Key Features

- **Hybrid CNN-Transformer AI Model**: Combines spatial feature extraction (CNN) with global attention mechanisms (Transformer) to accurately classify skin lesions into 7 diagnostic categories:
  - Melanocytic Nevus (`nv`)
  - Melanoma (`mel`)
  - Benign Keratosis (`bkl`)
  - Basal Cell Carcinoma (`bcc`)
  - Actinic Keratoses (`akiec`)
  - Vascular Lesion (`vasc`)
  - Dermatofibroma (`df`)
- **Real-Time Screening Interface**: Drag-and-drop skin image upload with instant client preview, live progress indicator, confidence score bar, and disease class code badges.
- **Prediction History Management**: Automated storing of screening reports in Supabase Cloud or local fallback storage with delete capabilities.
- **Live Health Monitoring**: Real-time connection status check between React frontend and FastAPI backend.

---

## 📂 Repository Structure

```
dermoAI/
├── backend/                  # FastAPI Python backend & PyTorch inference model
│   ├── api/                  # Routers, schemas, services, and Supabase client
│   ├── trained_models/       # Trained hybrid model weights (hybrid_best.pth)
│   ├── uploads/              # Local storage folder for uploaded lesion images
│   ├── requirements.txt      # Python dependencies
│   └── Backend_README.md     # Detailed backend documentation
│
└── frontend/                 # React 18 + Vite + TypeScript + Tailwind CSS frontend
    ├── src/
    │   ├── services/api.ts   # Centralized API service layer connecting to FastAPI
    │   ├── pages/            # Login, Dashboard, Predict, and History pages
    │   └── components/       # Glassmorphism cards, buttons, nav, background video
    ├── .env                  # VITE_API_URL configuration
    └── README.md             # Detailed step-by-step frontend & API integration guide
```

---

## 📖 Detailed Guides

- [Frontend & Frontend-Backend Integration Step-by-Step Guide](file:///c:/Users/Deepak/Documents/dermoAI/frontend/README.md)
- [Backend Architecture & API Documentation](file:///c:/Users/Deepak/Documents/dermoAI/backend/Backend_README.md)

---

## ⚡ Quick Start

### 1. Start Backend Server
```bash
cd backend
# Install dependencies
pip install -r requirements.txt

# Launch FastAPI backend on http://localhost:8000
uvicorn api.main:app --reload --port 8000
```

### 2. Start Frontend Dev Server
```bash
cd frontend
# Install dependencies
npm install

# Launch Vite frontend on http://localhost:5173
npm run dev
```

Open your browser at `http://localhost:5173` to launch DermoAI!
