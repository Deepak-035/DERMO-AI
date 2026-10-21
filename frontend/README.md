# DERMO-AI Frontend — Architecture & Frontend-Backend Integration Guide

This guide details the design, architecture, and frontend-backend integration of the **DERMO-AI** client application.

DERMO-AI features a futuristic glassmorphic UI built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Framer Motion**, communicating with a **FastAPI** backend and **Supabase** authentication and database.

---

## 📖 Table of Contents
1. [Tech Stack](#1-tech-stack)
2. [Project Directory Structure](#2-project-directory-structure)
3. [Design System & UI Components](#3-design-system--ui-components)
4. [Step-by-Step Frontend-Backend Integration](#4-step-by-step-frontend-backend-integration)
   - [Step 1: Environment Variables](#step-1-environment-variables)
   - [Step 2: Authentication & RBAC (`AuthContext.tsx`, `ProtectedRoute.tsx`)](#step-2-authentication--rbac)
   - [Step 3: Centralized API Service (`src/services/api.ts`)](#step-3-centralized-api-service)
   - [Step 4: Image Analysis & Prediction (`Predict.tsx`)](#step-4-image-analysis--prediction)
   - [Step 5: Dynamic Skin Condition Educational Guide (`SkinConditionGuide.tsx`)](#step-5-dynamic-skin-condition-educational-guide)
   - [Step 6: Clinical Assessment PDF Report Download (`DownloadReportButton.tsx`)](#step-6-clinical-assessment-pdf-report-download)
   - [Step 7: Screening History & Management (`History.tsx`)](#step-7-screening-history--management)
   - [Step 8: Administrative Analytics Console (`AdminDashboard.tsx`)](#step-8-administrative-analytics-console)
5. [Class Mapping Architecture (`classMapping.ts`)](#5-class-mapping-architecture)
6. [Data Flow Diagrams](#6-data-flow-diagrams)
7. [Running & Building Locally](#7-running--building-locally)

---

## 1. Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) + CSS Glassmorphism
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router DOM v7](https://reactrouter.com/)
- **Backend Communication**: Fetch API with Bearer token authentication via Supabase JWT sessions.
- **Client SDK**: `@supabase/supabase-js` for authentication, session recovery, and RLS queries.

---

## 2. Project Directory Structure

```text
frontend/
├── .env.example               # Template environment configuration
├── index.html                 # HTML shell
├── package.json               # Dependencies and scripts
├── tailwind.config.js         # Tailwind theme & color extensions
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite build settings & @/ alias
│
└── src/
    ├── main.tsx               # Application entry point
    ├── App.tsx                # Client-side router with role-protected routes
    ├── index.css              # Global styles, backdrop blurs, and glassmorphism rules
    ├── App.css                # Layout styling
    │
    ├── context/
    │   └── AuthContext.tsx    # Supabase Auth provider, session caching, & role state
    │
    ├── lib/
    │   ├── supabase.ts        # Supabase JS client initialization
    │   └── utils.ts           # Utility functions (cn / clsx / twMerge)
    │
    ├── services/
    │   └── api.ts             # Centralized API service (prediction, reports, guides, admin)
    │
    ├── utils/
    │   └── classMapping.ts    # Model label & code to canonical class_key mapper
    │
    ├── components/
    │   ├── BackgroundVideo.tsx# Ambient dark video background overlay
    │   ├── DownloadReportButton.tsx # PDF download handler with blob generation
    │   ├── FloatingNav.tsx    # Responsive glassmorphic navigation bar
    │   ├── LevitatingCard.tsx # Framer Motion animated glass card
    │   ├── ProtectedRoute.tsx # Route guard enforcing authentication & allowed roles
    │   ├── SecondaryButton.tsx# Neon cyan action button component
    │   ├── SkinConditionGuide.tsx # Dynamic educational guide component
    │   └── ui/                # Core Radix-based UI widgets (progress, buttons, cards)
    │
    └── pages/
        ├── Login.tsx          # Authentication (Sign in, sign up, Google OAuth)
        ├── Dashboard.tsx      # User hub with live backend status & quick links
        ├── Predict.tsx        # Drag-and-drop screening & educational guide view
        ├── History.tsx        # Personal screening records with PDF download & delete
        ├── DoctorDashboard.tsx# Doctor review interface
        └── AdminDashboard.tsx # System metrics, user administration, & audit logs
```

---

## 3. Design System & UI Components

The interface employs a dark-mode, futuristic medical aesthetic:
- **Glassmorphic Panels**: Translucent dark surfaces (`bg-slate-900/80`, `backdrop-blur-xl`, `border-cyan-500/30`) with neon cyan, amber, and purple accents.
- **Floating Physics**: `LevitatingCard.tsx` uses Framer Motion spring physics to provide smooth interactive hover elevation.
- **Visual Feedback**: Real-time progress bars, pulsing urgency indicators, and distinct status alert badges (`Urgent`, `Prompt`, `Routine`).

---

## 4. Step-by-Step Frontend-Backend Integration

### Step 1: Environment Variables
Create a `.env` file in the `frontend/` directory (modeled after `.env.example`):
```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 2: Authentication & RBAC
- Managed in `src/context/AuthContext.tsx`.
- Listens to `supabase.auth.onAuthStateChange`.
- Fetches the verified user profile and role (`user` or `admin`) from `public.profiles`.
- Routes in `App.tsx` are wrapped with `<ProtectedRoute allowedRoles={['user', 'admin']}>`.

### Step 3: Centralized API Service (`src/services/api.ts`)
- All requests flow through `authorizedFetch(path, options)`.
- Automatically retrieves active Supabase session tokens (`supabase.auth.getSession()`) and injects `Authorization: Bearer <token>`.

### Step 4: Image Analysis & Prediction (`Predict.tsx`)
1. User drops or selects an image (`PNG`, `JPG`, `JPEG` up to 5MB).
2. Image is displayed in a local preview using `URL.createObjectURL(file)`.
3. Clicking **Analyze Image** triggers `predictImage(file)` via `POST /predict`.
4. Upon receiving the result:
   - Displays the disease name, short code, and confidence progress bar.
   - Any image quality warnings (e.g. low resolution, blur) are rendered in a warning banner.
   - Displays `<DownloadReportButton />` if report generation succeeded.
   - Mounts the `<SkinConditionGuide />` component dynamically below the result card.

### Step 5: Dynamic Skin Condition Educational Guide (`SkinConditionGuide.tsx`)
- Props: `predictionLabel={result.label}` and `predictionCode={result.code}`.
- Normalizes model labels via `mapModelClassToKey()` from `classMapping.ts`.
- Fetches condition data via `getEducationalGuide(classKey)`.
- Renders 7 expandable accordion sections:
  1. **About this condition**: Pathological description and overview.
  2. **Causes and Risk Factors**: Medically supported risk factors (distinguished from individual causes).
  3. **Warning Signs & Changes to Watch**: ABCDE criteria and alert symptoms.
  4. **Precautions & Evidence-Based Prevention**: Sun safety and surveillance habits.
  5. **Recommended Next Steps**: Medical triage advice and clinical examination necessity.
  6. **Clinician-Directed Treatment Overview**: Non-prescriptive treatment modalities.
  7. **References & Medical Review Status**: Citations to AAD, NCI, NCCN, and DermNet NZ.
- Includes **Expand All** and **Collapse All** controls.
- Displays a mandatory **Medical Screening Disclaimer** banner.

### Step 6: Clinical Assessment PDF Report Download (`DownloadReportButton.tsx`)
- Downloads the clinical PDF report via `GET /reports/{id}/download`.
- Converts the binary response to an in-memory `Blob` and triggers browser file download.
- **Strict PDF Independence**: Educational guide content is completely isolated to the web interface and never alters the PDF report structure or download payload.

### Step 7: Screening History & Management (`History.tsx`)
- Fetches private records via `GET /history`.
- Users can re-download their assessment PDF reports or permanently delete records via `DELETE /history/{id}`.

### Step 8: Administrative Analytics Console (`AdminDashboard.tsx`)
- Accessible strictly to users with `role: 'admin'`.
- Displays real-time registration activity, classification metrics, diagnostic class breakdowns, and user role management.

---

## 5. Class Mapping Architecture (`classMapping.ts`)

Located in `src/utils/classMapping.ts`, the mapping utility bridges model-generated codes and labels to canonical backend `class_key` identifiers:

```typescript
export const MODEL_CLASS_TO_KEY: Record<string, string> = {
  nv: 'melanocytic_nevus',
  mel: 'melanoma',
  bkl: 'benign_keratosis',
  bcc: 'basal_cell_carcinoma',
  akiec: 'actinic_keratoses',
  vasc: 'vascular_lesion',
  df: 'dermatofibroma',
  'melanocytic nevus': 'melanocytic_nevus',
  'melanoma': 'melanoma',
  // ...other variations and synonyms
};
```

If an unknown class or non-lesion identifier (such as `normal_skin` or `non_skin`) is received, `mapModelClassToKey()` returns `null`, preventing the application from displaying an incorrect or substituted guide.

---

## 6. Data Flow Diagrams

### Prediction & Educational Guide Retrieval Flow

```text
User uploads image -> Predict.tsx
      │
      ▼
predictImage(file) -> POST /predict (FastAPI)
      │
      ▼
Inference Pipeline (Stage 1 -> Stage 2 -> Stage 3)
      │
      ▼
Returns: { success: true, result: { prediction: "Melanoma", code: "mel", confidence: 94.2 } }
      │
      ├─────────────────────────────────────────┐
      ▼                                         ▼
Render Diagnostic Card                 Mount <SkinConditionGuide />
• Label: "Melanoma (MEL)"              • Calls mapModelClassToKey("mel") -> "melanoma"
• Confidence Bar: 94.2%                 • Calls getEducationalGuide("melanoma")
• Download Report Button               • Queries GET /guides/melanoma (or Supabase RLS)
                                       • Renders interactive accordion with:
                                         - Urgent Review Badge
                                         - Medical Disclaimer
                                         - 7 Evidence-Based Sections
```

---

## 7. Running & Building Locally

### Install Dependencies:
```powershell
cd frontend
npm install
```

### Start Development Server:
```powershell
npm run dev
```
Open [http://localhost:5173](http://localhost:5173).

### Linting:
```powershell
npm run lint
```

### Production Build:
```powershell
npx vite build
```
Build output is generated into the `dist/` directory.
