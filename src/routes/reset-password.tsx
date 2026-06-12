import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';

export const Route = createFileRoute('/reset-password')({
  component: ResetPassword,
});

function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://gdu-portal.mvxwa.org/auth/callback?type=recovery`,
      });

      if (error) throw error;
      
      setSent(true);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md border-0 shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="space-y-1 pb-6 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-black uppercase italic tracking-tight">Check your email</CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              We've sent a password reset link to <span className="text-primary font-bold">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate({ to: '/' })}>
              Back to login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md border-0 shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="space-y-1 pb-6 text-center">
          <CardTitle className="text-2xl font-black uppercase italic tracking-tight">Reset Password</CardTitle>
          <CardDescription className="text-slate-500 font-medium">
            Enter your email and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-slate-500">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@gdu.gov.ng" 
                  required 
                  className="pl-10 rounded-xl h-12 border-slate-200 focus:border-primary focus:ring-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <Button type="submit" className="w-full rounded-xl h-12 font-bold shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Reset Link
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <Link to="/" className="text-sm text-slate-500 hover:text-primary transition-colors flex items-center gap-2 mx-auto font-bold">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
