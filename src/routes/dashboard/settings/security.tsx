import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Lock, Key, Smartphone, Shield, Clock, AlertTriangle, CheckCircle, Save } from 'lucide-react';

export const Route = createFileRoute('/dashboard/settings/security')({
  component: SecuritySettings,
});

function SecuritySettings() {
  return (
    <div className="space-y-4">
      <Card className="border backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Password Policy</CardTitle>
          <CardDescription>Configure password requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Minimum Password Length</p>
                <p className="text-xs text-muted-foreground">Require strong passwords</p>
              </div>
            </div>
            <Input type="number" defaultValue="8" className="w-20" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Password Expiry</p>
                <p className="text-xs text-muted-foreground">Days until password must be changed</p>
              </div>
            </div>
            <Input type="number" defaultValue="90" className="w-20" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Prevent Reuse</p>
                <p className="text-xs text-muted-foreground">Number of previous passwords to remember</p>
              </div>
            </div>
            <Input type="number" defaultValue="5" className="w-20" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground">Require 2FA for all users</p>
              </div>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <Card className="border backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Login Security</CardTitle>
          <CardDescription>Login attempt settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Max Login Attempts</p>
                <p className="text-xs text-muted-foreground">Lock account after failed attempts</p>
              </div>
            </div>
            <Input type="number" defaultValue="5" className="w-20" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Lockout Duration</p>
                <p className="text-xs text-muted-foreground">Minutes to lockout</p>
              </div>
            </div>
            <Input type="number" defaultValue="30" className="w-20" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button size="lg">
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
