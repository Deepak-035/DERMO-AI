-- DERMO-AI Database Schema (Two-Role RBAC: user & admin)
-- Run this script in the Supabase SQL Editor

-- 1. Profiles & Roles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    last_sign_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to create profile when auth.users row is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role, last_sign_in_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
        'user',
        NOW()
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

-- 2. Sign-in Events Tracking Table
CREATE TABLE IF NOT EXISTS public.user_sign_ins (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sign_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_sign_ins_user_id ON public.user_sign_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sign_ins_created ON public.user_sign_ins(sign_in_at DESC);

-- 3. Predictions Table
CREATE TABLE IF NOT EXISTS public.predictions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    filename TEXT NOT NULL,
    image_url TEXT NOT NULL,
    image_storage_path TEXT,
    prediction TEXT NOT NULL,
    code TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON public.predictions(created_at DESC);

-- 4. Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_number TEXT NOT NULL UNIQUE,
    prediction_id BIGINT REFERENCES public.predictions(id) ON DELETE CASCADE,
    pdf_storage_path TEXT NOT NULL,
    model_version TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);

-- 5. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Helper Security Functions
CREATE OR REPLACE FUNCTION public.is_admin(user_uid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public, auth STABLE AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_uid AND role = 'admin');
$$;

-- 7. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sign_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. Policies
-- Profiles
DROP POLICY IF EXISTS "Profiles read access" ON public.profiles;
CREATE POLICY "Profiles read access" ON public.profiles FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Profiles update own details" ON public.profiles;
CREATE POLICY "Profiles update own details" ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin(auth.uid()))
    WITH CHECK ((id = auth.uid() AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())) OR public.is_admin(auth.uid()));

-- Predictions
DROP POLICY IF EXISTS "Predictions read policy" ON public.predictions;
CREATE POLICY "Predictions read policy" ON public.predictions FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Predictions insertable by owner" ON public.predictions;
CREATE POLICY "Predictions insertable by owner" ON public.predictions FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Predictions deletable by owner" ON public.predictions;
CREATE POLICY "Predictions deletable by owner" ON public.predictions FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Reports
DROP POLICY IF EXISTS "Reports read policy" ON public.reports;
CREATE POLICY "Reports read policy" ON public.reports FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Reports insertable by owner" ON public.reports;
CREATE POLICY "Reports insertable by owner" ON public.reports FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Reports deletable by owner" ON public.reports;
CREATE POLICY "Reports deletable by owner" ON public.reports FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- User Sign-Ins
DROP POLICY IF EXISTS "User sign ins read policy" ON public.user_sign_ins;
CREATE POLICY "User sign ins read policy" ON public.user_sign_ins FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "User sign ins insert policy" ON public.user_sign_ins;
CREATE POLICY "User sign ins insert policy" ON public.user_sign_ins FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Audit Logs
DROP POLICY IF EXISTS "Audit logs viewable by admin only" ON public.audit_logs;
CREATE POLICY "Audit logs viewable by admin only" ON public.audit_logs FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Audit logs insertable" ON public.audit_logs;
CREATE POLICY "Audit logs insertable" ON public.audit_logs FOR INSERT TO authenticated
    WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- 7. Skin Condition Educational Guides
CREATE TABLE IF NOT EXISTS public.skin_condition_guides (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    class_key TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    overview TEXT NOT NULL,
    risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    warning_signs JSONB NOT NULL DEFAULT '[]'::jsonb,
    prevention JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    treatment_overview TEXT NOT NULL,
    urgency_level TEXT NOT NULL CHECK (urgency_level IN ('routine', 'prompt', 'urgent')),
    sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'reviewed', 'published')),
    reviewed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skin_condition_guides_class_key ON public.skin_condition_guides(class_key);
CREATE INDEX IF NOT EXISTS idx_skin_condition_guides_status ON public.skin_condition_guides(review_status);

ALTER TABLE public.skin_condition_guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guides read access authenticated" ON public.skin_condition_guides;
CREATE POLICY "Guides read access authenticated" ON public.skin_condition_guides
    FOR SELECT TO authenticated
    USING (review_status = 'published' OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Guides read access anon" ON public.skin_condition_guides;
CREATE POLICY "Guides read access anon" ON public.skin_condition_guides
    FOR SELECT TO anon
    USING (review_status = 'published');

DROP POLICY IF EXISTS "Guides insertable by admin only" ON public.skin_condition_guides;
CREATE POLICY "Guides insertable by admin only" ON public.skin_condition_guides
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Guides updatable by admin only" ON public.skin_condition_guides;
CREATE POLICY "Guides updatable by admin only" ON public.skin_condition_guides
    FOR UPDATE TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Guides deletable by admin only" ON public.skin_condition_guides;
CREATE POLICY "Guides deletable by admin only" ON public.skin_condition_guides
    FOR DELETE TO authenticated
    USING (public.is_admin(auth.uid()));

