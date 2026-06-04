-- Update notification_type enum to include new types
DO $$ 
BEGIN
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'birthday';
    ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'retirement';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attendance_alerts   BOOLEAN NOT NULL DEFAULT TRUE,
  birthday_alerts     BOOLEAN NOT NULL DEFAULT TRUE,
  retirement_alerts   BOOLEAN NOT NULL DEFAULT TRUE,
  allowance_alerts    BOOLEAN NOT NULL DEFAULT TRUE,
  system_alerts       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS for notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON public.notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Trigger for auto-creating preferences for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_preferences();

-- Seed preferences for existing users
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Update notifications table to include status if not already present
-- The user mentioned a 'status' field in the prompt.
-- Current table has 'is_read'. I'll add 'status' as a text field for flexibility.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unread';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_module TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_record_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enable Realtime for notifications if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- Update audit_logs to include module and description for system_activity_logs compliance
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS module TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS related_record_id UUID;
