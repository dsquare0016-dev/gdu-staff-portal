-- GDU Staff Management & Intelligence Portal - Complete Database Schema
-- Execute this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Departments
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Staff Records
CREATE TABLE IF NOT EXISTS public.staff_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'staff', -- super_admin, admin, ict, accounts, dg, ta, staff
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

-- 7. Branding Settings
CREATE TABLE IF NOT EXISTS public.branding_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    portal_name TEXT DEFAULT 'GDU Staff Portal',
    logo_url TEXT, -- Primary GDU Logo
    logo_url_2 TEXT, -- State Seal
    logo_url_3 TEXT, -- Additional Seal
    primary_color TEXT DEFAULT '#1e3a8a',
    secondary_color TEXT DEFAULT '#b45309',
    hero_title TEXT DEFAULT 'GDU Staff Portal',
    hero_subtitle TEXT DEFAULT 'Government Delivery Unit',
    hero_tagline TEXT DEFAULT 'Excellence in Service',
    footer_text TEXT DEFAULT '© 2026 Government Delivery Unit',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- Seed Branding
INSERT INTO public.branding_settings (id, portal_name) 
VALUES (1, 'GDU Staff Portal') 
ON CONFLICT (id) DO NOTHING;

-- RLS POLICIES
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- Simple Authenticated Access (Refine for production)
CREATE POLICY "Public read branding" ON public.branding_settings FOR SELECT USING (true);
CREATE POLICY "Auth read departments" ON public.departments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read staff" ON public.staff_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read attendance" ON public.attendance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read announcements" ON public.announcements FOR SELECT USING (auth.role() = 'authenticated');

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
