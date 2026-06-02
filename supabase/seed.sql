-- ============================================================
-- GDU Portal — Seed Data
-- ============================================================

-- Enable pgcrypto for password hashing if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert default branding settings (one row)
INSERT INTO public.branding_settings (
  portal_name, primary_color, secondary_color,
  footer_text, hero_title, hero_subtitle, hero_tagline
) VALUES (
  'GDU Staff Management Portal',
  'oklch(0.24 0.09 263)',
  'oklch(0.78 0.13 82)',
  '© 2025 Kogi State Government. All rights reserved.',
  'GOVERNMENT DELIVERY UNIT (GDU)',
  'KOGI STATE GOVERNMENT',
  '…Confluence of Opportunities'
) ON CONFLICT DO NOTHING;

-- Insert default login page settings
INSERT INTO public.login_page_settings (title, subtitle) VALUES (
  'Sign in to the GDU Admin Page',
  'Access and manage the Government Delivery Unit administration system.'
) ON CONFLICT DO NOTHING;

-- Insert roles
INSERT INTO public.roles (name, slug, description) VALUES
  ('Staff', 'staff', 'Regular government staff member'),
  ('Accounts Officer', 'accounts', 'Manages payroll and financial records'),
  ('Administrator', 'admin', 'Manages staff records and operations'),
  ('Director General', 'dg', 'Executive head, read-only access to all records'),
  ('Technical Assistant', 'ta', 'Technical advisor, read-only with report generation'),
  ('ICT / IT Manager', 'ict', 'Manages technical support and helpdesk'),
  ('Super Admin', 'super_admin', 'Full system access')
ON CONFLICT (slug) DO NOTHING;

-- Insert document categories
INSERT INTO public.document_categories (name, description) VALUES
  ('Appointment Letter', 'Official appointment and employment letters'),
  ('Academic Certificate', 'Educational qualifications and certificates'),
  ('Identification', 'Government issued IDs and NIN documents'),
  ('Payslip', 'Monthly payslips and salary records'),
  ('Leave Document', 'Leave approval letters and records'),
  ('Medical Record', 'Medical certificates and health documents'),
  ('Performance Report', 'Staff performance evaluation reports'),
  ('Other', 'Miscellaneous documents')
ON CONFLICT (name) DO NOTHING;

-- Insert departments
INSERT INTO public.departments (name, code, description) VALUES
  ('Office of the Director General', 'ODG', 'Executive management office'),
  ('Human Resources', 'HR', 'Staff management and welfare'),
  ('Finance & Accounts', 'FIN', 'Financial operations and payroll'),
  ('Information & Communication Technology', 'ICT', 'Technology and systems management'),
  ('Planning, Research & Statistics', 'PRS', 'Strategic planning and data analysis'),
  ('Procurement & Logistics', 'PL', 'Procurement and asset management'),
  ('Legal & Compliance', 'LC', 'Legal affairs and regulatory compliance'),
  ('Administration', 'ADM', 'General administration and operations')
ON CONFLICT (name) DO NOTHING;

-- Insert default system settings
INSERT INTO public.system_settings (key, value, type, label, description) VALUES
  ('attendance_start_time', '08:00', 'string', 'Work Start Time', 'Official work start time (HH:MM)'),
  ('attendance_end_time', '17:00', 'string', 'Work End Time', 'Official work end time (HH:MM)'),
  ('late_threshold_minutes', '30', 'number', 'Late Threshold (mins)', 'Minutes after start time before marking late'),
  ('ai_enabled', 'true', 'boolean', 'Enable AI Assistant', 'Toggle the AI assistant feature'),
  ('openai_model', 'gpt-4o-mini', 'string', 'OpenAI Model', 'AI model to use for assistant'),
  ('max_leave_days_annual', '30', 'number', 'Annual Leave Days', 'Maximum annual leave days per year'),
  ('portal_timezone', 'Africa/Lagos', 'string', 'Portal Timezone', 'Default timezone for the portal'),
  ('session_timeout_mins', '480', 'number', 'Session Timeout (mins)', 'Idle session timeout duration'),
  ('enable_chat', 'true', 'boolean', 'Enable Chat', 'Toggle the internal chat system'),
  ('maintenance_mode', 'false', 'boolean', 'Maintenance Mode', 'Put the portal in maintenance mode')
ON CONFLICT (key) DO NOTHING;

-- Insert base permissions
INSERT INTO public.permissions (name, module, action, description) VALUES
  -- Staff module
  ('view_staff', 'staff', 'view', 'View staff records'),
  ('create_staff', 'staff', 'create', 'Create new staff records'),
  ('edit_staff', 'staff', 'edit', 'Edit staff records'),
  ('delete_staff', 'staff', 'delete', 'Delete staff records'),
  -- Attendance
  ('view_attendance', 'attendance', 'view', 'View attendance records'),
  ('manage_attendance', 'attendance', 'edit', 'Edit and manage attendance'),
  -- Payroll
  ('view_payroll', 'payroll', 'view', 'View payroll records'),
  ('manage_payroll', 'payroll', 'edit', 'Manage payroll and allowances'),
  -- Departments
  ('view_departments', 'departments', 'view', 'View departments'),
  ('manage_departments', 'departments', 'edit', 'Manage departments'),
  -- Documents
  ('view_documents', 'documents', 'view', 'View documents'),
  ('upload_documents', 'documents', 'create', 'Upload documents'),
  ('manage_documents', 'documents', 'edit', 'Approve/reject/delete documents'),
  -- Tickets
  ('view_tickets', 'tickets', 'view', 'View support tickets'),
  ('manage_tickets', 'tickets', 'edit', 'Manage and reply to tickets'),
  -- Reports
  ('view_reports', 'reports', 'view', 'View reports'),
  ('generate_reports', 'reports', 'create', 'Generate reports'),
  -- Settings
  ('view_settings', 'settings', 'view', 'View system settings'),
  ('manage_settings', 'settings', 'edit', 'Manage system settings'),
  ('manage_branding', 'branding', 'edit', 'Manage branding settings'),
  -- Roles
  ('manage_roles', 'roles', 'edit', 'Manage roles and permissions'),
  -- Audit
  ('view_audit_logs', 'audit', 'view', 'View audit logs'),
  -- Notifications
  ('send_notifications', 'notifications', 'create', 'Send notifications'),
  -- Organogram
  ('manage_organogram', 'organogram', 'edit', 'Manage organogram')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- DEMO USERS (Auth and Profiles)
-- ============================================================

-- Function to create demo users safely
CREATE OR REPLACE FUNCTION create_demo_user(
  u_id UUID,
  u_email TEXT,
  u_password TEXT,
  u_name TEXT,
  u_role user_role
) RETURNS VOID AS $$
BEGIN
  -- Insert into auth.users (Supabase managed schema)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token)
  VALUES (
    u_id,
    u_email,
    crypt(u_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    format('{"full_name":"%s"}', u_name)::jsonb,
    now(),
    now(),
    'authenticated',
    ''
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert into public.profiles
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (u_id, u_email, u_name, u_role)
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create Super Admin
SELECT create_demo_user(
  '00000000-0000-0000-0000-000000000001',
  'superadmin@gdu.gov.ng',
  'superadmin123',
  'Super Administrator',
  'super_admin'
);

-- Create Administrator
SELECT create_demo_user(
  '00000000-0000-0000-0000-000000000002',
  'admin@gdu.gov.ng',
  'admin123',
  'System Administrator',
  'admin'
);

-- Create Accounts Officer
SELECT create_demo_user(
  '00000000-0000-0000-0000-000000000003',
  'accounts@gdu.gov.ng',
  'accounts123',
  'Finance Officer',
  'accounts'
);

-- Create DG
SELECT create_demo_user(
  '00000000-0000-0000-0000-000000000004',
  'dg@gdu.gov.ng',
  'dg123',
  'Director General',
  'dg'
);

-- Create TA
SELECT create_demo_user(
  '00000000-0000-0000-0000-000000000005',
  'ta@gdu.gov.ng',
  'ta123',
  'Technical Assistant',
  'ta'
);

-- Create ICT Support
SELECT create_demo_user(
  '00000000-0000-0000-0000-000000000006',
  'ict@gdu.gov.ng',
  'ict123',
  'ICT Support',
  'ict'
);

-- Create Regular Staff
SELECT create_demo_user(
  '00000000-0000-0000-0000-000000000007',
  'staff@gdu.gov.ng',
  'staff123',
  'Regular Staff Member',
  'staff'
);

-- ============================================================
-- DEMO STAFF RECORDS
-- ============================================================

INSERT INTO public.staff_records (id, user_id, full_name, email, role, department_id, position, grade_level, step, status)
VALUES 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 'System Administrator', 'admin@gdu.gov.ng', 'admin', (SELECT id FROM departments WHERE code = 'ADM'), 'Senior Admin Officer', 12, 5, 'active'),
  ('11111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000003', 'Finance Officer', 'accounts@gdu.gov.ng', 'accounts', (SELECT id FROM departments WHERE code = 'FIN'), 'Accountant I', 10, 3, 'active'),
  ('11111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000004', 'Director General', 'dg@gdu.gov.ng', 'dg', (SELECT id FROM departments WHERE code = 'ODG'), 'Director General', 17, 1, 'active'),
  ('11111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000007', 'Regular Staff Member', 'staff@gdu.gov.ng', 'staff', (SELECT id FROM departments WHERE code = 'PRS'), 'Research Assistant', 8, 2, 'active')
ON CONFLICT (id) DO NOTHING;
