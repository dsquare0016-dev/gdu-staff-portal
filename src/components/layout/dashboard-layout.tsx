import { Sidebar } from './sidebar';
import { Header } from './header';
import { useAuth } from '@/lib/hooks/use-auth';
import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FloatingAIAssistant } from '../dashboard/floating-ai-assistant';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !profile) {
      navigate({ to: '/' });
    }
  }, [mounted, loading, profile, navigate]);

  if (loading || !mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading portal...</p>
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