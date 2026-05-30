import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Shield,
  Palette,
  ScanFace,
  Users,
  History,
  Download,
  Save,
  Upload,
  Eye,
  Bell,
  Lock,
  Globe,
  Key,
  Smartphone,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export const Route = createFileRoute('/dashboard/settings')({
  head: () => ({
    meta: [{ title: 'System Settings — GDU Portal' }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { isSuperAdmin } = useAuth();

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground mt-2">
              You do not have permission to access system settings.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage system configuration, security, and branding
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-fit">
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="login" className="gap-2">
              <ScanFace className="h-4 w-4" />
              Login Page
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
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

            <Card className="border backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Recent Security Events</CardTitle>
                <CardDescription>System security log</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm">Admin login successful</p>
                        <p className="text-xs text-muted-foreground">192.168.1.100 • 10 minutes ago</p>
                      </div>
                    </div>
                    <Badge variant="outline">Success</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <div>
                        <p className="text-sm">Failed login attempt</p>
                        <p className="text-xs text-muted-foreground">192.168.1.105 • 1 hour ago</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600">Warning</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm">Password changed</p>
                        <p className="text-xs text-muted-foreground">user@gdu.gov.ng • 3 hours ago</p>
                      </div>
                    </div>
                    <Badge variant="outline">Success</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <Card className="border backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Logo & Branding</CardTitle>
                <CardDescription>Upload organization logos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Main Logo</Label>
                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click or drag to upload (PNG, JPG, SVG)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Recommended: 200x60px</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Favicon</Label>
                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click or drag to upload (ICO, PNG)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Recommended: 32x32px</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Color Scheme</CardTitle>
                <CardDescription>Customize portal colors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" defaultValue="#1a365d" className="w-12 h-10 p-1" />
                      <Input defaultValue="#1a365d" className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" defaultValue="#c9a227" className="w-12 h-10 p-1" />
                      <Input defaultValue="#c9a227" className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" defaultValue="#2c5282" className="w-12 h-10 p-1" />
                      <Input defaultValue="#2c5282" className="flex-1" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="login" className="space-y-4">
            <Card className="border backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Login Page Settings</CardTitle>
                <CardDescription>Customize the login page appearance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Login Page Title</Label>
                  <Input defaultValue="GDU Admin Portal | Kogi State Government" />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input defaultValue="Sign in to manage workforce operations" />
                </div>
                <div className="space-y-2">
                  <Label>Background Image</Label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click or drag to upload background image
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Recommended: 1920x1080px</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Eye className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Show Organization Seals</p>
                      <p className="text-xs text-muted-foreground">Display government seals on login</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card className="border backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>Configure system email notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">New Staff Registration</p>
                    <p className="text-xs text-muted-foreground">Email admin when new staff is registered</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Payroll Processing</p>
                    <p className="text-xs text-muted-foreground">Email staff when payroll is processed</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Leave Request Updates</p>
                    <p className="text-xs text-muted-foreground">Email staff about leave status changes</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Security Alerts</p>
                    <p className="text-xs text-muted-foreground">Email admin about security events</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button size="lg">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}