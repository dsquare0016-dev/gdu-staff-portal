import { Sidebar } from './sidebar';
import { Header } from './header';
import { useAuth } from '@/lib/hooks/use-auth';
import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FloatingAIAssistant } from '../dashboard/floating-ai-assistant';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fail-safe: if loading takes too long, show an error or try to proceed
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("Auth loading taking too long, check connection");
        setShowError(true);
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (mounted && !loading && !profile) {
      navigate({ to: '/' });
    }
  }, [mounted, loading, profile, navigate]);

  if (!mounted || (loading && !showError)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading portal...</p>
        </div>
      </div>
    );
  }

  if (showError && !profile && loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-6">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-red-600 animate-spin" />
          </div>
          <h2 className="text-lg font-semibold">Connection Issue</h2>
          <p className="text-sm text-muted-foreground">
            The portal is taking longer than usual to load. This might be due to a slow database connection or session issue.
          </p>
          <Button onClick={() => window.location.reload()} variant="outline" className="mt-2">
            Retry Connection
          </Button>
          <Button onClick={() => navigate({ to: '/' })} variant="ghost" className="text-xs">
            Back to Login
          </Button>
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