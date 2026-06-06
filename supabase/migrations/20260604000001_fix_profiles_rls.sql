-- Ensure RLS is enabled on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Safely add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='status') THEN
        ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- Policy: Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy: Super Admins can view all profiles
DROP POLICY IF EXISTS "Super Admins can view all profiles" ON public.profiles;
CREATE POLICY "Super Admins can view all profiles" ON public.profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Ensure the superadmin profile exists for the specific UID mentioned by user
INSERT INTO public.profiles (id, email, full_name, role, is_active, status)
VALUES ('3de484b4-c116-4488-9802-cb84c6f53d6d', 'superadmin@portal.gdu.gov.ng', 'Super Administrator', 'super_admin', true, 'active')
ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    is_active = true,
    status = 'active';
