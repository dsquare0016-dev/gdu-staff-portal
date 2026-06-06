-- ============================================================
-- GDU Staff Portal — Comprehensive Fix Migration
-- Fixes: schema cache, storage buckets, missing columns
-- ============================================================

-- 1. Create storage buckets (if they don't exist via SQL-accessible bucket table)
-- Note: Supabase storage buckets must be created through the API or dashboard.
-- This migration handles the table-level fixes only.

-- 2. Ensure monthly_allowance_requests has correct FK (already in schema)
-- The foreign key to staff_records already exists. 
-- The issue is in the Supabase schema cache — refresh it by running:
-- SELECT pg_notify('pgrst', 'reload schema');

-- 3. Fix system_settings table to support key/value style properly
-- Add a general settings row if not exists using JSONB approach
-- We'll add a check for common system_settings keys

-- Ensure system_settings has the keys used by the general settings page
INSERT INTO public.system_settings (key, value, type, label, description) VALUES
  ('org_name', 'Government Delivery Unit (GDU)', 'string', 'Organization Name', 'Full name of the organization'),
  ('org_code', 'GDU', 'string', 'Organization Code', 'Short code for the organization'),
  ('tagline', 'Confluence of Opportunities', 'string', 'Tagline', 'Organization tagline'),
  ('description', 'Kogi State Government Delivery Unit Staff Management Portal', 'string', 'System Description', 'Portal description'),
  ('maintenance_mode', 'false', 'boolean', 'Maintenance Mode', 'Temporarily disable portal access'),
  ('session_timeout', '30', 'number', 'Session Timeout', 'Auto-logout after period of inactivity (minutes)')
ON CONFLICT (key) DO NOTHING;

-- 4. Ensure login_page_settings has a row
INSERT INTO public.login_page_settings (id, title, subtitle, show_home_btn)
VALUES (gen_random_uuid(), 'GDU Staff Login Section', 'Access and manage the Government Delivery Unit administration system.', true)
ON CONFLICT DO NOTHING;

-- 5. Fix portal_branding_settings if it doesn't have login_page_settings fields
ALTER TABLE public.portal_branding_settings ADD COLUMN IF NOT EXISTS login_title TEXT DEFAULT 'GDU Staff Login Section';
ALTER TABLE public.portal_branding_settings ADD COLUMN IF NOT EXISTS login_subtitle TEXT DEFAULT 'Access and manage the Government Delivery Unit administration system.';
ALTER TABLE public.portal_branding_settings ADD COLUMN IF NOT EXISTS hero_title TEXT DEFAULT 'GOVERNMENT DELIVERY UNIT (GDU)';
ALTER TABLE public.portal_branding_settings ADD COLUMN IF NOT EXISTS hero_subtitle TEXT DEFAULT 'KOGI STATE GOVERNMENT';
ALTER TABLE public.portal_branding_settings ADD COLUMN IF NOT EXISTS hero_tagline TEXT DEFAULT '…Confluence of Opportunities';
ALTER TABLE public.portal_branding_settings ADD COLUMN IF NOT EXISTS logo_url_2 TEXT;
ALTER TABLE public.portal_branding_settings ADD COLUMN IF NOT EXISTS logo_url_3 TEXT;

-- Update initial branding with defaults if empty
UPDATE public.portal_branding_settings 
SET
  hero_title = COALESCE(hero_title, 'GOVERNMENT DELIVERY UNIT (GDU)'),
  hero_subtitle = COALESCE(hero_subtitle, 'KOGI STATE GOVERNMENT'),
  hero_tagline = COALESCE(hero_tagline, '…Confluence of Opportunities'),
  login_title = COALESCE(login_title, 'GDU Staff Login Section'),
  login_subtitle = COALESCE(login_subtitle, 'Access and manage the Government Delivery Unit administration system.')
WHERE id = 1;

-- 6. Force schema cache refresh
SELECT pg_notify('pgrst', 'reload schema');

-- 7. Add RLS policies for portal_branding_settings update 
-- (make sure super_admin can update)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'portal_branding_settings' 
    AND policyname = 'Super admin can manage branding settings'
  ) THEN
    CREATE POLICY "Super admin can manage branding settings" ON public.portal_branding_settings
      FOR ALL USING (public.is_super_admin());
  END IF;
END $$;

-- 8. Fix monthly_allowance_eligible_roles policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'monthly_allowance_eligible_roles' 
    AND policyname = 'Admin manage eligible roles'
  ) THEN
    CREATE POLICY "Admin manage eligible roles" ON public.monthly_allowance_eligible_roles
      FOR ALL USING (public.is_admin_or_above());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'monthly_allowance_eligible_departments' 
    AND policyname = 'Admin manage eligible departments'
  ) THEN
    CREATE POLICY "Admin manage eligible departments" ON public.monthly_allowance_eligible_departments
      FOR ALL USING (public.is_admin_or_above());
  END IF;
END $$;

-- 9. Ensure transactions table RLS is set
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' 
    AND policyname = 'Accounts can view transactions'
  ) THEN
    CREATE POLICY "Accounts can view transactions" ON public.transactions
      FOR SELECT USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('accounts', 'admin', 'super_admin', 'dg', 'ta')
      );
    CREATE POLICY "Accounts can manage transactions" ON public.transactions
      FOR ALL USING (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('accounts', 'super_admin')
      );
  END IF;
END $$;

-- Done
