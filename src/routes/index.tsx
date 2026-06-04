import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Landmark, Star, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { toast } from "sonner";
import loginBg from "@/assets/login-bg.jpg";
import type { UserRole } from "@/types";

const ROLES = [
  { value: "staff", label: "Staff" },
  { value: "accounts", label: "Accounts Officer" },
  { value: "admin", label: "Administrator" },
  { value: "dg", label: "Director General" },
  { value: "ta", label: "Technical Adviser" },
  { value: "ict", label: "ICT Support" },
  { value: "super_admin", label: "Super Admin" },
];

import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    // Demo redirect logic removed to ensure only database-driven auth is used
  },
  head: () => ({
    meta: [
      { title: "Sign in — GDU Admin Portal | Kogi State Government" },
      {
        name: "description",
        content:
          "Sign in to the Government Delivery Unit (GDU) admin portal of the Kogi State Government to manage workforce, payroll, attendance, and operations.",
      },
      { property: "og:title", content: "GDU Admin Portal — Kogi State Government" },
      {
        property: "og:description",
        content: "Secure sign-in to the Government Delivery Unit administration system.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const { profile, loading: authLoading, signIn } = useAuth();
  const navigate = useNavigate();

  // Redirect if profile is available (handled by useAuth's initial session check)
  useEffect(() => {
    if (!authLoading && profile) {
      navigate({ to: "/dashboard" });
    }
  }, [profile, authLoading, navigate]);

  const { data: branding } = useQuery({
    queryKey: ['portal-branding-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_branding_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (error) return null;
      return data;
    },
  });

  const { data: loginSettings } = useQuery({
    queryKey: ['login-page-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('login_page_settings')
        .select('*')
        .single();
      if (error) return null;
      return data;
    },
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password, role);
      if (error) throw error;
      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } catch (error: any) {
      toast.error(error.message || "Invalid login credentials");
    } finally {
      setLoading(false);
    }
  };

  const heroTitle = branding?.hero_title || "GOVERNMENT DELIVERY UNIT (GDU)";
  const heroSubtitle = branding?.hero_subtitle || "KOGI STATE GOVERNMENT";
  const heroTagline = branding?.hero_tagline || "…Confluence of Opportunities";
  const footerText = branding?.footer_text || "© 2025 Kogi State Government. All rights reserved.";
  const loginTitle = loginSettings?.title || "GDU staff Login section";
  const loginSubtitle = loginSettings?.subtitle || "Access and manage the Government Delivery Unit administration system.";
  const logoUrl = branding?.logo_url || "/logo.png";
  const logoUrl2 = "/logo.png";
  const logoUrl3 = "/logo.png";
  const bgUrl = branding?.login_background_url || loginBg;

  return (
    <main className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <section
        aria-label="Kogi State Government Delivery Unit"
        className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-primary text-primary-foreground"
        style={{
          backgroundImage: `linear-gradient(135deg, oklch(0.22 0.09 263 / 0.85), oklch(0.18 0.08 263 / 0.92)), url(${bgUrl})`,
          backgroundSize: "cover, cover",
          backgroundPosition: "center, center",
        }}
      >
        {/* Gold diagonal divider on the right edge */}
        <div
          aria-hidden
          className="absolute top-0 right-0 h-full w-[6px]"
          style={{ background: "var(--gradient-gold)" }}
        />

        <div className="relative flex-1 flex flex-col items-center justify-center px-12 text-center">
          {/* Seals row */}
          <div className="flex items-center justify-center gap-6 mb-12">
            {[logoUrl, logoUrl2, logoUrl3].map((url, i) => (
              <div
                key={i}
                className="h-24 w-24 rounded-full bg-white shadow-2xl ring-4 ring-[var(--color-gold)]/40 flex items-center justify-center overflow-hidden p-2"
              >
                <img src={url} alt={`GDU Seal ${i + 1}`} className="h-full w-full object-contain" />
              </div>
            ))}
          </div>

          <h1 className="text-3xl xl:text-4xl font-bold tracking-tight uppercase">
            {heroTitle}
          </h1>
          <p className="mt-3 text-xl font-semibold uppercase" style={{ color: "var(--color-gold)" }}>
            {heroSubtitle}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <span className="h-px w-16" style={{ background: "var(--color-gold)" }} />
            <Star className="h-4 w-4" style={{ color: "var(--color-gold)" }} fill="currentColor" />
            <span className="h-px w-16" style={{ background: "var(--color-gold)" }} />
          </div>

          <p className="mt-4 italic text-base text-primary-foreground/85">
            {heroTagline}
          </p>
        </div>
      </section>

      {/* Right form panel */}
      <section className="flex items-center justify-center px-6 py-12 sm:px-12 bg-background">
        <div className="w-full max-w-md">
          {/* Hexagonal badge with logo */}
          <div className="flex justify-center mb-6">
            <div className="relative h-20 w-20 flex items-center justify-center">
              <div className="absolute inset-0 bg-white rounded-full shadow-lg border-2 border-[var(--color-gold)] overflow-hidden p-1">
                <img src={logoUrl} alt="GDU Logo" className="h-full w-full object-contain" />
              </div>
            </div>
          </div>

          <header className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              {loginTitle}
            </h2>
            <p className="mt-3 text-muted-foreground text-sm">
              {loginSubtitle}
            </p>
          </header>

          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-semibold">
                User Role
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role" className="h-12 rounded-full px-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select your role" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                State Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@kogi-state.gov.ng"
                  className="pl-10 h-12 rounded-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 h-12 rounded-full"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(!!v)}
                />
                Remember password
              </label>
              <a
                href="#"
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot Password?
              </a>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full text-base font-semibold bg-primary hover:bg-primary/90 shadow-[var(--shadow-elegant)]"
            >
              {loading ? "Signing in…" : "Sign In"}
            </Button>

            <div className="flex items-center gap-4 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground tracking-widest">
                OR
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {loginSettings?.show_home_btn !== false && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-full text-base font-semibold border-2 border-primary text-primary hover:bg-primary/5"
              >
                <Landmark className="mr-2 h-5 w-5" />
                HOME PAGE
              </Button>
            )}
          </form>

          <footer className="mt-10 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span>{footerText}</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
