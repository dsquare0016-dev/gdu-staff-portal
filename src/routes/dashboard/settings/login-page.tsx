import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Upload, Eye, Save } from 'lucide-react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/dashboard/settings/login-page')({
  component: LoginPageSettings,
});

function LoginPageSettings() {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    show_home_btn: true,
  });

  const { data: settings, isLoading } = useQuery({
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

  useEffect(() => {
    if (settings) {
      setFormData({
        title: settings.title || '',
        subtitle: settings.subtitle || '',
        show_home_btn: settings.show_home_btn ?? true,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('login_page_settings')
        .update(updates)
        .eq('id', settings?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['login-page-settings'] });
      toast.success('Login settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + error.message);
    },
  });

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync(formData);
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
          <CardTitle>Login Page Settings</CardTitle>
          <CardDescription>Customize the login page appearance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Login Page Title</Label>
            <Input 
              value={formData.title} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="GDU Admin Portal | Kogi State Government" 
            />
          </div>
          <div className="space-y-2">
            <Label>Subtitle</Label>
            <Input 
              value={formData.subtitle} 
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder="Sign in to manage workforce operations" 
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Show Home Button</p>
                <p className="text-xs text-muted-foreground">Display a "Home Page" button on the login form</p>
              </div>
            </div>
            <Switch 
              checked={formData.show_home_btn} 
              onCheckedChange={(v) => setFormData({ ...formData, show_home_btn: v })} 
            />
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
