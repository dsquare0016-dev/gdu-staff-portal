import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Globe, Clock, CheckCircle, Download, Upload, Save } from 'lucide-react';

export const Route = createFileRoute('/dashboard/settings/general')({
  component: GeneralSettings,
});

function GeneralSettings() {
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
              <Input id="orgName" defaultValue="Government Delivery Unit (GDU)" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgCode">Organization Code</Label>
              <Input id="orgCode" defaultValue="GDU-KOGI" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" defaultValue="Kogi State Government" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">System Description</Label>
            <Input id="description" defaultValue="AI-Powered Staff Management & Workforce Intelligence Portal" />
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
            <Switch />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Session Timeout</p>
                <p className="text-xs text-muted-foreground">
                  Auto-logout after period of inactivity
                </p>
              </div>
            </div>
            <Input type="number" defaultValue="30" className="w-20" />
          </div>
        </CardContent>
      </Card>

      <Card className="border backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
          <CardDescription>Manage database backups</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Last Backup</p>
                <p className="text-xs text-muted-foreground">
                  May 30, 2026 at 02:00 AM
                </p>
              </div>
            </div>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
          <div className="flex gap-3">
            <Button className="flex-1">
              <Upload className="mr-2 h-4 w-4" />
              Create Backup Now
            </Button>
            <Button variant="outline" className="flex-1">
              <Upload className="mr-2 h-4 w-4" />
              Restore from Backup
            </Button>
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
