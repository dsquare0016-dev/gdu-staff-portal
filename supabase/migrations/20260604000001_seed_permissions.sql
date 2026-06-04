-- Seed Permissions
INSERT INTO public.permissions (name, description, module) VALUES 
('staff:view', 'View staff records', 'staff'),
('staff:create', 'Create new staff records', 'staff'),
('staff:edit', 'Edit staff records', 'staff'),
('staff:delete', 'Delete staff records', 'staff'),
('attendance:view', 'View attendance records', 'attendance'),
('attendance:mark', 'Mark attendance', 'attendance'),
('attendance:approve', 'Approve attendance', 'attendance'),
('payroll:view', 'View payroll records', 'payroll'),
('payroll:manage', 'Manage payroll and settings', 'payroll'),
('allowance:request', 'Request monthly allowance', 'allowance'),
('allowance:manage', 'Manage allowance settings and requests', 'allowance'),
('branding:manage', 'Manage portal branding', 'branding'),
('departments:manage', 'Manage organizational departments', 'departments'),
('roles:manage', 'Manage system roles and permissions', 'roles')
ON CONFLICT (name) DO NOTHING;

-- Assign all permissions to Super Admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'Super Admin'
ON CONFLICT DO NOTHING;

-- Assign Accountant permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'Accountant' 
AND p.name IN ('payroll:view', 'payroll:manage', 'allowance:manage', 'staff:view')
ON CONFLICT DO NOTHING;

-- Assign ICT permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'ICT' 
AND p.name IN ('branding:manage', 'roles:manage', 'staff:view', 'staff:edit')
ON CONFLICT DO NOTHING;
