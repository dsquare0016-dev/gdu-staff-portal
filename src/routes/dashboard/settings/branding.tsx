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
    queryKey: ['portal-branding-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_branding_settings')
        .select('*')
        .eq('id', 1)
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
    login_title: '',
    login_subtitle: '',
    logo_url: '',
    favicon_url: '',
    login_background_url: '',
  });

  useEffect(() => {
    if (branding) {
      setFormData({
        portal_name: branding.portal_name || '',
        primary_color: branding.primary_color || '',
        secondary_color: branding.secondary_color || '',
        footer_text: branding.footer_text || '',
        login_title: branding.login_title || '',
        login_subtitle: branding.login_subtitle || '',
        logo_url: branding.logo_url || '',
        favicon_url: branding.favicon_url || '',
        login_background_url: branding.login_background_url || '',
      });
    }
  }, [branding]);

  const updateBrandingMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('portal_branding_settings')
        .update(updates)
        .eq('id', 1);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-branding-settings'] });
      toast.success('Branding settings updated');
    },
    onError: (error: any) => {
      toast.error(`Error updating branding: ${error.message}`);
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSubmitting(true);
      
      const fileExt = file.name.split('.').pop();
      const filePath = `branding/${fieldName}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('portal-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('portal-assets')
        .getPublicUrl(filePath);

      await updateBrandingMutation.mutateAsync({ [fieldName]: publicUrl });
      setFormData(prev => ({ ...prev, [fieldName]: publicUrl }));
      
      toast.success(`${fieldName.replace('_', ' ')} updated successfully`);
    } catch (error: any) {
      toast.error(`Error uploading image: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateBrandingMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (brandingLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Portal Branding</h2>
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
              Organization Assets
            </CardTitle>
            <CardDescription>Logos and favicon used across the platform</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Portal Logo
                  <Badge variant="secondary" className="text-[9px] h-3.5 px-1.5">Primary</Badge>
                </Label>
                <div className="flex flex-col gap-4">
                  <div className="aspect-square w-full max-w-[160px] mx-auto rounded-lg border bg-white flex items-center justify-center p-6 shadow-inner group relative overflow-hidden">
                    <img 
                      src={formData.logo_url || "/logo.png"} 
                      alt="Logo" 
                      className="max-h-full max-w-full object-contain" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Label 
                        htmlFor="logo-upload" 
                        className="text-white text-[10px] font-bold cursor-pointer flex items-center gap-1.5 bg-primary/80 px-3 py-1.5 rounded-full hover:bg-primary"
                      >
                        <Upload className="h-3 w-3" />
                        Change
                      </Label>
                    </div>
                  </div>
                  <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'logo_url')} />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Favicon
                  <Badge variant="secondary" className="text-[9px] h-3.5 px-1.5">Icon</Badge>
                </Label>
                <div className="flex flex-col gap-4">
                  <div className="aspect-square w-full max-w-[80px] mx-auto rounded-lg border bg-white flex items-center justify-center p-2 shadow-inner group relative overflow-hidden">
                    <img 
                      src={formData.favicon_url || "/favicon.ico"} 
                      alt="Favicon" 
                      className="max-h-full max-w-full object-contain" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Label 
                        htmlFor="favicon-upload" 
                        className="text-white text-[10px] font-bold cursor-pointer bg-primary/80 p-1.5 rounded-full"
                      >
                        <Upload className="h-3 w-3" />
                      </Label>
                    </div>
                  </div>
                  <input id="favicon-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'favicon_url')} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border">
            <CardHeader>
              <CardTitle className="text-lg">Login Page</CardTitle>
              <CardDescription>Customize the entrance to your portal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Login Title</Label>
                <Input 
                  value={formData.login_title} 
                  onChange={(e) => setFormData({ ...formData, login_title: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Login Subtitle</Label>
                <Input 
                  value={formData.login_subtitle} 
                  onChange={(e) => setFormData({ ...formData, login_subtitle: e.target.value })} 
                />
              </div>
              <div className="space-y-4 pt-2">
                <Label>Background Image</Label>
                <div className="relative aspect-video w-full rounded-lg border bg-muted overflow-hidden group">
                  {formData.login_background_url ? (
                    <img src={formData.login_background_url} alt="Login Background" className="h-full w-full object-cover" />
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
                      Upload New
                    </Label>
                  </div>
                  <input id="login-bg-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'login_background_url')} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border">
            <CardHeader>
              <CardTitle className="text-lg">Portal Theme</CardTitle>
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
                <Label>Footer Text</Label>
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
