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
import type { UserRole } from "@/types";

// Static logo imports for reliability
import nigeriaCoatOfArms from "@/assets/images/logos/nigeria-coat-of-arms.png";
import kogiStateLogo from "@/assets/images/logos/Logo-Gduu.jpg";
import gduLogo from "@/assets/images/logos/gdu-logo.png";
import loginBackground from "@/assets/images/logos/login-background.jpg";

const ROLES = [
  { value: "staff", label: "Staff" },
  { value: "accounts", label: "Accounts Officer" },
  { value: "admin", label: "Administrator" },
  { value: "dg", label: "Director General" },
  { value: "technical_assistant", label: "Technical Assistant" },
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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotInput, setForgotInput] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const { profile, loading: authLoading, signIn } = useAuth();
  const navigate = useNavigate();

  // 1. All hooks at the top level
  const brandingQuery = useQuery({
    queryKey: ['portal-branding-settings'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('portal_branding_settings')
          .select('*')
          .eq('id', 1)
          .single();
        
        if (error) return null;
        
        // Fallback/Extra logos from branding_settings if available
        const { data: bData } = await supabase
          .from('branding_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        return { ...(data as any), ...(bData as any) };
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const loginSettingsQuery = useQuery({
    queryKey: ['login-page-settings'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('login_page_settings')
          .select('*')
          .eq('id', 1)
          .single();
        if (error) return null;
        return data;
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const branding = brandingQuery.data as any;
  const loginSettings = loginSettingsQuery.data as any;

  // 2. Redirect logic in useEffect
  useEffect(() => {
    if (!authLoading && profile) {
      console.log('[Login] Profile detected, redirecting to dashboard...');
      setLoading(false);
      navigate({ to: "/dashboard" });
    }
  }, [profile, authLoading, navigate]);

  // Removed safety timeout; rely on auth flow handling to manage loading state.
  // If needed, a more precise timeout can be added based on authLoading state.
  // This prevents premature error toast when login succeeds quickly.
  // The signIn function now resets loading and navigates immediately on success.

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    // Validate inputs
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      console.log('[Login] --- LOGIN FLOW STARTED ---');
      console.log('[Login] Target Email:', email);
      console.log('[Login] Selected Role:', role);
      
      const { error } = await signIn(email, password, role);
      
      if (error) {
        console.error('[Login] Sign-in flow returned error:', error.message);
        toast.error(error.message || "Invalid login credentials", {
          duration: 5000,
        });
        setLoading(false);
        return;
      }
      
      console.log('[Login] Auth successful. Redirecting immediately...');
      toast.success("Login successful! Redirecting to dashboard...");
      setLoading(false);
      navigate({ to: "/dashboard" });
    } catch (error: any) {
      console.error('[Login] Unexpected exception in handleSignIn:', error);
      toast.error(error.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotInput) {
      toast.error("Please enter your Email or Staff ID");
      return;
    }

    setIsResetting(true);
    try {
      let targetEmail = forgotInput.trim().toLowerCase();

      // If it's a Staff ID, look up the email
      if (!targetEmail.includes('@')) {
        const { data, error } = await supabase
          .from('staff_records')
          .select('email')
          .eq('readable_id', targetEmail.toUpperCase())
          .maybeSingle();

        if (error) throw error;
        if (!data?.email) {
          throw new Error("Staff ID not found. Please check and try again.");
        }
        targetEmail = data.email;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/dashboard/settings/security`,
      });

      if (error) throw error;

      toast.success("Password reset email sent! Please check your inbox.");
      setIsForgotOpen(false);
      setForgotInput("");
    } catch (error: any) {
      console.error("[Auth] Forgot password error:", error);
      toast.error(error.message || "Failed to send reset email. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  const heroTitle = branding?.hero_title || "GOVERNMENT DELIVERY UNIT (GDU)";
  const heroSubtitle = branding?.hero_subtitle || "KOGI STATE GOVERNMENT";
  const heroTagline = branding?.hero_tagline || "…Confluence of Opportunities";
  const footerText = branding?.footer_text || "© 2025 Kogi State Government. All rights reserved.";
  const loginTitle = loginSettings?.title || "GDU staff Login section";
  const loginSubtitle = loginSettings?.subtitle || "Access and manage the Government Delivery Unit administration system.";
  
  const bgUrl = loginBackground;

  // Fallback handler for images
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.style.display = 'none';
  };

  return (
    <main className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <section
        aria-label="Kogi State Government Delivery Unit"
        className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0A1F40] text-primary-foreground"
        style={{
          backgroundImage: `linear-gradient(rgba(10, 31, 64, 0.85), rgba(10, 31, 64, 0.95)), url(${bgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Subtle pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.05] pointer-events-none" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} 
        />

        {/* Gold diagonal divider on the right edge */}
        <div
          aria-hidden
          className="absolute top-0 right-0 h-full w-[6px]"
          style={{ background: "linear-gradient(to bottom, #D4AF37, #B48A2D, #D4AF37)" }}
        />

        <div className="relative flex-1 flex flex-col items-center justify-center px-12 text-center">
          {/* Seals row arranged exactly like reference: Nigeria, Kogi, GDU */}
          <div className="flex items-center justify-center gap-6 xl:gap-10 mb-16 xl:mb-20">
            {/* Nigeria Coat of Arms */}
            <div className="h-24 w-24 xl:h-28 xl:w-28 rounded-full bg-white shadow-[0_10px_40px_rgba(0,0,0,0.5)] ring-4 ring-[#D4AF37]/40 flex items-center justify-center overflow-hidden p-2 transition-all hover:scale-105 duration-500">
              <img 
                src={branding?.logo_url_3 || nigeriaCoatOfArms} 
                alt="Nigeria Coat of Arms" 
                className="h-full w-full object-contain" 
                onError={handleImageError}
              />
            </div>
            {/* Kogi State Seal - Larger and Central */}
            <div className="h-32 w-32 xl:h-40 xl:w-40 rounded-full bg-white shadow-[0_15px_60px_rgba(0,0,0,0.6)] ring-4 ring-[#D4AF37] flex items-center justify-center overflow-hidden p-2 transition-all hover:scale-110 duration-500 z-10">
              <img 
                src={kogiStateLogo} 
                alt="Kogi State Logo" 
                className="h-full w-full object-contain"
              />
            </div>
            {/* GDU Logo */}
            <div className="h-24 w-24 xl:h-28 xl:w-28 rounded-full bg-white shadow-[0_10px_40px_rgba(0,0,0,0.5)] ring-4 ring-[#D4AF37]/40 flex items-center justify-center overflow-hidden p-2 transition-all hover:scale-105 duration-500">
              <img 
                src={branding?.logo_url || gduLogo} 
                alt="GDU Seal" 
                className="h-full w-full object-contain"
                onError={handleImageError}
              />
            </div>
          </div>

          <div className="space-y-4 max-w-2xl">
            <h1 className="text-3xl xl:text-4xl font-black tracking-wider uppercase leading-tight drop-shadow-lg text-white">
              GOVERNMENT DELIVERY UNIT (GDU)
            </h1>
            <p className="text-xl xl:text-2xl font-bold uppercase tracking-[0.2em]" style={{ color: "#D4AF37" }}>
              KOGI STATE GOVERNMENT
            </p>

            <div className="flex items-center justify-center gap-4 py-4">
              <div className="h-[2px] w-16 xl:w-20 bg-gradient-to-r from-transparent to-[#D4AF37]" />
              <Star className="h-5 w-5 text-[#D4AF37]" fill="currentColor" />
              <div className="h-[2px] w-16 xl:w-20 bg-gradient-to-l from-transparent to-[#D4AF37]" />
            </div>

            <p className="italic text-lg xl:text-xl text-white/90 font-medium tracking-wide">
              ...Confluence of Opportunities
            </p>
          </div>
        </div>
      </section>

      {/* Right form panel */}
      <section className="flex items-center justify-center px-6 py-12 sm:px-12 bg-background overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Hexagonal badge with logo - Mobile only or consistent branding */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <div className="relative h-20 w-20 flex items-center justify-center">
              <div className="absolute inset-0 bg-white rounded-full shadow-lg border-2 border-[#D4AF37] overflow-hidden p-1">
                <img src={gduLogo} alt="GDU Logo" className="h-full w-full object-contain" onError={handleImageError} />
              </div>
            </div>
          </div>

          <header className="text-center mb-8">
            <h2 className="text-2xl xl:text-3xl font-bold text-foreground tracking-tight">
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
              <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
                <SelectTrigger id="role" className="h-12 rounded-full px-4 border-[#D4AF37]/20 focus:ring-[#D4AF37]">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[#D4AF37]" />
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
                Email Address or Staff ID
              </Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-[#D4AF37] transition-colors" />
                <Input
                  id="email"
                  type="text"
                  placeholder="name@gdu.gov.ng or GDU001"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-11 rounded-full border-[#D4AF37]/20 focus-visible:ring-[#D4AF37] transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-[#D4AF37] transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-11 pr-11 rounded-full border-[#D4AF37]/20 focus-visible:ring-[#D4AF37] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#D4AF37] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(checked as boolean)}
                  className="rounded border-[#D4AF37]/40 data-[state=checked]:bg-[#D4AF37] data-[state=checked]:border-[#D4AF37]"
                />
                <label htmlFor="remember" className="text-xs font-medium cursor-pointer">
                  Remember me
                </label>
              </div>
              
              <Dialog open={isForgotOpen} onOpenChange={setIsForgotOpen}>
                <DialogTrigger asChild>
                  <button type="button" className="text-xs font-bold text-[#D4AF37] hover:underline">
                    Forgot password?
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>
                      Enter your Email Address or Staff ID to receive a password reset link.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleForgotPassword} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-input">Email or Staff ID</Label>
                      <Input
                        id="forgot-input"
                        placeholder="e.g. name@gdu.gov.ng or GDU001"
                        value={forgotInput}
                        onChange={(e) => setForgotInput(e.target.value)}
                        required
                        className="rounded-full border-[#D4AF37]/20 focus-visible:ring-[#D4AF37]"
                      />
                    </div>
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        disabled={isResetting}
                        className="w-full rounded-full bg-[#0A1F40] hover:bg-[#0A1F40]/90 text-white font-bold"
                      >
                        {isResetting ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Sending...</span>
                          </div>
                        ) : (
                          "Send Reset Link"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-[#0A1F40] hover:bg-[#0A1F40]/90 text-white font-bold text-lg shadow-xl shadow-[#0A1F40]/20 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>
                    {profile ? "Verifying account..." : "Signing in..."}
                  </span>
                </div>
              ) : (
                "Sign In to Portal"
              )}
            </Button>
          </form>

          <footer className="mt-12 text-center">
            <p className="text-xs text-muted-foreground font-medium">
              {footerText}
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
