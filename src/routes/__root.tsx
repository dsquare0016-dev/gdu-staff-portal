import React, { useState } from "react";

import { Landmark } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { AuthProvider } from "@/lib/hooks/use-auth";
import { NotificationProvider } from "@/lib/providers/notification-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const [showDeveloperInfo, setShowDeveloperInfo] = useState(false);
  const router = useRouter();
  const timestamp = new Date().toLocaleString();

  // Friendly explanations for common errors
  const getFriendlyMessage = (err: Error) => {
    const msg = err.message.toLowerCase();
    if (msg.includes('is not defined') || msg.includes('lucide')) {
      return "A required component or icon was not found. This is usually due to a missing import or broken package.";
    }
    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('supabase')) {
      return "There seems to be a connection problem with the database. Please check your internet and try again.";
    }
    if (msg.includes('relationship') || msg.includes('column') || msg.includes('schema')) {
      return "There is a mismatch between the portal code and the database structure. A database migration might be needed.";
    }
    return "Something went wrong while rendering this page. Our technical team has been notified.";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="mx-auto h-24 w-24 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 animate-pulse">
            <Landmark className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">
            Portal Under Maintenance
          </h1>
          <p className="text-lg text-slate-600 font-medium max-w-md mx-auto">
            Sorry, this page is currently under maintenance and will be back soon.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button 
            onClick={() => window.location.href = '/dashboard'} 
            className="rounded-full px-8 h-12 font-bold shadow-lg"
          >
            Return to Dashboard
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowDeveloperInfo(!showDeveloperInfo)}
            className="rounded-full px-8 h-12 font-bold border-2"
          >
            {showDeveloperInfo ? "Hide Technical Info" : "If you are the Developer, click here to see problem statement"}
          </Button>
        </div>

        {showDeveloperInfo && (
          <div className="mt-12 p-8 bg-white border-2 border-slate-200 rounded-3xl text-left shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Developer Diagnostic Tool</h2>
              <span className="text-[10px] font-mono text-slate-400">{timestamp}</span>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-red-500 tracking-tighter">Error Message</p>
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-sm font-mono text-red-700 break-words leading-relaxed">
                    {error.message || 'An unknown error occurred'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Route URL</p>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-xs font-mono text-slate-600 truncate">{window.location.pathname}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Suggested Fix</p>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-xs font-bold text-slate-600">{getFriendlyMessage(error)}</p>
                  </div>
                </div>
              </div>

              {error.stack && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Stack Trace</p>
                  <pre className="text-[10px] overflow-auto max-h-48 text-slate-400 bg-slate-900 p-4 rounded-xl font-mono leading-relaxed">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="mt-8 pt-6 border-t flex justify-between items-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GDU Staff Portal — System Error Log</p>
              <Button size="sm" variant="ghost" className="text-[10px] font-black uppercase" onClick={reset}>
                Force Re-render
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GDU Connect Portal — Workforce Intelligence" },
      { name: "description", content: "GDU Connect Portal is an AI-powered platform for government staff management and workforce intelligence." },
      { name: "author", content: "GDU ICT" },
      { property: "og:title", content: "GDU Connect Portal" },
      { property: "og:description", content: "GDU Connect Portal is an AI-powered platform for government staff management and workforce intelligence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@GDU_Kogi" },
      { name: "twitter:title", content: "GDU Connect Portal" },
      { name: "twitter:description", content: "GDU Connect Portal is an AI-powered platform for government staff management and workforce intelligence." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7791c768-b876-4ad6-8f5c-7ed7544c75b1/id-preview-e8d01c8c--587e2905-4962-4994-8ca5-7d7a4f4effaf.lovable.app-1780056347696.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7791c768-b876-4ad6-8f5c-7ed7544c75b1/id-preview-e8d01c8c--587e2905-4962-4994-8ca5-7d7a4f4effaf.lovable.app-1780056347696.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeadContent />
      {children}
      <Scripts />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="gdu-portal-theme">
        <AuthProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Outlet />
              <Toaster richColors position="top-right" />
            </TooltipProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
