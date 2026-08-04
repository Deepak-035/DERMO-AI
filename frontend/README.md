# DermoAI - Frontend Architecture & Frontend-Backend Integration Guide

This document provides a detailed, step-by-step breakdown of how the **DermoAI** frontend was designed, built, and connected to the FastAPI deep-learning backend for real-time skin disease classification.

---

## 📖 Table of Contents
1. [Overview & Tech Stack](#1-overview--tech-stack)
2. [Project Directory Structure](#2-project-directory-structure)
3. [Step-by-Step: How We Built the Frontend](#3-step-by-step-how-we-built-the-frontend)
4. [Step-by-Step: How We Connected Frontend & Backend](#4-step-by-step-how-we-connected-frontend--backend)
   - [Step 1: Environment Variable Setup](#step-1-environment-variable-setup)
   - [Step 2: Centralized API Service (`src/services/api.ts`)](#step-2-centralized-api-service-srcservicesapits)
   - [Step 3: Backend Health Monitoring on Dashboard](#step-3-backend-health-monitoring-on-dashboard)
   - [Step 4: Real-Time Image Upload & ML Prediction (`Predict.tsx`)](#step-4-real-time-image-upload--ml-prediction-predicttsx)
   - [Step 5: Dynamic History Fetching & Deletion (`History.tsx`)](#step-5-dynamic-history-fetching--deletion-historytsx)
5. [Data Flow Diagrams](#5-data-flow-diagrams)
6. [How to Run & Verify](#6-how-to-run--verify)

---

## 1. Overview & Tech Stack

### Frontend Stack:
- **Framework**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Vanilla CSS + [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) (floating card physics, page transitions)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router DOM v6](https://reactrouter.com/)

### Backend Stack:
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Machine Learning**: PyTorch (`HybridCNNTransformer` model - CNN features + Transformer attention)
- **Database & Storage**: Supabase PostgreSQL + Supabase Storage (with automatic local fallback to `uploads/` folder + `predictions_db.json`).

---

## 2. Project Directory Structure

```
frontend/
├── .env                       # Backend URL configuration (VITE_API_URL)
├── index.html                 # Main HTML template
├── package.json               # Dependencies and scripts
├── tailwind.config.js         # Tailwind theme & color definitions
├── src/
│   ├── main.tsx               # Entry point
│   ├── App.tsx                # Client-side router configuration & global logout button
│   ├── index.css              # Global styles, scrollbars, background video layers
│   │
│   ├── services/
│   │   └── api.ts             # Centralized API service layer (Connecting Frontend -> Backend)
│   │
│   ├── pages/
│   │   ├── Login.tsx          # Glassmorphism login & sign-up page
│   │   ├── Dashboard.tsx      # Landing page with system metrics & live backend health status
│   │   ├── Predict.tsx        # Drag-and-drop image analyzer page (POST /predict)
│   │   └── History.tsx        # History gallery page with delete functionality (GET & DELETE /history)
│   │
│   ├── components/
│   │   ├── FloatingNav.tsx    # Glassmorphic top navigation bar
│   │   ├── LevitatingCard.tsx # Animated glass container with hover effects
│   │   ├── BackgroundVideo.tsx# Background video overlay component
│   │   ├── SecondaryButton.tsx# Neon cyan action button
│   │   └── ui/
│   │       └── progress.tsx   # Confidence level indicator bar
```

---

## 3. Step-by-Step: How We Built the Frontend

### Step 1: Design System & Glassmorphism Aesthetic
- Created a dark-mode, futuristic medical UI using glassmorphism properties (`backdrop-filter: blur()`, semi-transparent black overlays, subtle white borders).
- Custom levitating animations were created in `LevitatingCard.tsx` using `framer-motion` to create floating physics for cards on the screen.

### Step 2: Component Architecture
- **`FloatingNav.tsx`**: A sticky top navigation bar allowing seamless navigation between **Home**, **Predict**, and **History**.
- **`BackgroundVideo.tsx`**: Renders a dark ambient video in the background with an overlay to ensure optimal content legibility.
- **`SecondaryButton.tsx`**: Reusable button component styled with hover animations and disabled states.

### Step 3: Page Layouts & Client-Side Routing
- Configured routes in `App.tsx` using `react-router-dom`:
  - `/` → `Login.tsx`
  - `/dashboard` → `Dashboard.tsx`
  - `/predict` → `Predict.tsx`
  - `/history` → `History.tsx`

---

## 4. Step-by-Step: How We Connected Frontend & Backend

Connecting a React frontend to a FastAPI backend requires a robust client-server architecture handling HTTP communication, multipart form-data uploads, JSON parsing, environment configuration, and error states. Here is how we did it:

### Step 1: Environment Variable Setup

We created a `.env` file in the root of the `frontend/` directory:

```env
VITE_API_URL=http://localhost:8000
```

This ensures the backend URL is centralized. In production, this can be pointed to any remote server domain without modifying source code.

---

### Step 2: Centralized API Service (`src/services/api.ts`)

Instead of writing `fetch()` calls directly inside UI components, we built a dedicated API service layer in `src/services/api.ts`.

#### A. Type-Safe Interfaces
We defined TypeScript interfaces matching the exact JSON payloads returned by FastAPI backend endpoints:

```typescript
export interface PredictionResult {
  prediction: string;  // e.g. "Melanocytic Nevus"
  code: string;        // e.g. "nv"
  confidence: number;  // e.g. 98.45
  image_url: string;   // e.g. "/uploads/uuid.png" or Supabase Cloud URL
}

export interface HistoryItem {
  id: number;
  filename: string;
  image_url: string;
  prediction: string;
  code: string;
  confidence: number;
  created_at: string;
}
```

#### B. Smart Image URL Formatting Helper
When backend runs in local/mock storage mode, `image_url` is a relative path (e.g., `/uploads/filename.png`). When running with Supabase Cloud, `image_url` is a full URL (`https://...supabase.co/...`).

We created `getImageUrl()` to dynamically format the URL for `<img src="..." />`:

```typescript
export function getImageUrl(path: string | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
    return path; // Already a full URL or blob preview
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`; // Prepends http://localhost:8000
}
```

#### C. API Communication Methods

1. **`checkHealth()`**: Checks backend status via `GET http://localhost:8000/health`.
2. **`predictImage(file: File)`**:
   - Constructs a native browser `FormData` object.
   - Appends `file` as binary multipart data (`formData.append('file', file)`).
   - Sends a `POST` request to `${API_BASE_URL}/predict`.
   - Returns the prediction result from the ML model.
3. **`getHistory(limit, offset)`**: Sends a `GET` request to `${API_BASE_URL}/history` to retrieve past screening records.
4. **`deleteHistory(id: number)`**: Sends a `DELETE` request to `${API_BASE_URL}/history/${id}` to delete a record and its saved image.

---

### Step 3: Backend Health Monitoring on Dashboard

In `Dashboard.tsx`, we added a live API connectivity badge:

```typescript
const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

useEffect(() => {
  checkHealth().then(setIsBackendHealthy);
}, []);
```

- If `isBackendHealthy === true` → Displays **"FastAPI Backend Online & Ready"** with a green checkmark.
- If `isBackendHealthy === false` → Displays **"Backend Disconnected (Run python backend)"** with an amber warning icon.

---

### Step 4: Real-Time Image Upload & ML Prediction (`Predict.tsx`)

In `Predict.tsx`, we connected the file upload UI to the FastAPI prediction engine:

1. **File Selection & Local Preview**:
   When an image is dropped or selected via `<input type="file" />`, a temporary client-side URL is generated with `URL.createObjectURL(selectedFile)` for instantaneous preview.

2. **Submitting to Backend**:
   When the user clicks **"Analyze Image"**, `handleAnalyze()` executes:

   ```typescript
   const handleAnalyze = async () => {
     if (!file) return;
     setIsAnalyzing(true);
     setError(null);

     try {
       const response = await predictImage(file);
       if (response.success && response.result) {
         setResult({
           label: response.result.prediction,
           confidence: response.result.confidence,
           code: response.result.code,
           imageUrl: getImageUrl(response.result.image_url) || preview!,
         });
       }
     } catch (err: any) {
       setError(err.message || 'Failed to connect to backend server.');
     } finally {
       setIsAnalyzing(false);
     }
   };
   ```

3. **Rendering the Result**:
   - **Loading State**: Displays an animated `Loader2` spinner with `"Analyzing with Hybrid CNN-Transformer..."`.
   - **Result State**: Displays the predicted disease name (e.g. `Melanoma`), confidence percentage progress bar, disease code badge (e.g., `MEL`), and the server image.
   - **Error Handling**: Displays a red alert banner if file size exceeds 5MB or backend is unreachable.

---

### Step 5: Dynamic History Fetching & Deletion (`History.tsx`)

In `History.tsx`, we replaced static mock arrays with live database interaction:

1. **Fetching History**:
   ```typescript
   useEffect(() => {
     const fetchHistoryData = async () => {
       setIsLoading(true);
       try {
         const items = await getHistory();
         setHistory(items);
       } catch (err: any) {
         setError(err.message);
       } finally {
         setIsLoading(false);
       }
     };
     fetchHistoryData();
   }, []);
   ```

2. **Deleting a Record**:
   ```typescript
   const handleDelete = async (id: number) => {
     if (!window.confirm('Delete this record?')) return;
     try {
       await deleteHistory(id);
       setHistory((prev) => prev.filter((item) => item.id !== id));
     } catch (err) {
       alert(`Error deleting record: ${err.message}`);
     }
   };
   ```

- Each history card displays the saved image via `getImageUrl(item.image_url)`, confidence percentage, disease code badge, formatted timestamp, and a trash icon button for deleting records.

---

## 5. Data Flow Diagrams

### Prediction Request Flow
```
[User Selects Image] 
        │
        ▼
[Predict.tsx] ──── (FormData with File) ────► [POST http://localhost:8000/predict]
                                                     │
                                                     ▼
                                            [FastAPI Backend]
                                                     │
                                                     ├── 1. PyTorch Hybrid CNN-Transformer
                                                     ├── 2. Save Image (Supabase / Local uploads/)
                                                     └── 3. Record in DB (Supabase / predictions_db.json)
                                                     │
[Predict.tsx] ◄─── (Prediction JSON Result) ─────────┘
        │
        ▼
[Renders Disease Name, Confidence Bar & Image]
```

### History Retrieval Flow
```
[User Opens /history] 
        │
        ▼
[History.tsx (useEffect)] ─── (GET) ───► [GET http://localhost:8000/history]
                                                 │
                                                 ▼
                                        [FastAPI Backend]
                                                 │
                                                 └── Reads from DB (Supabase / predictions_db.json)
                                                 │
[History.tsx] ◄─── (Array of Predictions) ───────┘
        │
        ▼
[Renders Responsive Grid of Saved Cards]
```

---

## 6. How to Run & Verify

### 1. Start the FastAPI Backend
Open a terminal in `backend/`:
```bash
# Activate virtual environment if configured
# source venv/bin/activate (Linux/Mac) or venv\Scripts\activate (Windows)

# Run FastAPI server on port 8000
uvicorn api.main:app --reload --port 8000
```
- Backend Swagger API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 2. Start the React Frontend
Open a terminal in `frontend/`:
```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
- Open browser at `http://localhost:5173`.

### 3. Verify Integration
1. Check the Dashboard page: Verify the green **"FastAPI Backend Online & Ready"** status badge.
2. Go to `/predict`: Drag and drop a skin lesion image (or use `backend/test_skin_lesion.png`) and click **"Analyze Image"**. Verify live prediction output.
3. Go to `/history`: Verify your new prediction appears in the history list, and try deleting a record using the trash button.
