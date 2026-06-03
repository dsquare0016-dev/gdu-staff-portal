import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Lock, Bell, Shield, Save, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/dashboard/settings/')({
  component: AccountSettings,
});

function AccountSettings() {
  const { profile, refreshProfile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = () => {
    toast.success('Account settings updated successfully');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    try {
      setIsUploading(true);
      const res = await uploadToCloudinary(file, 'avatars');

      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: res.secure_url })
        .eq('id', profile.id);

      if (error) throw error;

      // Update staff record too
      await supabase
        .from('staff_records')
        .update({ passport_url: res.secure_url })
        .eq('user_id', profile.id);

      toast.success('Profile picture updated successfully');
      if (refreshProfile) refreshProfile();
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <Card className="border backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Update your personal details and contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6 pb-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 overflow-hidden group">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-primary/40" />
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <Label 
                htmlFor="avatar-upload" 
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full shadow-md border border-background bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors"
              >
                {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                <input 
                  id="avatar-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
              </Label>
            </div>
            <div>
              <p className="text-sm font-medium">Profile Picture</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG or GIF. Max 2MB.</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" asChild disabled={isUploading}>
                  <label htmlFor="avatar-upload" className="cursor-pointer">
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </label>
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={isUploading}>Remove</Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" defaultValue={profile.full_name || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" defaultValue={profile.email} disabled />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" className="pl-10" defaultValue={profile.phone || ''} placeholder="+234..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Account Role</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="role" className="pl-10 capitalize" defaultValue={profile.role.replace('_', ' ')} disabled />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Update your password and security preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPass">Current Password</Label>
            <Input id="currentPass" type="password" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="newPass">New Password</Label>
              <Input id="newPass" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPass">Confirm Password</Label>
              <Input id="confirmPass" type="password" />
            </div>
          </div>
          <Button variant="outline">Change Password</Button>
        </CardContent>
      </Card>

      <Card className="border backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Choose how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Receive updates about your account via email</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Security Alerts</p>
                <p className="text-xs text-muted-foreground">Get notified about unusual login activity</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Account Changes
        </Button>
      </div>
    </div>
  );
}
