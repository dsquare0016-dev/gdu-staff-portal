-- Create security_settings table
CREATE TABLE IF NOT EXISTS public.security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_password_length INTEGER DEFAULT 8,
    password_expiry_days INTEGER DEFAULT 90,
    require_2fa BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Super admin can manage security settings" ON public.security_settings
    FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('super_admin'));

CREATE POLICY "Authenticated can view security settings" ON public.security_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Initialize with a single row if empty
INSERT INTO public.security_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.security_settings);
