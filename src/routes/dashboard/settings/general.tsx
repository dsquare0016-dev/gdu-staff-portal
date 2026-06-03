import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Globe, Clock, CheckCircle, Download, Upload, Save, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleDatabaseError, handlePortalNotification } from '@/lib/error-handler';
import { useState, useEffect } from 'react';

export const Route = createFileRoute('/dashboard/settings/general')({
  component: GeneralSettings,
});

function GeneralSettings() {
  const { isSuperAdmin, isICT } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState({
    org_name: '',
    org_code: '',
    tagline: '',
    description: '',
    maintenance_mode: false,
    session_timeout: 30,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        org_name: settings.org_name || '',
        org_code: settings.org_code || '',
        tagline: settings.tagline || '',
        description: settings.description || '',
        maintenance_mode: settings.maintenance_mode || false,
        session_timeout: settings.session_timeout || 30,
      });
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ id: settings?.id || undefined, ...updates });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      handlePortalNotification('System settings updated successfully', { severity: 'success' });
    },
    onError: (error: any) => handleDatabaseError(error, 'update settings')
  });

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateSettingsMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSuperAdmin && !isICT) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground">Only Super Admin or ICT can manage general system settings.</p>
      </div>
    );
  }

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
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Basic system configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input 
                id="orgName" 
                value={formData.org_name} 
                onChange={(e) => setFormData({ ...formData, org_name: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgCode">Organization Code</Label>
              <Input 
                id="orgCode" 
                value={formData.org_code} 
                onChange={(e) => setFormData({ ...formData, org_code: e.target.value })} 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input 
              id="tagline" 
              value={formData.tagline} 
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">System Description</Label>
            <Input 
              id="description" 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">
                  Temporarily disable portal access for all users
                </p>
              </div>
            </div>
            <Switch 
              checked={formData.maintenance_mode} 
              onCheckedChange={(checked) => setFormData({ ...formData, maintenance_mode: checked })} 
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Session Timeout (minutes)</p>
                <p className="text-xs text-muted-foreground">
                  Auto-logout after period of inactivity
                </p>
              </div>
            </div>
            <Input 
              type="number" 
              value={formData.session_timeout} 
              onChange={(e) => setFormData({ ...formData, session_timeout: parseInt(e.target.value) })} 
              className="w-20" 
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
