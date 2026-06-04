-- 1. Roles & Permissions
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    status TEXT DEFAULT 'active', -- active, inactive
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    module TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- 2. Update Departments
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS head_of_department_id UUID; -- references staff_records(id) later
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS updated_by UUID;

-- 3. Monthly Allowance System Updates
ALTER TABLE public.monthly_allowance_settings ADD COLUMN IF NOT EXISTS minimum_attendance_percentage INTEGER DEFAULT 80;
ALTER TABLE public.monthly_allowance_settings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.monthly_allowance_settings ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.monthly_allowance_settings ADD COLUMN IF NOT EXISTS updated_by UUID;

CREATE TABLE IF NOT EXISTS public.monthly_allowance_eligible_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    allowance_setting_id UUID REFERENCES public.monthly_allowance_settings(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(allowance_setting_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.monthly_allowance_eligible_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    allowance_setting_id UUID REFERENCES public.monthly_allowance_settings(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(allowance_setting_id, department_id)
);

ALTER TABLE public.monthly_allowance_requests ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id);
ALTER TABLE public.monthly_allowance_requests ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id);

-- 4. Portal Branding Settings
CREATE TABLE IF NOT EXISTS public.portal_branding_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    portal_name TEXT DEFAULT 'GDU Staff Portal',
    logo_url TEXT,
    favicon_url TEXT,
    login_background_url TEXT,
    primary_color TEXT DEFAULT '#1e3a8a',
    secondary_color TEXT DEFAULT '#b45309',
    login_title TEXT DEFAULT 'Welcome Back',
    login_subtitle TEXT DEFAULT 'Sign in to access your dashboard',
    footer_text TEXT DEFAULT '© 2026 Government Delivery Unit',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial branding if not exists
INSERT INTO public.portal_branding_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 5. Seed Initial Roles
INSERT INTO public.roles (name, slug, description) VALUES 
('Super Admin', 'super_admin', 'Full system access'),
('Admin', 'admin', 'Manage staff and departments'),
('Accountant', 'accounts', 'Manage payroll and allowances'),
('ICT', 'ict', 'Technical settings and branding'),
('DG', 'dg', 'Director General - oversight summaries'),
('TA', 'ta', 'Technical Assistant - oversight summaries'),
('Staff', 'staff', 'General staff access')
ON CONFLICT (slug) DO NOTHING;

-- RLS for new tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_allowance_eligible_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_allowance_eligible_departments ENABLE ROW LEVEL SECURITY;

-- Simple Authenticated Access
CREATE POLICY "Public read roles" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Public read permissions" ON public.permissions FOR SELECT USING (true);
CREATE POLICY "Public read branding" ON public.portal_branding_settings FOR SELECT USING (true);
CREATE POLICY "Auth read eligibility" ON public.monthly_allowance_eligible_roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read eligibility dept" ON public.monthly_allowance_eligible_departments FOR SELECT USING (auth.role() = 'authenticated');
