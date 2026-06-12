import { Sidebar } from './sidebar';
import { Header } from './header';
import { useAuth } from '@/lib/hooks/use-auth';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FloatingAIAssistant } from '../dashboard/floating-ai-assistant';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PortalLoader } from '../ui/portal-loader';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, loading, isSuperAdmin, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      if (loading) setShowError(true);
    }, 20000); // Increased to 20s for better tolerance on external/slow connections
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (mounted && !loading && !profile && !authError) {
      console.log('[DashboardLayout] No session/profile found, redirecting to login...');
      navigate({ to: '/', replace: true });
      return;
    }

    if (mounted && !loading && profile && !isSuperAdmin) {
      const path = location.pathname;
      const role = profile.role;

      // Strict RBAC enforcement
      const restrictions: Record<string, string[]> = {
        'dg': ['/dashboard/settings'],
        'technical_assistant': ['/dashboard/settings'],
        'accounts': ['/dashboard/staff', '/dashboard/settings'],
        'admin': ['/dashboard/settings/branding', '/dashboard/settings/roles'],
        'staff': ['/dashboard/staff', '/dashboard/payroll', '/dashboard/settings'],
        'adhoc': ['/dashboard/staff', '/dashboard/payroll', '/dashboard/settings'],
      };

      const restrictedPaths = restrictions[role] || [];
      const isRestricted = restrictedPaths.some(p => path.startsWith(p));

      if (isRestricted) {
        setIsAccessDenied(true);
        toast.error("Invalid User Role Selected. Please ensure you selected the proper role for this login.");
      }
    }
  }, [mounted, loading, profile, authError, navigate, location.pathname, isSuperAdmin]);

  if (!mounted || (loading && !showError)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <PortalLoader />
      </div>
    );
  }

  if (authError && !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-destructive">Authentication Error</h2>
            <p className="text-muted-foreground">
              {authError}
            </p>
          </div>
          <div className="flex flex-col w-full gap-2">
            <Button onClick={() => window.location.href = '/'} variant="default">
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isAccessDenied) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
            <p className="text-muted-foreground">
              Invalid User Role Selected. Please ensure you selected the proper role for this login.
            </p>
          </div>
          <div className="flex flex-col w-full gap-2">
            <Button onClick={() => navigate({ to: '/dashboard' })} variant="default">
              Return to My Dashboard
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              Sign Out & Re-login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showError && !profile && loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 max-w-md text-center px-6">
          <PortalLoader size="sm" message="Connection Issue" className="grayscale opacity-50" />
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-destructive uppercase tracking-tight">Connection Issue</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The portal is taking longer than usual to load. This might be due to a slow database connection or session issue.
            </p>
          </div>
          <div className="flex flex-col w-full gap-3 mt-4">
            <Button onClick={() => window.location.reload()} variant="default" className="w-full h-11 rounded-xl shadow-lg shadow-primary/20">
              Retry Connection
            </Button>
            <Button onClick={() => navigate({ to: '/' })} variant="ghost" className="text-xs">
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
      <FloatingAIAssistant />
    </div>
  );
}