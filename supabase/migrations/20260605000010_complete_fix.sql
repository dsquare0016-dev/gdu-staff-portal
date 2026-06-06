-- =============================================================================
-- COMPLETE FIX MIGRATION for GDU Staff Portal
-- Fixes: readable_id column, retirement_date, adhoc_expiry, storage bucket,
--        allowance relationship, schema cache, RLS policies
-- =============================================================================

-- ============================================================
-- 1. ADD MISSING COLUMNS TO staff_records
-- ============================================================

-- readable_id: human-readable staff ID like GDU001
ALTER TABLE staff_records 
  ADD COLUMN IF NOT EXISTS readable_id TEXT;

-- variable_id: human-readable staff ID alias
ALTER TABLE staff_records 
  ADD COLUMN IF NOT EXISTS variable_id TEXT;

-- retirement_date
ALTER TABLE staff_records 
  ADD COLUMN IF NOT EXISTS retirement_date DATE;

-- adhoc_expiry: expiry date for adhoc/contract staff
ALTER TABLE staff_records 
  ADD COLUMN IF NOT EXISTS adhoc_expiry DATE;

-- state, lga, next_of_kin fields (if missing)
ALTER TABLE staff_records 
  ADD COLUMN IF NOT EXISTS state TEXT;

ALTER TABLE staff_records 
  ADD COLUMN IF NOT EXISTS lga TEXT;

ALTER TABLE staff_records 
  ADD COLUMN IF NOT EXISTS next_of_kin_name TEXT;

ALTER TABLE staff_records 
  ADD COLUMN IF NOT EXISTS next_of_kin_phone TEXT;

ALTER TABLE staff_records 
  ADD COLUMN IF NOT EXISTS next_of_kin_rel TEXT;

ALTER TABLE staff_records 
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

ALTER TABLE staff_records 
  ADD COLUMN IF NOT EXISTS qualification TEXT;

ALTER TABLE staff_records 
  ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE staff_records 
  ADD COLUMN IF NOT EXISTS passport_url TEXT;

ALTER TABLE staff_records 
  ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE staff_records 
  ADD COLUMN IF NOT EXISTS rank TEXT;

-- ============================================================
-- 2. BACKFILL readable_id for existing staff (GDU001, GDU002…)
-- ============================================================

DO $$
DECLARE
  rec RECORD;
  counter INT := 1;
BEGIN
  FOR rec IN 
    SELECT id FROM staff_records 
    WHERE readable_id IS NULL OR readable_id = ''
    ORDER BY created_at ASC
  LOOP
    UPDATE staff_records 
    SET readable_id = 'GDU' || LPAD(counter::TEXT, 3, '0')
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Add unique constraint on readable_id (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'staff_records_readable_id_key'
  ) THEN
    ALTER TABLE staff_records ADD CONSTRAINT staff_records_readable_id_key UNIQUE (readable_id);
  END IF;
END $$;

-- ============================================================
-- 3. CREATE STORAGE BUCKET (staff-passports)
-- ============================================================

-- Insert the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staff-passports',
  'staff-passports',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE 
  SET public = true,
      file_size_limit = 5242880;

-- Storage RLS policies for staff-passports bucket
DROP POLICY IF EXISTS "Staff passports are publicly viewable" ON storage.objects;
CREATE POLICY "Staff passports are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'staff-passports');

DROP POLICY IF EXISTS "Authenticated users can upload staff passports" ON storage.objects;
CREATE POLICY "Authenticated users can upload staff passports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'staff-passports' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update staff passports" ON storage.objects;
CREATE POLICY "Authenticated users can update staff passports"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'staff-passports' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete staff passports" ON storage.objects;
CREATE POLICY "Authenticated users can delete staff passports"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'staff-passports' AND auth.role() = 'authenticated');

-- ============================================================
-- 4. FIX monthly_allowance_requests → staff_records RELATIONSHIP
-- ============================================================

-- Ensure staff_id in monthly_allowance_requests has a proper FK
-- First check if staff_records pk exists, then add constraint
DO $$
BEGIN
  -- Add FK if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'monthly_allowance_requests'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'staff_id'
  ) THEN
    -- Only add if staff_records table has an id column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'staff_records' AND column_name = 'id'
    ) THEN
      ALTER TABLE monthly_allowance_requests
        ADD CONSTRAINT fk_monthly_allowance_requests_staff
        FOREIGN KEY (staff_id) REFERENCES staff_records(id)
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ============================================================
-- 5. FIX RLS ON staff_records — Allow all authenticated users to read
-- ============================================================

-- Enable RLS if not already enabled
ALTER TABLE staff_records ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "Authenticated users can read staff records" ON staff_records;
DROP POLICY IF EXISTS "Staff can read all records" ON staff_records;
DROP POLICY IF EXISTS "Admins can manage staff records" ON staff_records;
DROP POLICY IF EXISTS "Users can manage their own staff record" ON staff_records;

-- Allow authenticated users to read all staff records
CREATE POLICY "Authenticated users can read staff records"
  ON staff_records FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow service role / admins (profiles with admin roles) to insert
CREATE POLICY "Admins can manage staff records"
  ON staff_records FOR ALL
  USING (
    auth.role() = 'service_role' OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('super_admin', 'admin', 'ict', 'hr')
    )
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('super_admin', 'admin', 'ict', 'hr')
    )
  );

-- Staff can read their own record
CREATE POLICY "Users can manage their own staff record"
  ON staff_records FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- 6. FIX RLS ON profiles — Prevent infinite recursion
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all old problematic policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated to read all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow own profile update" ON profiles;

-- Simple non-recursive policies
CREATE POLICY "Allow authenticated to read all profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow own profile update"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 7. FIX RLS on notifications
-- ============================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "Allow notification inserts" ON notifications;
DROP POLICY IF EXISTS "Users can delete their notifications" ON notifications;

CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Allow notification inserts"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 8. FIX RLS on monthly_allowance_requests
-- ============================================================

ALTER TABLE monthly_allowance_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view their own allowance requests" ON monthly_allowance_requests;
DROP POLICY IF EXISTS "Staff can insert their own allowance requests" ON monthly_allowance_requests;
DROP POLICY IF EXISTS "Admins can manage all allowance requests" ON monthly_allowance_requests;

CREATE POLICY "Staff can view their own allowance requests"
  ON monthly_allowance_requests FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      staff_id IN (SELECT id FROM staff_records WHERE user_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin','accounts','dg','ta','ict'))
    )
  );

CREATE POLICY "Staff can insert their own allowance requests"
  ON monthly_allowance_requests FOR INSERT
  WITH CHECK (
    staff_id IN (SELECT id FROM staff_records WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all allowance requests"
  ON monthly_allowance_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin','accounts','dg','ta','ict'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin','accounts','dg','ta','ict'))
  );

-- ============================================================
-- 9. RELOAD PostgREST SCHEMA CACHE
-- ============================================================
NOTIFY pgrst, 'reload schema';
