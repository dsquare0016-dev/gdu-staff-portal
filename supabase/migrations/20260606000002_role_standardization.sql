-- ============================================================
-- ROLE STANDARDIZATION: ta -> technical_assistant
-- ============================================================

-- 1. Update roles table
UPDATE public.roles SET slug = 'technical_assistant', name = 'Technical Assistant' WHERE slug = 'ta';

-- 2. Update profiles table
UPDATE public.profiles SET role = 'technical_assistant' WHERE role = 'ta';

-- 3. Update staff_records table
UPDATE public.staff_records SET role = 'technical_assistant' WHERE role = 'ta';

-- 4. Update RLS policies for monthly_allowance_requests
DROP POLICY IF EXISTS "Privileged roles view all allowance requests" ON public.monthly_allowance_requests;
CREATE POLICY "Privileged roles view all allowance requests" ON public.monthly_allowance_requests
    FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('accounts', 'admin', 'dg', 'technical_assistant', 'ict', 'super_admin'));

-- 5. Update RLS for other tables if necessary
-- (Searching for other 'ta' occurrences in schema)
-- Check announcements
DROP POLICY IF EXISTS "Admin can manage announcements" ON public.announcements;
CREATE POLICY "Admin can manage announcements" ON public.announcements
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin', 'technical_assistant')
  );

-- Check monthly_allowance_settings
DROP POLICY IF EXISTS "Accountant manage allowance settings" ON public.monthly_allowance_settings;
CREATE POLICY "Accountant manage allowance settings" ON public.monthly_allowance_settings
    FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('accounts', 'super_admin', 'technical_assistant'));

-- 6. Update role_permissions helper if exists
-- Assuming is_admin_or_above() might need update if it explicitly listed roles
-- But usually it checks for a list. Let's check functions.

CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('admin', 'super_admin', 'technical_assistant', 'ict', 'dg')
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
