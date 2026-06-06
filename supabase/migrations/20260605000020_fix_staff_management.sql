-- =============================================================================
-- GDU STAFF PORTAL — STAFF MANAGEMENT COMPLETE FIX
-- Migration: 20260605000020_fix_staff_management.sql
-- Adds all missing columns, fixes RLS, creates storage bucket, reloads schema
-- =============================================================================

-- ============================================================
-- SECTION 1: ADD ALL MISSING COLUMNS TO staff_records
-- All columns use ADD COLUMN IF NOT EXISTS (safe to re-run)
-- ============================================================

-- Human-readable staff ID (e.g., GDU001)
ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS readable_id TEXT;

-- Employment details
ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS employment_date DATE;

ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS retirement_date DATE;

ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS adhoc_expiry DATE;

ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Role / grade
ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'staff';

ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS grade_level INTEGER;

ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS step INTEGER;

ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS position TEXT;

-- Personal info
ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '';

ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';

ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS gender TEXT;

ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS qualification TEXT;

ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS passport_url TEXT;

-- Department link
ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Auth user link
ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Next of kin
ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS next_of_kin_name TEXT;

ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS next_of_kin_phone TEXT;

ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS next_of_kin_rel TEXT;

-- Timestamps
ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.staff_records
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ============================================================
-- SECTION 2: UNIQUE CONSTRAINT ON readable_id
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'staff_records_readable_id_key'
      AND conrelid = 'public.staff_records'::regclass
  ) THEN
    ALTER TABLE public.staff_records
      ADD CONSTRAINT staff_records_readable_id_key UNIQUE (readable_id);
  END IF;
END $$;

-- ============================================================
-- SECTION 3: BACKFILL readable_id FOR EXISTING RECORDS
-- ============================================================

DO $$
DECLARE
  rec RECORD;
  counter INT := 1;
BEGIN
  FOR rec IN
    SELECT id FROM public.staff_records
    WHERE readable_id IS NULL OR readable_id = ''
    ORDER BY created_at ASC NULLS LAST
  LOOP
    UPDATE public.staff_records
    SET readable_id = 'GDU' || LPAD(counter::TEXT, 3, '0')
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- ============================================================
-- SECTION 4: UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS staff_records_updated_at ON public.staff_records;
CREATE TRIGGER staff_records_updated_at
  BEFORE UPDATE ON public.staff_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- SECTION 5: ROW LEVEL SECURITY FOR staff_records
-- ============================================================

ALTER TABLE public.staff_records ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated users can read staff records" ON public.staff_records;
DROP POLICY IF EXISTS "Staff can read all records" ON public.staff_records;
DROP POLICY IF EXISTS "Admins can manage staff records" ON public.staff_records;
DROP POLICY IF EXISTS "Users can manage their own staff record" ON public.staff_records;
DROP POLICY IF EXISTS "Staff management policy" ON public.staff_records;
DROP POLICY IF EXISTS "Super admin can manage staff" ON public.staff_records;
DROP POLICY IF EXISTS "Public read staff" ON public.staff_records;

-- All authenticated users can SELECT staff records
CREATE POLICY "Authenticated users can read staff records"
  ON public.staff_records FOR SELECT
  TO authenticated
  USING (true);

-- Admins, super_admin, ict, hr can INSERT/UPDATE/DELETE
CREATE POLICY "Admins can manage staff records"
  ON public.staff_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin', 'ict')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin', 'ict')
    )
  );

-- Staff can see their own record
CREATE POLICY "Staff can view own record"
  ON public.staff_records FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- SECTION 6: ROW LEVEL SECURITY FOR profiles
-- Simple non-recursive policies to prevent infinite loop
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated to read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow own profile update" ON public.profiles;
DROP POLICY IF EXISTS "Profile select policy" ON public.profiles;
DROP POLICY IF EXISTS "Profile update policy" ON public.profiles;

-- Any authenticated user can read all profiles
CREATE POLICY "Allow authenticated to read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update only their own profile
CREATE POLICY "Allow own profile update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow authenticated insert (for new users)
CREATE POLICY "Allow profile insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================
-- SECTION 7: STORAGE BUCKET (staff-passports)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staff-passports',
  'staff-passports',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

-- Drop old storage policies
DROP POLICY IF EXISTS "Staff passports are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload staff passports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update staff passports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete staff passports" ON storage.objects;

-- Storage RLS policies
CREATE POLICY "Staff passports are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'staff-passports');

CREATE POLICY "Authenticated users can upload staff passports"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'staff-passports');

CREATE POLICY "Authenticated users can update staff passports"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'staff-passports');

CREATE POLICY "Authenticated users can delete staff passports"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'staff-passports');

-- ============================================================
-- SECTION 8: RELOAD SCHEMA CACHE
-- ============================================================

NOTIFY pgrst, 'reload schema';
