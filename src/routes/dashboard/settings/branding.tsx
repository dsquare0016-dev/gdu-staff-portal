import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Save, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadToCloudinary } from '@/lib/cloudinary';

export const Route = createFileRoute('/dashboard/settings/branding')({
  component: BrandingSettings,
});

function BrandingSettings() {
  const { isSuperAdmin, isICT } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isSuperAdmin && !isICT) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground">Only Super Admin or ICT can manage branding settings.</p>
      </div>
    );
  }

  const { data: branding, isLoading: brandingLoading } = useQuery({
    queryKey: ['branding-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branding_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: loginSettings, isLoading: loginLoading } = useQuery({
    queryKey: ['login-page-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('login_page_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState({
    portal_name: '',
    primary_color: '',
    secondary_color: '',
    footer_text: '',
    hero_title: '',
    hero_subtitle: '',
    hero_tagline: '',
    logo_url: '',
    logo_url_2: '',
    logo_url_3: '',
  });

  const [loginFormData, setLoginFormData] = useState({
    title: '',
    subtitle: '',
    login_bg_url: '',
  });

  useEffect(() => {
    if (branding) {
      setFormData({
        portal_name: branding.portal_name || '',
        primary_color: branding.primary_color || '',
        secondary_color: branding.secondary_color || '',
        footer_text: branding.footer_text || '',
        hero_title: branding.hero_title || '',
        hero_subtitle: branding.hero_subtitle || '',
        hero_tagline: branding.hero_tagline || '',
        logo_url: branding.logo_url || '',
        logo_url_2: (branding as any).logo_url_2 || '',
        logo_url_3: (branding as any).logo_url_3 || '',
      });
    }
  }, [branding]);

  useEffect(() => {
    if (loginSettings) {
      setLoginFormData({
        title: loginSettings.title || '',
        subtitle: loginSettings.subtitle || '',
        login_bg_url: loginSettings.login_bg_url || '',
      });
    }
  }, [loginSettings]);

  const updateBrandingMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('branding_settings')
        .update(updates)
        .eq('id', branding?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding-settings'] });
      toast.success('Branding settings updated');
    },
  });

  const updateLoginMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('login_page_settings')
        .update(updates)
        .eq('id', loginSettings?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['login-page-settings'] });
      toast.success('Login page settings updated');
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string, table: 'branding' | 'login', fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSubmitting(true);
      const res = await uploadToCloudinary(file, 'branding');

      if (table === 'branding') {
        await updateBrandingMutation.mutateAsync({ [fieldName]: res.secure_url });
        setFormData(prev => ({ ...prev, [fieldName]: res.secure_url }));
      } else {
        await updateLoginMutation.mutateAsync({ [fieldName]: res.secure_url });
        setLoginFormData(prev => ({ ...prev, [fieldName]: res.secure_url }));
      }
      
      toast.success(`${type} updated successfully`);
    } catch (error: any) {
      toast.error(`Error uploading ${type}: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const { logo_url, logo_url_2, logo_url_3, ...rest } = formData;
      await updateBrandingMutation.mutateAsync(rest);
      await updateLoginMutation.mutateAsync(loginFormData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (brandingLoading || loginLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const brandingData = {
    ...branding,
    ...formData
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Branding Settings</h2>
          <p className="text-muted-foreground">Manage logos, colors, and login page appearance.</p>
        </div>
        <Button onClick={handleSave} disabled={isSubmitting} className="gap-2">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save All Changes
        </Button>
      </div>

      <div className="grid gap-6">
        <Card className="border backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-md">
                <Upload className="h-4 w-4 text-primary" />
              </div>
              Organization Logos
            </CardTitle>
            <CardDescription>Official seals used across the platform and login page</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-8 md:grid-cols-3">
              {[
                { label: 'Nigerian Coat of Arms', field: 'logo_url', url: brandingData?.logo_url, badge: 'Seal 1' },
                { label: 'Kogi State Logo', field: 'logo_url_2', url: (brandingData as any)?.logo_url_2, badge: 'Seal 2' },
                { label: 'GDU Logo', field: 'logo_url_3', url: (brandingData as any)?.logo_url_3, badge: 'Seal 3' },
              ].map((logo, idx) => (
                <div key={logo.field} className="space-y-4">
                  <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {logo.label}
                    <Badge variant="secondary" className="text-[9px] h-3.5 px-1.5">{logo.badge}</Badge>
                  </Label>
                  <div className="flex flex-col gap-4">
                    <div className="aspect-square w-full max-w-[160px] mx-auto rounded-full border-4 border-muted bg-white flex items-center justify-center p-6 shadow-inner group relative overflow-hidden">
                      <img 
                        src={logo.url || "/logo.png"} 
                        alt={logo.label} 
                        className="max-h-full max-w-full object-contain transition-transform group-hover:scale-110 duration-500" 
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Label 
                          htmlFor={`logo-upload-${idx}`} 
                          className="text-white text-[10px] font-bold cursor-pointer flex items-center gap-1.5 bg-primary/80 px-3 py-1.5 rounded-full hover:bg-primary transition-colors"
                        >
                          <Upload className="h-3 w-3" />
                          Change
                        </Label>
                      </div>
                    </div>
                    <input 
                      id={`logo-upload-${idx}`} 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFileUpload(e, logo.label, 'branding', logo.field)} 
                    />
                    <p className="text-[10px] text-center text-muted-foreground">Recommended: Transparent PNG, 512x512px</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border">
            <CardHeader>
              <CardTitle className="text-lg">Login Page Management</CardTitle>
              <CardDescription>Customize the entrance to your portal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Login Title</Label>
                <Input 
                  value={loginFormData.title} 
                  onChange={(e) => setLoginFormData({ ...loginFormData, title: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Login Subtitle</Label>
                <Input 
                  value={loginFormData.subtitle} 
                  onChange={(e) => setLoginFormData({ ...loginFormData, subtitle: e.target.value })} 
                />
              </div>
              <div className="space-y-4 pt-2">
                <Label>Background Image</Label>
                <div className="relative aspect-video w-full rounded-lg border bg-muted overflow-hidden group">
                  {loginFormData.login_bg_url ? (
                    <img src={loginFormData.login_bg_url} alt="Login Background" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <p className="text-xs text-muted-foreground">No background image set</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Label 
                      htmlFor="login-bg-upload" 
                      className="text-white text-xs font-bold cursor-pointer flex items-center gap-2 bg-primary/80 px-4 py-2 rounded-full"
                    >
                      <Upload className="h-4 w-4" />
                      Upload New Background
                    </Label>
                  </div>
                  <input 
                    id="login-bg-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleFileUpload(e, 'Login Background', 'login', 'login_bg_url')} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardHeader>
              <CardTitle className="text-lg">Platform Branding</CardTitle>
              <CardDescription>Colors and identity settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Portal Name</Label>
                <Input 
                  value={formData.portal_name} 
                  onChange={(e) => setFormData({ ...formData, portal_name: e.target.value })} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color" 
                      className="w-12 p-1 h-10" 
                      value={formData.primary_color} 
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })} 
                    />
                    <Input 
                      value={formData.primary_color} 
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color" 
                      className="w-12 p-1 h-10" 
                      value={formData.secondary_color} 
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })} 
                    />
                    <Input 
                      value={formData.secondary_color} 
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })} 
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Footer Copyright Text</Label>
                <Input 
                  value={formData.footer_text} 
                  onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })} 
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
