import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadToCloudinary } from '@/lib/cloudinary';

export const Route = createFileRoute('/dashboard/settings/branding')({
  component: BrandingSettings,
});

function BrandingSettings() {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: branding, isLoading } = useQuery({
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
      toast.success('Branding settings updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update branding: ' + error.message);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string, fieldName: string = 'logo_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSubmitting(true);
      
      // Upload to Cloudinary
      const res = await uploadToCloudinary(file, 'branding');

      // Update database
      await updateBrandingMutation.mutateAsync({ [fieldName]: res.secure_url });
      
      toast.success(`${type} uploaded and updated successfully`);
    } catch (error: any) {
      toast.error(`Error uploading ${type}: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      // Remove URLs from formData to avoid overwriting with old ones if upload just happened
      const { logo_url, logo_url_2, logo_url_3, ...rest } = formData;
      await updateBrandingMutation.mutateAsync(rest);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Organization Logos</CardTitle>
          <CardDescription>Manage the three seals displayed on the login page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Primary Logo (GDU) */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                Primary Logo (GDU)
                <Badge variant="secondary" className="text-[10px] h-4">System Wide</Badge>
              </Label>
              <div className="flex flex-col gap-3">
                <div className="h-32 w-full rounded-lg border bg-white flex items-center justify-center p-4 overflow-hidden">
                  <img src={branding?.logo_url || "/logo.png"} alt="Primary Logo" className="h-full w-full object-contain" />
                </div>
                <Label 
                  htmlFor="logo-upload-1" 
                  className="border-2 border-dashed rounded-lg p-2 text-center hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center gap-1"
                >
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">Change Primary Logo</p>
                  <input 
                    id="logo-upload-1" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    disabled={isSubmitting}
                    onChange={(e) => handleFileUpload(e, 'Primary Logo', 'logo_url')} 
                  />
                </Label>
              </div>
            </div>

            {/* Logo 2 (Kogi State Seal) */}
            <div className="space-y-4">
              <Label>Secondary Logo (State Seal)</Label>
              <div className="flex flex-col gap-3">
                <div className="h-32 w-full rounded-lg border bg-white flex items-center justify-center p-4 overflow-hidden">
                  <img src={(branding as any)?.logo_url_2 || "/logo.png"} alt="Secondary Logo" className="h-full w-full object-contain opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all" />
                </div>
                <Label 
                  htmlFor="logo-upload-2" 
                  className="border-2 border-dashed rounded-lg p-2 text-center hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center gap-1"
                >
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">Change Secondary Logo</p>
                  <input 
                    id="logo-upload-2" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    disabled={isSubmitting}
                    onChange={(e) => handleFileUpload(e, 'Secondary Logo', 'logo_url_2')} 
                  />
                </Label>
              </div>
            </div>

            {/* Logo 3 (Other Seal) */}
            <div className="space-y-4">
              <Label>Tertiary Logo (Additional Seal)</Label>
              <div className="flex flex-col gap-3">
                <div className="h-32 w-full rounded-lg border bg-white flex items-center justify-center p-4 overflow-hidden">
                  <img src={(branding as any)?.logo_url_3 || "/logo.png"} alt="Tertiary Logo" className="h-full w-full object-contain opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all" />
                </div>
                <Label 
                  htmlFor="logo-upload-3" 
                  className="border-2 border-dashed rounded-lg p-2 text-center hover:border-primary/50 transition-colors cursor-pointer flex flex-col items-center gap-1"
                >
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">Change Tertiary Logo</p>
                  <input 
                    id="logo-upload-3" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    disabled={isSubmitting}
                    onChange={(e) => handleFileUpload(e, 'Tertiary Logo', 'logo_url_3')} 
                  />
                </Label>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <Label>Portal Name</Label>
            <Input 
              value={formData.portal_name}
              onChange={(e) => setFormData({ ...formData, portal_name: e.target.value })}
              placeholder="GDU Staff Portal"
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Color Scheme</CardTitle>
          <CardDescription>Customize portal colors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input 
                  type="color" 
                  value={formData.primary_color.startsWith('#') ? formData.primary_color : '#1a365d'} 
                  className="w-12 h-10 p-1" 
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                />
                <Input 
                  value={formData.primary_color} 
                  className="flex-1" 
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="flex gap-2">
                <Input 
                  type="color" 
                  value={formData.secondary_color.startsWith('#') ? formData.secondary_color : '#c9a227'} 
                  className="w-12 h-10 p-1" 
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                />
                <Input 
                  value={formData.secondary_color} 
                  className="flex-1" 
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Hero Section Content</CardTitle>
          <CardDescription>Customize the login page hero text</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Hero Title</Label>
              <Input 
                value={formData.hero_title}
                onChange={(e) => setFormData({ ...formData, hero_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Hero Subtitle</Label>
              <Input 
                value={formData.hero_subtitle}
                onChange={(e) => setFormData({ ...formData, hero_subtitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Hero Tagline</Label>
              <Input 
                value={formData.hero_tagline}
                onChange={(e) => setFormData({ ...formData, hero_tagline: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Footer Text</Label>
              <Input 
                value={formData.footer_text}
                onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
