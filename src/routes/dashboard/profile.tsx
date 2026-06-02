import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Shield,
  Save,
  Camera,
  MapPin,
  FileText,
  Clock,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const Route = createFileRoute('/dashboard/profile')({
  head: () => ({
    meta: [{ title: 'My Profile — GDU Portal' }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, signOut } = useAuth();

  const handleSave = () => {
    toast.success('Profile updated successfully');
  };

  if (!profile) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-2xl font-bold">
                  {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-lg border-2 border-background"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{profile.full_name || 'User'}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="capitalize">
                  <Shield className="h-3 w-3 mr-1" />
                  {profile.role.replace('_', ' ')}
                </Badge>
                <span className="text-muted-foreground text-sm flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last seen: {profile.last_seen ? new Date(profile.last_seen).toLocaleDateString() : 'Today'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => signOut()} className="text-destructive hover:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general" className="gap-2">
              <User className="h-4 w-4" />
              General Info
            </TabsTrigger>
            <TabsTrigger value="employment" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Employment
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Personal Details</CardTitle>
                  <CardDescription>Your basic information and contact details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input id="fullName" defaultValue={profile.full_name || ''} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" defaultValue={profile.email} disabled />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="phone" className="pl-10" defaultValue={profile.phone || ''} placeholder="+234..." />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">State/LGA</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="location" className="pl-10" placeholder="Kogi State" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Account Security</CardTitle>
                  <CardDescription>Manage your password and security settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPass">Current Password</Label>
                    <Input id="currentPass" type="password" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="newPass">New Password</Label>
                      <Input id="newPass" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPass">Confirm Password</Label>
                      <Input id="confirmPass" type="password" />
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">Change Password</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employment" className="space-y-4">
            <Card className="border backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Work Information</CardTitle>
                <CardDescription>Details about your position and department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Department</span>
                    </div>
                    <p className="text-lg font-semibold">Administration</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span className="text-sm font-medium">Position</span>
                    </div>
                    <p className="text-lg font-semibold">Senior Officer</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">Date Joined</span>
                    </div>
                    <p className="text-lg font-semibold">March 15, 2019</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">Retirement Date</span>
                    </div>
                    <p className="text-lg font-semibold text-orange-600">March 15, 2054</p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Grade Level</span>
                    <p className="text-lg font-semibold">Level 10</p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Step</span>
                    <p className="text-lg font-semibold">Step 4</p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Status</span>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card className="border backdrop-blur-sm">
              <CardHeader>
                <CardTitle>My Documents</CardTitle>
                <CardDescription>View and manage your official government documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Appointment Letter.pdf', size: '1.2 MB', date: 'Mar 15, 2019' },
                    { name: 'Academic Certificate.pdf', size: '2.4 MB', date: 'Mar 15, 2019' },
                    { name: 'NIN Slip.jpg', size: '450 KB', date: 'Jan 10, 2024' },
                  ].map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary/60" />
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.size} • {doc.date}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full border-dashed">
                    <Camera className="mr-2 h-4 w-4" />
                    Upload New Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
