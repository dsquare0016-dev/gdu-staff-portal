-- Migration: Generate Logins for all roles
-- Description: Creates auth users, profiles, and staff records for testing and initial setup.

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper function to create users (adapted from seed.sql but more robust for migrations)
CREATE OR REPLACE FUNCTION public.create_system_user(
  u_email TEXT,
  u_password TEXT,
  u_name TEXT,
  u_role user_role,
  u_id UUID DEFAULT uuid_generate_v4()
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if user already exists in auth.users
  SELECT id INTO new_user_id FROM auth.users WHERE email = u_email;
  
  IF new_user_id IS NULL THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      id, 
      instance_id,
      email, 
      encrypted_password, 
      email_confirmed_at, 
      raw_app_meta_data, 
      raw_user_meta_data, 
      created_at, 
      updated_at, 
      role, 
      confirmation_token,
      aud,
      is_confirmed
    )
    VALUES (
      u_id,
      '00000000-0000-0000-0000-000000000000',
      u_email,
      crypt(u_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      format('{"full_name":"%s", "role":"%s"}', u_name, u_role)::jsonb,
      now(),
      now(),
      'authenticated',
      '',
      'authenticated',
      true
    ) RETURNING id INTO new_user_id;
  END IF;

  -- Profile creation is handled by the trigger 'on_auth_user_created' 
  -- in 20240101000000_create_schema.sql.
  -- But we'll ensure it's correct here just in case.
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (new_user_id, u_email, u_name, u_role, true)
  ON CONFLICT (id) DO UPDATE SET 
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

  -- Create Staff Record if it doesn't exist
  INSERT INTO public.staff_records (
    user_id, 
    full_name, 
    email, 
    role, 
    department_id, 
    position, 
    status,
    readable_id
  )
  VALUES (
    new_user_id, 
    u_name, 
    u_email, 
    u_role, 
    (SELECT id FROM public.departments WHERE code = 'ADM' LIMIT 1),
    'System Account',
    'active',
    'GDU-' || UPPER(u_role::text) || '-' || LPAD(floor(random()*1000)::text, 3, '0')
  )
  ON CONFLICT (email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    role = EXCLUDED.role;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate Logins for each role
DO $$
BEGIN
  -- Super Admin
  PERFORM public.create_system_user(
    'superadmin@portal.gdu.gov.ng',
    'GDUportal2026!',
    'Portal Super Admin',
    'super_admin'
  );

  -- Admin
  PERFORM public.create_system_user(
    'admin@portal.gdu.gov.ng',
    'GDUportal2026!',
    'Portal Admin',
    'admin'
  );

  -- Accountant
  PERFORM public.create_system_user(
    'accountant@portal.gdu.gov.ng',
    'GDUportal2026!',
    'Portal Accountant',
    'accounts'
  );

  -- DG
  PERFORM public.create_system_user(
    'dg@portal.gdu.gov.ng',
    'GDUportal2026!',
    'Director General',
    'dg'
  );

  -- TA
  PERFORM public.create_system_user(
    'ta@portal.gdu.gov.ng',
    'GDUportal2026!',
    'Technical Assistant',
    'ta'
  );

  -- ICT
  PERFORM public.create_system_user(
    'ict@portal.gdu.gov.ng',
    'GDUportal2026!',
    'ICT Manager',
    'ict'
  );

  -- Staff
  PERFORM public.create_system_user(
    'staff@portal.gdu.gov.ng',
    'GDUportal2026!',
    'Regular Staff',
    'staff'
  );

  -- Adhoc
  PERFORM public.create_system_user(
    'adhoc@portal.gdu.gov.ng',
    'GDUportal2026!',
    'Adhoc Staff',
    'adhoc'
  );
END $$;

-- Cleanup helper function (optional, keeping it for now)
-- DROP FUNCTION public.create_system_user(TEXT, TEXT, TEXT, user_role, UUID);
