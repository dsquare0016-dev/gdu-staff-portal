-- ============================================================
-- GDU Portal — Seed Data
-- ============================================================

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
