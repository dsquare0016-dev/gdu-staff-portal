import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Parse query params for errors
      const params = new URLSearchParams(window.location.search);
      const errorCode = params.get('error_code');
      const errorDescription = params.get('error_description');

      if (errorCode === 'otp_expired' || errorCode === 'access_denied') {
        toast.error(errorDescription || 'The link has expired or is invalid. Please request a new one.');
        setTimeout(() => navigate({ to: '/' }), 3000);
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error during auth callback:', error.message);
        toast.error('Authentication failed: ' + error.message);
        navigate({ to: '/' });
        return;
      }

      if (data?.session) {
        // Check if this was a password reset or email confirmation
        const recoveryMode = window.location.href.includes('type=recovery') || window.location.hash.includes('type=recovery');
        const signupMode = window.location.href.includes('type=signup') || window.location.href.includes('type=invite') || window.location.hash.includes('type=invite');
        
        if (recoveryMode || signupMode) {
          toast.success('Session verified. Please update your password.');
          navigate({ to: '/update-password' });
        } else {
          toast.success('Successfully logged in!');
          navigate({ to: '/dashboard' });
        }
      } else {
        // Fallback for PKCE or complex flows where session might not be ready
        console.log('No session in callback, checking again in 1s...');
        setTimeout(async () => {
          const { data: retryData } = await supabase.auth.getSession();
          if (retryData?.session) {
            navigate({ to: '/dashboard' });
          } else {
            navigate({ to: '/' });
          }
        }, 1000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground animate-pulse">Completing authentication...</p>
    </div>
  );
}
