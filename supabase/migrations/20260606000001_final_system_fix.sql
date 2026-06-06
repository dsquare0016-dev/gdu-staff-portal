-- GDU Staff Portal - Final System Fixes Migration
-- Date: 2026-06-06

-- 1. Update user_role enum and rename 'ta' to 'technical_assistant'
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'technical_assistant';

-- Update existing records
UPDATE public.profiles SET role = 'technical_assistant' WHERE role = 'ta';
UPDATE public.staff_records SET role = 'technical_assistant' WHERE role = 'ta';

-- Update roles table slug if it exists
UPDATE public.roles SET slug = 'technical_assistant' WHERE slug = 'ta';
UPDATE public.roles SET name = 'Technical Assistant' WHERE slug = 'technical_assistant';

-- 2. Fix Chat RLS Policies
-- chat_groups
DROP POLICY IF EXISTS "Members can view their groups" ON public.chat_groups;
CREATE POLICY "Users can view groups they belong to" ON public.chat_groups
  FOR SELECT USING (
    id IN (SELECT group_id FROM public.chat_group_members WHERE user_id = auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('super_admin', 'dg', 'technical_assistant', 'ict')
  );

CREATE POLICY "Users can create groups" ON public.chat_groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update groups" ON public.chat_groups
  FOR UPDATE USING (created_by = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('super_admin', 'ict'));

-- chat_group_members
DROP POLICY IF EXISTS "Anyone can view group membership" ON public.chat_group_members;
CREATE POLICY "Users can view memberships of their groups" ON public.chat_group_members
  FOR SELECT USING (
    group_id IN (SELECT id FROM public.chat_groups) -- Simplified for now to avoid recursion
  );

CREATE POLICY "Users can join/add members" ON public.chat_group_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- messages
DROP POLICY IF EXISTS "Members can view group messages" ON public.messages;
CREATE POLICY "Users can view messages in their groups" ON public.messages
  FOR SELECT USING (
    group_id IN (SELECT group_id FROM public.chat_group_members WHERE user_id = auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('super_admin', 'dg', 'technical_assistant')
  );

DROP POLICY IF EXISTS "Members can send messages" ON public.messages;
CREATE POLICY "Users can send messages to their groups" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    group_id IN (SELECT group_id FROM public.chat_group_members WHERE user_id = auth.uid())
  );

-- 3. Monthly Allowance Eligibility Update
ALTER TABLE public.monthly_allowance_settings ADD COLUMN IF NOT EXISTS eligible_roles user_role[] DEFAULT '{}';
ALTER TABLE public.monthly_allowance_settings ADD COLUMN IF NOT EXISTS eligible_departments UUID[] DEFAULT '{}';
ALTER TABLE public.monthly_allowance_settings ADD COLUMN IF NOT EXISTS attendance_threshold INTEGER DEFAULT 80;

-- Update allowance requests RLS to include technical_assistant
DROP POLICY IF EXISTS "Privileged roles view all allowance requests" ON public.monthly_allowance_requests;
CREATE POLICY "Privileged roles view all allowance requests" ON public.monthly_allowance_requests
    FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('accounts', 'admin', 'dg', 'technical_assistant', 'ict', 'super_admin'));

-- 4. General Oversight Permissions for DG and Technical Assistant
-- Update profiles policy
DROP POLICY IF EXISTS "Admin and above can view profiles" ON public.profiles;
CREATE POLICY "Privileged roles can view profiles" ON public.profiles
  FOR SELECT USING (role IN ('admin', 'super_admin', 'dg', 'technical_assistant', 'ict'));

-- Update attendance policy
DROP POLICY IF EXISTS "DG and TA can view attendance" ON public.attendance;
CREATE POLICY "Oversight roles can view attendance" ON public.attendance
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('dg', 'technical_assistant', 'super_admin', 'admin')
  );

-- Update staff_records policy
DROP POLICY IF EXISTS "DG and TA can view all staff" ON public.staff_records;
CREATE POLICY "Oversight roles can view staff" ON public.staff_records
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('dg', 'technical_assistant', 'super_admin', 'admin')
  );

-- Update payroll policy
DROP POLICY IF EXISTS "Accounts and above can view all payroll" ON public.payroll;
CREATE POLICY "Privileged roles can view payroll" ON public.payroll
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('accounts', 'admin', 'super_admin', 'dg', 'technical_assistant')
  );

-- 5. Documents RLS Fix
DROP POLICY IF EXISTS "Super admin can view all documents" ON public.documents;
CREATE POLICY "Oversight roles can view all documents" ON public.documents
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('super_admin', 'dg', 'technical_assistant', 'admin', 'ict')
  );

-- 6. Ensure communication permissions
-- (Assuming there's a permissions table as seen in schema)
-- We'll insert permissions if they don't exist
INSERT INTO public.permissions (name, module, action, description)
VALUES 
('view_communication', 'communication', 'view', 'Can view chats and messages'),
('create_communication', 'communication', 'create', 'Can start new chats'),
('manage_communication', 'communication', 'manage', 'Can manage all communication')
ON CONFLICT (name) DO NOTHING;

-- Grant permissions to roles
DO $$
DECLARE
  comm_view_id UUID;
  comm_create_id UUID;
  comm_manage_id UUID;
  role_rec RECORD;
BEGIN
  SELECT id INTO comm_view_id FROM public.permissions WHERE name = 'view_communication';
  SELECT id INTO comm_create_id FROM public.permissions WHERE name = 'create_communication';
  SELECT id INTO comm_manage_id FROM public.permissions WHERE name = 'manage_communication';

  -- Grant view and create to all active roles
  FOR role_rec IN SELECT id FROM public.roles WHERE slug IN ('staff', 'accounts', 'admin', 'dg', 'technical_assistant', 'ict', 'super_admin', 'adhoc') LOOP
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES (role_rec.id, comm_view_id), (role_rec.id, comm_create_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Grant manage to super_admin, ict, technical_assistant
  FOR role_rec IN SELECT id FROM public.roles WHERE slug IN ('super_admin', 'ict', 'technical_assistant') LOOP
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES (role_rec.id, comm_manage_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
