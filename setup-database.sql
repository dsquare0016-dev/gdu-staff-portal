-- GDU Staff Management & Intelligence Portal - Complete Database Schema
-- Execute this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Departments
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    description TEXT,
    head_of_department_id UUID,
    status TEXT DEFAULT 'active',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Staff Records
CREATE TABLE IF NOT EXISTS public.staff_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    readable_id TEXT UNIQUE, -- GDU001, GDU002, etc.
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'staff', -- super_admin, admin, ict, accounts, dg, ta, staff, adhoc
    department_id UUID REFERENCES public.departments(id),
    position TEXT,
    grade_level INTEGER,
    step INTEGER,
    passport_url TEXT,
    status TEXT DEFAULT 'active', -- active, inactive, suspended, retired
    gender TEXT,
    date_of_birth DATE,
    qualification TEXT,
    employment_date DATE DEFAULT CURRENT_DATE,
    retirement_date DATE,
    adhoc_expiry DATE,
    address TEXT,
    next_of_kin_name TEXT,
    next_of_kin_phone TEXT,
    next_of_kin_rel TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Attendance
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES public.staff_records(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'absent', -- present, absent, late, leave
    method TEXT DEFAULT 'manual', -- manual, qr, facial
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES public.staff_records(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES public.staff_records(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, date)
);

-- 4. Messages (Chat)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES public.staff_records(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.staff_records(id) ON DELETE CASCADE,
    group_id TEXT,
    content TEXT,
    attachment_url TEXT,
    attachment_type TEXT, -- image, video, file
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES public.staff_records(id),
    is_pinned BOOLEAN DEFAULT false,
    target_department_id UUID REFERENCES public.departments(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Payroll
CREATE TABLE IF NOT EXISTS public.payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES public.staff_records(id) ON DELETE CASCADE NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    base_salary DECIMAL(15, 2) NOT NULL DEFAULT 0,
    allowances DECIMAL(15, 2) DEFAULT 0,
    deductions DECIMAL(15, 2) DEFAULT 0,
    net_pay DECIMAL(15, 2) GENERATED ALWAYS AS (base_salary + allowances - deductions) STORED,
    status TEXT DEFAULT 'pending', -- pending, processed, paid
    processed_by UUID REFERENCES public.staff_records(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, month, year)
);

-- 7. Portal Branding Settings
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

-- 8. Organogram
CREATE TABLE IF NOT EXISTS public.organogram (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES public.staff_records(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    staff_name TEXT,
    department_name TEXT,
    role TEXT,
    parent_id TEXT,
    position JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Branding
INSERT INTO public.portal_branding_settings (id) 
VALUES (1) 
ON CONFLICT (id) DO NOTHING;

-- RLS POLICIES
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organogram ENABLE ROW LEVEL SECURITY;

-- Simple Authenticated Access (Refine for production)
CREATE POLICY "Public read branding" ON public.portal_branding_settings FOR SELECT USING (true);
CREATE POLICY "Auth read departments" ON public.departments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read staff" ON public.staff_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read attendance" ON public.attendance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read announcements" ON public.announcements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read organogram" ON public.organogram FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "SuperAdmin manage organogram" ON public.organogram FOR ALL USING (auth.role() = 'authenticated');

-- Chat Policies
CREATE POLICY "View own messages" ON public.messages FOR SELECT 
USING (sender_id IN (SELECT id FROM public.staff_records WHERE user_id = auth.uid()) 
    OR receiver_id IN (SELECT id FROM public.staff_records WHERE user_id = auth.uid()));

CREATE POLICY "Send messages" ON public.messages FOR INSERT 
WITH CHECK (sender_id IN (SELECT id FROM public.staff_records WHERE user_id = auth.uid()));

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.organogram;

-- ============================================================
-- 13. MONTHLY ALLOWANCE SYSTEM
-- ============================================================

-- Roles & Permissions
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
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

-- Monthly Allowance Settings
CREATE TABLE IF NOT EXISTS public.monthly_allowance_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month INTEGER NOT NULL, -- 1-12
    year INTEGER NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    minimum_attendance_percentage INTEGER DEFAULT 80,
    status TEXT DEFAULT 'active',
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(month, year)
);

-- Allowance Eligibility
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

-- Monthly Allowance Requests
CREATE TABLE IF NOT EXISTS public.monthly_allowance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.staff_records(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id),
    role_id UUID REFERENCES public.roles(id),
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    attendance_percentage INTEGER NOT NULL,
    allowance_amount DECIMAL(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Processing' CHECK (status IN ('Not Requested', 'Processing', 'Approved', 'Paid', 'Rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, month, year)
);

-- Seed Initial Roles
INSERT INTO public.roles (name, description) VALUES 
('Super Admin', 'Full system access'),
('Admin', 'Manage staff and departments'),
('Accountant', 'Manage payroll and allowances'),
('ICT', 'Technical settings and branding'),
('DG', 'Director General - oversight summaries'),
('TA', 'Technical Assistant - oversight summaries'),
('Staff', 'General staff access')
ON CONFLICT (name) DO NOTHING;

-- RLS for Monthly Allowance
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_allowance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_allowance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_allowance_eligible_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_allowance_eligible_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read roles" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Public read permissions" ON public.permissions FOR SELECT USING (true);
CREATE POLICY "Everyone can view allowance settings" ON public.monthly_allowance_settings
    FOR SELECT USING (true);
CREATE POLICY "Auth read eligibility" ON public.monthly_allowance_eligible_roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read eligibility dept" ON public.monthly_allowance_eligible_departments FOR SELECT USING (auth.role() = 'authenticated');

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_allowance_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_allowance_requests;
