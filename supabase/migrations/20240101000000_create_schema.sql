-- ============================================================
-- GDU Staff Management Portal — Complete Database Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM (
  'staff', 'accounts', 'admin', 'dg', 'ta', 'ict', 'super_admin', 'adhoc'
);

CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'leave', 'holiday');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'escalated');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE document_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'cancelled');
CREATE TYPE notification_type AS ENUM (
  'attendance', 'payment', 'leave', 'ticket', 'announcement', 'chat', 'system'
);

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  role          user_role NOT NULL DEFAULT 'staff',
  avatar_url    TEXT,
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  code        TEXT UNIQUE,
  description TEXT,
  head_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_id   UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  slug        user_role NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.permissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  module      TEXT NOT NULL,
  action      TEXT NOT NULL, -- view, create, edit, delete
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. ROLE_PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id       UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

-- ============================================================
-- 6. STAFF_RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.staff_records (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  readable_id       TEXT UNIQUE, -- GDU001, GDU002, etc.
  full_name         TEXT NOT NULL,
  passport_url      TEXT,
  rank              TEXT,
  grade_level       INTEGER CHECK (grade_level BETWEEN 1 AND 17),
  step              INTEGER CHECK (step BETWEEN 1 AND 15),
  department_id     UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  position          TEXT,
  role              user_role NOT NULL DEFAULT 'staff',
  email             TEXT NOT NULL UNIQUE,
  phone             TEXT,
  username          TEXT UNIQUE,
  employment_date   DATE,
  qualification     TEXT,
  gender            TEXT CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth     DATE,
  state             TEXT,
  lga               TEXT,
  address           TEXT,
  next_of_kin_name  TEXT,
  next_of_kin_phone TEXT,
  next_of_kin_rel   TEXT,
  retirement_date   DATE,
  adhoc_expiry      DATE,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'retired')),
  created_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id      UUID NOT NULL REFERENCES public.staff_records(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  check_in      TIMESTAMPTZ,
  check_out     TIMESTAMPTZ,
  status        attendance_status NOT NULL DEFAULT 'present',
  late_minutes  INTEGER DEFAULT 0,
  note          TEXT,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at   TIMESTAMPTZ,
  approved      BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at   TIMESTAMPTZ,
  recorded_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

-- ============================================================
-- 8. LEAVE_REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id      UUID NOT NULL REFERENCES public.staff_records(id) ON DELETE CASCADE,
  leave_type    TEXT NOT NULL, -- annual, sick, maternity, etc.
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  days          INTEGER GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
  reason        TEXT,
  status        leave_status NOT NULL DEFAULT 'pending',
  approved_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at   TIMESTAMPTZ,
  rejection_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. PAYROLL
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payroll (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID NOT NULL REFERENCES public.staff_records(id) ON DELETE CASCADE,
  month           INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year            INTEGER NOT NULL,
  basic_salary    NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_salary    NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary      NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions      NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status  payment_status NOT NULL DEFAULT 'pending',
  payment_date    DATE,
  payment_ref     TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, month, year)
);

-- ============================================================
-- 10. ALLOWANCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.allowances (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID NOT NULL REFERENCES public.staff_records(id) ON DELETE CASCADE,
  allowance_type  TEXT NOT NULL, -- housing, transport, medical, etc.
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  month           INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year            INTEGER NOT NULL,
  payment_status  payment_status NOT NULL DEFAULT 'pending',
  payment_date    DATE,
  notes           TEXT,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. DOCUMENT_CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.document_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 12. DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id      UUID REFERENCES public.staff_records(id) ON DELETE SET NULL,
  uploaded_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES public.document_categories(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  file_url      TEXT NOT NULL,
  file_type     TEXT NOT NULL, -- pdf, docx, xlsx, jpg, png, etc.
  file_size     INTEGER, -- bytes
  status        document_status NOT NULL DEFAULT 'pending',
  reviewed_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 13. CHAT_GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL DEFAULT 'group' CHECK (type IN ('direct', 'group', 'department')),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_by    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 14. CHAT_GROUP_MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_group_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_admin    BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ============================================================
-- 15. MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id      UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content       TEXT,
  file_url      TEXT,
  file_type     TEXT,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 16. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type          notification_type NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  link          TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 20. TRANSACTIONS (Income & Expenditure)
-- ============================================================
CREATE TYPE public.transaction_type AS ENUM ('income', 'expenditure');

CREATE TABLE IF NOT EXISTS public.transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          transaction_type NOT NULL,
  source        TEXT NOT NULL,
  category      TEXT NOT NULL,
  amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  status        TEXT NOT NULL DEFAULT 'completed',
  recorded_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 21. BRANDING SETTINGS (Extended)
-- ============================================================
-- These might already exist, adding columns if they don't
ALTER TABLE public.branding_settings ADD COLUMN IF NOT EXISTS logo_url_2 TEXT;
ALTER TABLE public.branding_settings ADD COLUMN IF NOT EXISTS logo_url_3 TEXT;
ALTER TABLE public.branding_settings ADD COLUMN IF NOT EXISTS hero_tagline TEXT;

CREATE TABLE IF NOT EXISTS public.announcements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  audience      TEXT NOT NULL DEFAULT 'all', -- all, staff, admin, etc.
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  posted_by     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at    TIMESTAMPTZ,
  is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 18. ORGANOGRAM
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organogram (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id      UUID REFERENCES public.staff_records(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  subtitle      TEXT,
  parent_id     UUID REFERENCES public.organogram(id) ON DELETE SET NULL,
  level         INTEGER NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 19. SUPPORT_TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_no     TEXT NOT NULL UNIQUE,
  submitted_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category      TEXT NOT NULL, -- login, technical, account, etc.
  subject       TEXT NOT NULL,
  description   TEXT NOT NULL,
  priority      ticket_priority NOT NULL DEFAULT 'medium',
  status        ticket_status NOT NULL DEFAULT 'open',
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 20. TICKET_REPLIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 21. AUDIT_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL, -- create, update, delete, login, logout, etc.
  table_name  TEXT,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 22. AI_CHAT_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_chat_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prompt      TEXT NOT NULL,
  response    TEXT,
  tokens_used INTEGER,
  model       TEXT DEFAULT 'gpt-4o-mini',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 23. REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL, -- attendance, payroll, staff, etc.
  parameters    JSONB,
  generated_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url      TEXT,
  status        TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 24. SYSTEM_SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT NOT NULL UNIQUE,
  value       TEXT,
  type        TEXT NOT NULL DEFAULT 'string', -- string, boolean, json, number
  label       TEXT,
  description TEXT,
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 25. BRANDING_SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.branding_settings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portal_name         TEXT NOT NULL DEFAULT 'GDU Staff Portal',
  logo_url            TEXT,
  login_bg_url        TEXT,
  primary_color       TEXT DEFAULT '#1a3a5c',
  secondary_color     TEXT DEFAULT '#d4a017',
  footer_text         TEXT DEFAULT '© 2025 Kogi State Government. All rights reserved.',
  contact_email       TEXT,
  contact_phone       TEXT,
  hero_title          TEXT DEFAULT 'GOVERNMENT DELIVERY UNIT (GDU)',
  hero_subtitle       TEXT DEFAULT 'KOGI STATE GOVERNMENT',
  hero_tagline        TEXT DEFAULT '…Confluence of Opportunities',
  updated_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 26. LOGIN_PAGE_SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.login_page_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL DEFAULT 'Sign in to the GDU Admin Page',
  subtitle        TEXT DEFAULT 'Access and manage the Government Delivery Unit administration system.',
  show_home_btn   BOOLEAN NOT NULL DEFAULT TRUE,
  allow_remember  BOOLEAN NOT NULL DEFAULT TRUE,
  login_bg_url    TEXT,
  logo_url        TEXT,
  updated_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_staff_department ON public.staff_records(department_id);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.staff_records(role);
CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff_records(status);
CREATE INDEX IF NOT EXISTS idx_staff_email ON public.staff_records(email);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_date ON public.attendance(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_leave_staff ON public.leave_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_payroll_staff ON public.payroll(staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month_year ON public.payroll(month, year);
CREATE INDEX IF NOT EXISTS idx_documents_staff ON public.documents(staff_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_messages_group ON public.messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_submitted_by ON public.support_tickets(submitted_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organogram_parent ON public.organogram(parent_id);

-- ============================================================
-- TRIGGERS — auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','departments','staff_records','attendance','leave_requests',
    'payroll','allowances','documents','chat_groups','messages',
    'announcements','organogram','support_tickets','branding_settings','login_page_settings'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t
    );
  END LOOP;
END $$;

-- ============================================================
-- TRIGGER — auto-create profile on sign up
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'staff')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER — auto-generate ticket number
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_ticket_no()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_no = 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('ticket_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1;

CREATE TRIGGER set_ticket_no
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW WHEN (NEW.ticket_no IS NULL OR NEW.ticket_no = '')
  EXECUTE FUNCTION public.generate_ticket_no();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organogram ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_page_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'super_admin' FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_above()
RETURNS BOOLEAN AS $$
  SELECT role IN ('admin','super_admin') FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS POLICIES — PROFILES
-- ============================================================
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Super admin can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Admin and above can view profiles" ON public.profiles
  FOR SELECT USING (public.is_admin_or_above());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Super admin can manage profiles" ON public.profiles
  FOR ALL USING (public.is_super_admin());

-- ============================================================
-- RLS POLICIES — STAFF RECORDS
-- ============================================================
CREATE POLICY "Staff can view own record" ON public.staff_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admin and above can view all staff" ON public.staff_records
  FOR SELECT USING (public.is_admin_or_above());

CREATE POLICY "DG and TA can view all staff" ON public.staff_records
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('dg','ta')
  );

CREATE POLICY "Admin can create staff" ON public.staff_records
  FOR INSERT WITH CHECK (public.is_admin_or_above());

CREATE POLICY "Admin can update staff" ON public.staff_records
  FOR UPDATE USING (public.is_admin_or_above());

CREATE POLICY "Super admin can delete staff" ON public.staff_records
  FOR DELETE USING (public.is_super_admin());

-- ============================================================
-- RLS POLICIES — DEPARTMENTS
-- ============================================================
CREATE POLICY "All authenticated can view departments" ON public.departments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage departments" ON public.departments
  FOR ALL USING (public.is_admin_or_above());

-- ============================================================
-- RLS POLICIES — ATTENDANCE
-- ============================================================
CREATE POLICY "Staff can view own attendance" ON public.attendance
  FOR SELECT USING (
    staff_id IN (SELECT id FROM public.staff_records WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin and above can view all attendance" ON public.attendance
  FOR SELECT USING (public.is_admin_or_above());

CREATE POLICY "DG and TA can view attendance" ON public.attendance
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('dg','ta')
  );

CREATE POLICY "Admin can manage attendance" ON public.attendance
  FOR ALL USING (public.is_admin_or_above());

CREATE POLICY "Staff can check in/out" ON public.attendance
  FOR INSERT WITH CHECK (
    staff_id IN (SELECT id FROM public.staff_records WHERE user_id = auth.uid())
  );

-- ============================================================
-- RLS POLICIES — LEAVE REQUESTS
-- ============================================================
CREATE POLICY "Staff can view own leave" ON public.leave_requests
  FOR SELECT USING (
    staff_id IN (SELECT id FROM public.staff_records WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff can create leave request" ON public.leave_requests
  FOR INSERT WITH CHECK (
    staff_id IN (SELECT id FROM public.staff_records WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin can view and manage leave" ON public.leave_requests
  FOR ALL USING (public.is_admin_or_above());

-- ============================================================
-- RLS POLICIES — PAYROLL & ALLOWANCES
-- ============================================================
CREATE POLICY "Staff can view own payroll" ON public.payroll
  FOR SELECT USING (
    staff_id IN (SELECT id FROM public.staff_records WHERE user_id = auth.uid())
  );

CREATE POLICY "Accounts and above can view all payroll" ON public.payroll
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('accounts','admin','super_admin','dg','ta')
  );

CREATE POLICY "Accounts can manage payroll" ON public.payroll
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('accounts','super_admin')
  );

CREATE POLICY "Staff can view own allowances" ON public.allowances
  FOR SELECT USING (
    staff_id IN (SELECT id FROM public.staff_records WHERE user_id = auth.uid())
  );

CREATE POLICY "Accounts can manage allowances" ON public.allowances
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('accounts','super_admin')
  );

-- ============================================================
-- RLS POLICIES — DOCUMENTS
-- ============================================================
CREATE POLICY "Staff can view own documents" ON public.documents
  FOR SELECT USING (
    uploaded_by = auth.uid() OR
    staff_id IN (SELECT id FROM public.staff_records WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff can upload documents" ON public.documents
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Super admin can view all documents" ON public.documents
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Super admin can manage documents" ON public.documents
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "All can view document categories" ON public.document_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================================
-- RLS POLICIES — MESSAGES & CHAT
-- ============================================================
CREATE POLICY "Members can view group messages" ON public.messages
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM public.chat_group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    group_id IN (
      SELECT group_id FROM public.chat_group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Super admin can view all messages" ON public.messages
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Members can view their groups" ON public.chat_groups
  FOR SELECT USING (
    id IN (SELECT group_id FROM public.chat_group_members WHERE user_id = auth.uid())
    OR public.is_admin_or_above()
  );

CREATE POLICY "Anyone can view group membership" ON public.chat_group_members
  FOR SELECT USING (
    user_id = auth.uid() OR public.is_admin_or_above()
  );

-- ============================================================
-- RLS POLICIES — NOTIFICATIONS
-- ============================================================
CREATE POLICY "Users see own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admin can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (public.is_admin_or_above());

CREATE POLICY "Super admin can manage notifications" ON public.notifications
  FOR ALL USING (public.is_super_admin());

-- ============================================================
-- RLS POLICIES — ANNOUNCEMENTS
-- ============================================================
CREATE POLICY "All authenticated can view announcements" ON public.announcements
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage announcements" ON public.announcements
  FOR ALL USING (public.is_admin_or_above());

-- ============================================================
-- RLS POLICIES — ORGANOGRAM
-- ============================================================
CREATE POLICY "All authenticated can view organogram" ON public.organogram
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin can manage organogram" ON public.organogram
  FOR ALL USING (public.is_super_admin());

-- ============================================================
-- RLS POLICIES — SUPPORT TICKETS
-- ============================================================
CREATE POLICY "Users can view own tickets" ON public.support_tickets
  FOR SELECT USING (submitted_by = auth.uid());

CREATE POLICY "Users can create tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "ICT and above can view all tickets" ON public.support_tickets
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ict','admin','super_admin')
  );

CREATE POLICY "ICT can manage tickets" ON public.support_tickets
  FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ict','super_admin')
  );

CREATE POLICY "Users can view own ticket replies" ON public.ticket_replies
  FOR SELECT USING (
    ticket_id IN (SELECT id FROM public.support_tickets WHERE submitted_by = auth.uid())
    OR author_id = auth.uid()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ict','admin','super_admin')
  );

CREATE POLICY "Authenticated can add replies" ON public.ticket_replies
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND (
      ticket_id IN (SELECT id FROM public.support_tickets WHERE submitted_by = auth.uid())
      OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('ict','admin','super_admin')
    )
  );

-- ============================================================
-- RLS POLICIES — AUDIT LOGS
-- ============================================================
CREATE POLICY "Super admin can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (TRUE);

-- ============================================================
-- RLS POLICIES — AI CHAT LOGS
-- ============================================================
CREATE POLICY "Users can view own AI chat logs" ON public.ai_chat_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create AI chat logs" ON public.ai_chat_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admin can view all AI logs" ON public.ai_chat_logs
  FOR SELECT USING (public.is_super_admin());

-- ============================================================
-- RLS POLICIES — REPORTS
-- ============================================================
CREATE POLICY "Users can view own reports" ON public.reports
  FOR SELECT USING (generated_by = auth.uid());

CREATE POLICY "Admin and above can view all reports" ON public.reports
  FOR SELECT USING (public.is_admin_or_above());

CREATE POLICY "Authenticated can generate reports" ON public.reports
  FOR INSERT WITH CHECK (generated_by = auth.uid());

-- ============================================================
-- RLS POLICIES — SETTINGS
-- ============================================================
CREATE POLICY "All authenticated can view settings" ON public.system_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin can manage settings" ON public.system_settings
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "All can view branding" ON public.branding_settings
  FOR SELECT USING (TRUE);

CREATE POLICY "Super admin can manage branding" ON public.branding_settings
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "All can view login settings" ON public.login_page_settings
  FOR SELECT USING (TRUE);

CREATE POLICY "Super admin can manage login settings" ON public.login_page_settings
  FOR ALL USING (public.is_super_admin());

-- ============================================================
-- REALTIME — enable for key tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
