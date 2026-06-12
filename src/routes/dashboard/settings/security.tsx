import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  Key, 
  Smartphone, 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Save, 
  Users, 
  RefreshCcw, 
  Mail, 
  Search,
  Loader2,
  MoreVertical,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export const Route = createFileRoute('/dashboard/settings/security')({
  component: SecuritySettings,
});

function SecuritySettings() {
  const { isSuperAdmin, isICT, profile: currentProfile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Policy states
  const [policies, setPolicyState] = useState({
    min_password_length: '8',
    password_expiry_days: '90',
    require_2fa: false
  });
  const [isSavingPolicies, setIsSavingPolicies] = useState(false);

  useEffect(() => {
    if (isSuperAdmin || isICT) {
      fetchUsers();
      fetchPolicies();
    }
  }, [isSuperAdmin, isICT]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch users: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('security_settings')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setPolicyState({
          min_password_length: data.min_password_length.toString(),
          password_expiry_days: data.password_expiry_days.toString(),
          require_2fa: data.require_2fa
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch policies:', error);
    }
  };

  const handleUpdatePolicies = async () => {
    setIsSavingPolicies(true);
    try {
      // First try to find existing row
      const { data: existing } = await supabase.from('security_settings').select('id').maybeSingle();

      const payload = {
        min_password_length: parseInt(policies.min_password_length),
        password_expiry_days: parseInt(policies.password_expiry_days),
        require_2fa: policies.require_2fa,
        updated_at: new Date().toISOString(),
        updated_by: currentProfile?.id
      };

      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from('security_settings')
          .update(payload)
          .eq('id', existing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('security_settings')
          .insert(payload);
        error = insertError;
      }
      
      if (error) throw error;

      toast.success('Security policies updated successfully');
      await fetchPolicies();
    } catch (error: any) {
      toast.error('Failed to update policies: ' + error.message);
    } finally {
      setIsSavingPolicies(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleResetToDefault = async (userId: string) => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'reset-password', userId, password: 'GDU@123' }
      });

      if (error) throw error;
      
      toast.success('Password reset to GDU@123 successfully!');
      setIsResetDialogOpen(false);
    } catch (error: any) {
      console.error('Reset error:', error);
      toast.error('Failed to reset password: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < parseInt(policies.min_password_length)) {
      toast.error(`Password must be at least ${policies.min_password_length} characters`);
      return;
    }

    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'reset-password', userId: selectedUser.id, password: newPassword }
      });

      if (error) throw error;
      
      toast.success(`Password updated for ${selectedUser.full_name}`);
      setIsPasswordDialogOpen(false);
      setNewPassword('');
    } catch (error: any) {
      toast.error('Failed to change password: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendRecoveryEmail = async (email: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'send-recovery', email }
      });

      if (error) throw error;
      toast.success('Password recovery email sent!');
    } catch (error: any) {
      toast.error('Failed to send email: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground">Only Super Admin can manage security settings and user passwords.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* User Management Section */}
          <Card className="border shadow-lg rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-900 text-white border-b-0 pb-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    User Password Control
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Manage user passwords and security access
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                  {users.length} Users Total
                </Badge>
              </div>
              
              <div className="mt-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search by name or email..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 rounded-xl h-12 focus:ring-primary focus:border-primary"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Loading directory...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                    <Users className="h-12 w-12 text-slate-200 mb-4" />
                    <p className="font-bold text-slate-500">No users found</p>
                    <p className="text-sm text-slate-400">Try adjusting your search criteria</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                            <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">
                              {user.full_name?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-black text-slate-900">{user.full_name || 'Unnamed User'}</p>
                            <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                            <Badge variant="outline" className="mt-1 text-[10px] h-4 font-black uppercase tracking-tighter">
                              {user.role}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {user.id !== currentProfile?.id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 rounded-xl border-2 p-1">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="rounded-lg gap-2 font-bold cursor-pointer"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsPasswordDialogOpen(true);
                                  }}
                                >
                                  <Key className="h-4 w-4 text-blue-500" />
                                  Change Password
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="rounded-lg gap-2 font-bold cursor-pointer"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsResetDialogOpen(true);
                                  }}
                                >
                                  <RefreshCcw className="h-4 w-4 text-amber-500" />
                                  Reset to Default
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="rounded-lg gap-2 font-bold cursor-pointer"
                                  onClick={() => handleSendRecoveryEmail(user.email)}
                                >
                                  <Mail className="h-4 w-4 text-primary" />
                                  Send Recovery Email
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="rounded-lg gap-2 font-bold text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700">
                                  <ShieldAlert className="h-4 w-4" />
                                  Restrict Access
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t p-4 justify-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Governance Delivery Unit — Security Protocol
              </p>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border shadow-lg rounded-3xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Security Policies</CardTitle>
              <CardDescription>Global authentication rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold">Min Password Length</Label>
                  <Input 
                    type="number" 
                    value={policies.min_password_length} 
                    onChange={(e) => setPolicyState({ ...policies, min_password_length: e.target.value })}
                    className="w-16 h-8 rounded-lg" 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold">Password Expiry (Days)</Label>
                  <Input 
                    type="number" 
                    value={policies.password_expiry_days} 
                    onChange={(e) => setPolicyState({ ...policies, password_expiry_days: e.target.value })}
                    className="w-16 h-8 rounded-lg" 
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Label className="text-sm font-bold">Require 2FA</Label>
                  <Switch 
                    checked={policies.require_2fa}
                    onCheckedChange={(checked) => setPolicyState({ ...policies, require_2fa: checked })}
                  />
                </div>
              </div>
              <Button 
                className="w-full rounded-xl h-11 font-bold shadow-lg" 
                size="sm"
                onClick={handleUpdatePolicies}
                disabled={isSavingPolicies}
              >
                {isSavingPolicies ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Update Policies
              </Button>
            </CardContent>
          </Card>

          <Card className="border shadow-lg rounded-3xl overflow-hidden bg-amber-50 border-amber-100">
            <CardHeader>
              <CardTitle className="text-lg text-amber-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Admin Notice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                Resetting a user's password to the default (<span className="font-bold underline">GDU@123</span>) should only be done upon verification of the staff member's identity. 
                The user will be prompted to change their password upon their next successful login.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="rounded-3xl border-2">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase italic tracking-tight">Confirm Password Reset</DialogTitle>
            <DialogDescription className="font-medium">
              You are about to reset the password for <span className="text-primary font-bold">{selectedUser?.full_name}</span> to the default <span className="font-bold underline">GDU@123</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-800 text-xs">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="font-medium">
              This action will take effect immediately. The user will be able to log in using the default password and should be advised to change it immediately.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)} className="rounded-xl h-12 font-bold">
              Cancel
            </Button>
            <Button 
              onClick={() => handleResetToDefault(selectedUser?.id)} 
              disabled={isUpdating}
              className="rounded-xl h-12 font-bold bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200"
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
              Confirm Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="rounded-3xl border-2">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase italic tracking-tight">Change User Password</DialogTitle>
            <DialogDescription className="font-medium">
              Set a custom password for <span className="text-primary font-bold">{selectedUser?.full_name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input 
                id="new-password"
                type="text" 
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-xl h-12"
              />
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Min length: {policies.min_password_length} characters.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} className="rounded-xl h-12 font-bold">
              Cancel
            </Button>
            <Button 
              onClick={handleChangePassword} 
              disabled={isUpdating || !newPassword}
              className="rounded-xl h-12 font-bold shadow-lg shadow-primary/20"
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
