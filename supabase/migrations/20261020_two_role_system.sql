-- ==============================================================================
-- DERMO-AI: Two-Role Authentication (User & Admin), Audit & Analytics Migration
-- Migration: 20261020_two_role_system.sql
-- ==============================================================================

-- 1. MIGRATE EXISTING PROFILES TO TWO-ROLE SYSTEM ('user', 'admin')
-- Ensure any legacy 'patient' or 'doctor' role is converted to 'user'
UPDATE public.profiles
SET role = 'user'
WHERE role IN ('patient', 'doctor') OR role IS NULL;

-- Ensure default role is 'user'
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';

-- Drop previous check constraint if present and apply strict two-role check
DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Add last_sign_in_at column to profiles for fast user-table lookups
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

-- 2. SIGN-IN EVENTS TRACKING TABLE (Discrete successful login events)
CREATE TABLE IF NOT EXISTS public.user_sign_ins (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sign_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_sign_ins_user_id ON public.user_sign_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sign_ins_created ON public.user_sign_ins(sign_in_at DESC);

-- 3. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- Every new registered user gets 'user' role by default.
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
        'user', -- Always default to 'user' role
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

-- 4. HELPER FUNCTION: is_admin
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

-- 5. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sign_ins ENABLE ROW LEVEL SECURITY;

-- 5A. PROFILES POLICIES
DROP POLICY IF EXISTS "Profiles read access" ON public.profiles;
CREATE POLICY "Profiles read access" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid() OR public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Profiles update own details" ON public.profiles;
CREATE POLICY "Profiles update own details" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin(auth.uid()))
    WITH CHECK (
        -- Regular users cannot escalate their role to admin
        (id = auth.uid() AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
        OR public.is_admin(auth.uid())
    );

-- 5B. PREDICTIONS POLICIES
DROP POLICY IF EXISTS "Predictions viewable by owner or authorized doctor" ON public.predictions;
DROP POLICY IF EXISTS "Predictions read policy" ON public.predictions;
CREATE POLICY "Predictions read policy" ON public.predictions
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Predictions insertable by authenticated user" ON public.predictions;
DROP POLICY IF EXISTS "Predictions insertable by owner" ON public.predictions;
CREATE POLICY "Predictions insertable by owner" ON public.predictions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Predictions deletable by owner" ON public.predictions;
CREATE POLICY "Predictions deletable by owner" ON public.predictions
    FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- 5C. REPORTS POLICIES
DROP POLICY IF EXISTS "Reports viewable by owner or authorized doctor" ON public.reports;
DROP POLICY IF EXISTS "Reports read policy" ON public.reports;
CREATE POLICY "Reports read policy" ON public.reports
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Reports insertable by owner" ON public.reports;
CREATE POLICY "Reports insertable by owner" ON public.reports
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Reports deletable by owner" ON public.reports;
CREATE POLICY "Reports deletable by owner" ON public.reports
    FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- 5D. USER SIGN-INS POLICIES
DROP POLICY IF EXISTS "User sign ins read policy" ON public.user_sign_ins;
CREATE POLICY "User sign ins read policy" ON public.user_sign_ins
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR public.is_admin(auth.uid())
    );

DROP POLICY IF EXISTS "User sign ins insert policy" ON public.user_sign_ins;
CREATE POLICY "User sign ins insert policy" ON public.user_sign_ins
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
    );

-- 6. AUDIT LOGS POLICIES
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit logs viewable by admin only" ON public.audit_logs;
CREATE POLICY "Audit logs viewable by admin only" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Audit logs insertable" ON public.audit_logs;
CREATE POLICY "Audit logs insertable" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- ==============================================================================
-- INITIAL ADMIN PROVISIONING INSTRUCTIONS:
-- Run this in Supabase SQL Editor once your admin user account signs up:
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'your-admin-email@example.com';
-- ==============================================================================
