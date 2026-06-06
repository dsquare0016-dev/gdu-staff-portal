-- =============================================================================
-- GDU STAFF PORTAL — FINAL SYSTEM AUDIT & SCHEMA REPAIR
-- Migration: 20260606000000_audit_and_fix.sql
-- =============================================================================

-- 1. Ensure all requested columns exist in staff_records
ALTER TABLE public.staff_records 
  ADD COLUMN IF NOT EXISTS is_eligible BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS adhoc_expiry DATE,
  ADD COLUMN IF NOT EXISTS retirement_date DATE,
  ADD COLUMN IF NOT EXISTS readable_id TEXT;

-- 2. Create missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_readable_id ON public.staff_records(readable_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON public.attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_monthly_allowance_requests_staff_id ON public.monthly_allowance_requests(staff_id);

-- 3. Ensure foreign keys exist (Repairing broken relationships)
DO $$
BEGIN
  -- monthly_allowance_requests -> staff_records
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_monthly_allowance_requests_staff'
  ) THEN
    ALTER TABLE public.monthly_allowance_requests
      ADD CONSTRAINT fk_monthly_allowance_requests_staff
      FOREIGN KEY (staff_id) REFERENCES public.staff_records(id)
      ON DELETE CASCADE;
  END IF;

  -- staff_records -> departments
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'staff_records_department_id_fkey'
  ) THEN
    ALTER TABLE public.staff_records
      ADD CONSTRAINT staff_records_department_id_fkey
      FOREIGN KEY (department_id) REFERENCES public.departments(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
