-- ==============================================================================
-- DERMO-AI: Authentication, Role-Based Access Control, Patient Privacy & Auditing
-- Migration: 20261019_auth_rbac_privacy.sql
-- ==============================================================================

-- 1. PROFILES TABLE (Stores roles and user profile info linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for role querying
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- Automatically runs when a user authenticates via Google OAuth or email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
        'patient' -- Every new account receives patient role by default
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. PREDICTIONS TABLE SCHEMA UPDATES (Ownership & Private Storage Object Path)
CREATE TABLE IF NOT EXISTS public.predictions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    filename TEXT NOT NULL,
    image_url TEXT NOT NULL,
    prediction TEXT NOT NULL,
    code TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS image_storage_path TEXT;

CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON public.predictions(created_at DESC);


-- 4. REPORTS TABLE SCHEMA UPDATES
CREATE TABLE IF NOT EXISTS public.reports (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_number TEXT NOT NULL UNIQUE,
    prediction_id BIGINT REFERENCES public.predictions(id) ON DELETE CASCADE,
    pdf_storage_path TEXT NOT NULL,
    model_version TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_prediction_id ON public.reports(prediction_id);


-- 5. PATIENT-DOCTOR ACCESS RELATIONSHIP TABLE
CREATE TABLE IF NOT EXISTS public.patient_doctor_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ NULL,
    notes TEXT,
    CONSTRAINT chk_patient_doctor_diff CHECK (patient_id != doctor_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_doctor_patient ON public.patient_doctor_access(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_doctor_doctor ON public.patient_doctor_access(doctor_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_access ON public.patient_doctor_access(patient_id, doctor_id) WHERE revoked_at IS NULL;


-- 6. AUDIT LOGS TABLE (Tamper-evident system activity)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);


-- 7. HELPER SECURITY FUNCTIONS (SECURITY DEFINER with fixed search_path)
CREATE OR REPLACE FUNCTION public.is_admin(user_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_uid AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_doctor(user_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_uid AND role = 'doctor'
    );
$$;

CREATE OR REPLACE FUNCTION public.has_doctor_access(p_patient_id UUID, p_doctor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.patient_doctor_access
        WHERE patient_id = p_patient_id
          AND doctor_id = p_doctor_id
          AND revoked_at IS NULL
    );
$$;


-- 8. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_doctor_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 8A. PROFILES POLICIES
DROP POLICY IF EXISTS "Profiles read access" ON public.profiles;
CREATE POLICY "Profiles read access" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() OR
        public.is_admin(auth.uid()) OR
        -- Patients can see approved doctors to grant consent
        role = 'doctor' OR
        -- Doctors can see profiles of patients who granted them active access
        (public.is_doctor(auth.uid()) AND public.has_doctor_access(id, auth.uid()))
    );

DROP POLICY IF EXISTS "Profiles update own details" ON public.profiles;
CREATE POLICY "Profiles update own details" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin(auth.uid()))
    WITH CHECK (
        -- Regular users cannot escalate their role
        (id = auth.uid() AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
        OR public.is_admin(auth.uid())
    );

-- 8B. PREDICTIONS POLICIES
DROP POLICY IF EXISTS "Predictions viewable by owner or authorized doctor" ON public.predictions;
CREATE POLICY "Predictions viewable by owner or authorized doctor" ON public.predictions
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        (public.is_doctor(auth.uid()) AND public.has_doctor_access(user_id, auth.uid())) OR
        public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Predictions insertable by authenticated user" ON public.predictions;
CREATE POLICY "Predictions insertable by authenticated user" ON public.predictions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Predictions deletable by owner" ON public.predictions;
CREATE POLICY "Predictions deletable by owner" ON public.predictions
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- 8C. REPORTS POLICIES
DROP POLICY IF EXISTS "Reports viewable by owner or authorized doctor" ON public.reports;
CREATE POLICY "Reports viewable by owner or authorized doctor" ON public.reports
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        (public.is_doctor(auth.uid()) AND public.has_doctor_access(user_id, auth.uid())) OR
        public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Reports insertable by owner" ON public.reports;
CREATE POLICY "Reports insertable by owner" ON public.reports
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Reports deletable by owner" ON public.reports;
CREATE POLICY "Reports deletable by owner" ON public.reports
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- 8D. PATIENT-DOCTOR ACCESS POLICIES
DROP POLICY IF EXISTS "Access grants viewable by participants" ON public.patient_doctor_access;
CREATE POLICY "Access grants viewable by participants" ON public.patient_doctor_access
    FOR SELECT TO authenticated
    USING (
        patient_id = auth.uid() OR
        doctor_id = auth.uid() OR
        public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Patients can grant doctor access" ON public.patient_doctor_access;
CREATE POLICY "Patients can grant doctor access" ON public.patient_doctor_access
    FOR INSERT TO authenticated
    WITH CHECK (
        patient_id = auth.uid() AND
        public.is_doctor(doctor_id)
    );

DROP POLICY IF EXISTS "Patients can revoke access" ON public.patient_doctor_access;
CREATE POLICY "Patients can revoke access" ON public.patient_doctor_access
    FOR UPDATE TO authenticated
    USING (patient_id = auth.uid())
    WITH CHECK (patient_id = auth.uid());

-- 8E. AUDIT LOGS POLICIES
DROP POLICY IF EXISTS "Audit logs viewable by admin only" ON public.audit_logs;
CREATE POLICY "Audit logs viewable by admin only" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Audit logs insertable" ON public.audit_logs;
CREATE POLICY "Audit logs insertable" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- ==============================================================================
-- End of Migration
-- ==============================================================================
