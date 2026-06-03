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
import { AuthProvider } from "@/lib/hooks/use-auth";
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
  console.error("Dashboard Error:", error);
  const router = useRouter();

  // Friendly explanations for common errors
  const getFriendlyMessage = (err: Error) => {
    const msg = err.message.toLowerCase();
    if (msg.includes('is not defined')) {
      return "A required component or icon was not found. This is usually due to a missing import.";
    }
    if (msg.includes('failed to fetch') || msg.includes('networkerror')) {
      return "There seems to be a connection problem. Please check your internet and try again.";
    }
    if (msg.includes('supabase')) {
      return "There was an issue communicating with the database. Please try again later.";
    }
    return "Something went wrong while rendering this page.";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-bold tracking-tight text-foreground uppercase italic">
          This page didn't load
        </h1>
        
        <div className="mt-6 p-6 bg-destructive/5 border border-destructive/10 rounded-2xl text-left shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-4 w-4 rounded-full bg-destructive flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white">!</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-destructive">Reason:</p>
              <p className="text-xs font-mono text-destructive/80 break-words leading-relaxed bg-white/50 p-2 rounded border border-destructive/5">
                {error.message || 'An unknown error occurred'}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3">
            <div className="mt-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white">?</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-primary">Suggested Fix:</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {getFriendlyMessage(error)}
              </p>
            </div>
          </div>

          {error.stack && (
            <details className="mt-6 group">
              <summary className="text-[10px] text-muted-foreground cursor-pointer uppercase tracking-widest font-bold flex items-center gap-2 hover:text-foreground transition-colors">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                Stack Trace
              </summary>
              <pre className="mt-3 text-[10px] overflow-auto max-h-40 text-muted-foreground/60 bg-muted/30 p-3 rounded-xl border font-mono">
                {error.stack}
              </pre>
            </details>
          )}
        </div>

        <p className="mt-6 text-sm text-muted-foreground font-medium">
          The technical team has been notified.
        </p>
        
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-95"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border-2 border-primary/20 bg-background px-6 py-2.5 text-sm font-bold text-foreground transition-all hover:bg-muted active:scale-95"
          >
            Go home
          </a>
        </div>
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
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="gdu-portal-theme">
        <AuthProvider>
          <TooltipProvider>
            <Outlet />
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
