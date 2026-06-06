-- ============================================================
-- FIX: Remove recursive RLS policy on profiles table
-- Issue: The "Super Admins can view all profiles" policy added
--        in fix_profiles_rls.sql used EXISTS (SELECT 1 FROM profiles...)
--        which caused infinite recursion, making all authenticated
--        profile queries time out.
-- Fix: Use the SECURITY DEFINER function is_super_admin() instead.
-- ============================================================

-- Drop the problematic recursive policy (from fix_profiles_rls.sql)
DROP POLICY IF EXISTS "Super Admins can view all profiles" ON public.profiles;

-- Drop the duplicated "Users can view own profile" from fix_profiles_rls.sql
-- (the original from create_schema.sql is fine)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Recreate "Users can view own profile" cleanly
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Recreate "Super admin can view all profiles" using SECURITY DEFINER function
-- (avoids infinite recursion because the function bypasses RLS)
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
CREATE POLICY "Super admin can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_super_admin());

-- Super admin can update/insert profiles too
DROP POLICY IF EXISTS "Super admin can manage all profiles" ON public.profiles;
CREATE POLICY "Super admin can manage all profiles" ON public.profiles
  FOR ALL USING (public.is_super_admin());

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
