-- Migration to add security policy settings
-- Date: 2026-06-06

INSERT INTO public.system_settings (key, value, type, label, description)
VALUES 
('min_password_length', '8', 'number', 'Minimum Password Length', 'Minimum number of characters required for passwords'),
('password_expiry_days', '90', 'number', 'Password Expiry Days', 'Number of days before a password must be changed'),
('require_2fa', 'false', 'boolean', 'Require 2FA', 'Whether to require two-factor authentication for all users')
ON CONFLICT (key) DO NOTHING;
