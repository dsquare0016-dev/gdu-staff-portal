import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Landmark, Star, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import loginBg from "@/assets/login-bg.jpg";

const ROLES = [
  { value: "staff", label: "Staff" },
  { value: "accounts", label: "Accounts Officer" },
  { value: "admin", label: "Administrator" },
  { value: "dg", label: "Director General" },
  { value: "ta", label: "Technical Adviser" },
  { value: "ict", label: "ICT Support" },
  { value: "super_admin", label: "Super Admin" },
];

export const Route = createFileRoute("/")({
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
  const [role, setRole] = useState("staff");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
  };

  return (
    <main className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <section
        aria-label="Kogi State Government Delivery Unit"
        className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-primary text-primary-foreground"
        style={{
          backgroundImage: `linear-gradient(135deg, oklch(0.22 0.09 263 / 0.85), oklch(0.18 0.08 263 / 0.92)), url(${loginBg})`,
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
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 w-24 rounded-full bg-white/95 shadow-2xl ring-4 ring-[var(--color-gold)]/40 flex items-center justify-center"
              >
                <Landmark className="h-10 w-10 text-primary" />
              </div>
            ))}
          </div>

          <h1 className="text-3xl xl:text-4xl font-bold tracking-tight">
            GOVERNMENT DELIVERY UNIT (GDU)
          </h1>
          <p className="mt-3 text-xl font-semibold" style={{ color: "var(--color-gold)" }}>
            KOGI STATE GOVERNMENT
          </p>

          <div className="mt-6 flex items-center gap-3">
            <span className="h-px w-16" style={{ background: "var(--color-gold)" }} />
            <Star className="h-4 w-4" style={{ color: "var(--color-gold)" }} fill="currentColor" />
            <span className="h-px w-16" style={{ background: "var(--color-gold)" }} />
          </div>

          <p className="mt-4 italic text-base text-primary-foreground/85">
            …Confluence of Opportunities
          </p>
        </div>
      </section>

      {/* Right form panel */}
      <section className="flex items-center justify-center px-6 py-12 sm:px-12 bg-background">
        <div className="w-full max-w-md">
          {/* Hexagonal badge with user icon */}
          <div className="flex justify-center mb-6">
            <div className="relative h-16 w-14 flex items-center justify-center">
              <svg
                viewBox="0 0 56 64"
                className="absolute inset-0 h-full w-full"
                aria-hidden
              >
                <polygon
                  points="28,2 53,16 53,48 28,62 3,48 3,16"
                  fill="oklch(0.24 0.09 263)"
                  stroke="var(--color-gold)"
                  strokeWidth="1.5"
                />
                <line x1="6" y1="18" x2="6" y2="46" stroke="var(--color-gold)" strokeWidth="2" />
              </svg>
              <User className="relative h-6 w-6 text-white" strokeWidth={2} />
            </div>
          </div>

          <header className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              Sign in to the GDU Admin Page
            </h2>
            <p className="mt-3 text-muted-foreground text-sm">
              Access and manage the Government Delivery Unit administration system.
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

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base font-semibold border-2 border-primary text-primary hover:bg-primary/5"
            >
              <Landmark className="mr-2 h-5 w-5" />
              HOME PAGE
            </Button>
          </form>

          <footer className="mt-10 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span>© 2025 Kogi State Government</span>
            <span className="h-3 w-px bg-border" />
            <span>All rights reserved.</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
