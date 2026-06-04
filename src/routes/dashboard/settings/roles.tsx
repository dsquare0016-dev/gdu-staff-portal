import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Edit2, Trash2, Plus, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

export const Route = createFileRoute('/dashboard/settings/roles')({
  component: RolesSettings,
});

function RolesSettings() {
  const { isSuperAdmin, isICT } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Fetch roles
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select(`
          *,
          role_permissions(
            permission_id,
            permissions(name)
          )
        `);
      if (error) throw error;
      return data;
    },
  });

  // Fetch all permissions
  const { data: allPermissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('permissions').select('*');
      if (error) throw error;
      return data;
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (role: any) => {
      const slug = role.name.toLowerCase().replace(/\s+/g, '_');
      const { data, error } = await supabase.from('roles').insert([{ ...role, slug }]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsCreateDialogOpen(false);
      setNewRole({ name: '', description: '' });
      toast.success('Role created successfully');
    },
    onError: (error) => {
      toast.error(`Error creating role: ${error.message}`);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role, permissions }: any) => {
      const slug = role.name.toLowerCase().replace(/\s+/g, '_');
      const { error: roleError } = await supabase.from('roles').update({ ...role, slug }).eq('id', id);
      if (roleError) throw roleError;

      // Update permissions
      await supabase.from('role_permissions').delete().eq('role_id', id);
      if (permissions.length > 0) {
        const { error: permError } = await supabase.from('role_permissions').insert(
          permissions.map((permId: string) => ({ role_id: id, permission_id: permId }))
        );
        if (permError) throw permError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsEditDialogOpen(false);
      toast.success('Role updated successfully');
    },
    onError: (error) => {
      toast.error(`Error updating role: ${error.message}`);
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('roles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted successfully');
    },
    onError: (error) => {
      toast.error(`Error deleting role: ${error.message}`);
    },
  });

  if (!isSuperAdmin && !isICT) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground">Only Super Admin or ICT can manage roles and permissions.</p>
      </div>
    );
  }

  const handleEdit = (role: any) => {
    setSelectedRole(role);
    setSelectedPermissions(role.role_permissions.map((rp: any) => rp.permission_id));
    setIsEditDialogOpen(true);
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Roles & Permissions</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>Add a new system role</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  placeholder="e.g. Supervisor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  placeholder="Role description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => createRoleMutation.mutate(newRole)}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border backdrop-blur-sm">
        <CardHeader>
          <CardTitle>System Roles</CardTitle>
          <CardDescription>Manage user roles and their associated permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {rolesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles?.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        {role.name}
                      </div>
                    </TableCell>
                    <TableCell>{role.description}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {role.role_permissions?.slice(0, 3).map((rp: any) => (
                          <Badge key={rp.permission_id} variant="secondary" className="text-[10px]">
                            {rp.permissions?.name}
                          </Badge>
                        ))}
                        {role.role_permissions?.length > 3 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{role.role_permissions.length - 3} more
                          </Badge>
                        )}
                        {(!role.role_permissions || role.role_permissions.length === 0) && (
                          <span className="text-xs text-muted-foreground italic">No permissions</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(role)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this role?')) {
                              deleteRoleMutation.mutate(role.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role: {selectedRole?.name}</DialogTitle>
            <DialogDescription>Update role details and permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Role Name</Label>
                <Input
                  id="edit-name"
                  value={selectedRole?.name || ''}
                  onChange={(e) => setSelectedRole({ ...selectedRole, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={selectedRole?.description || ''}
                  onChange={(e) => setSelectedRole({ ...selectedRole, description: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Assign Permissions</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border rounded-md p-4 bg-muted/30">
                {allPermissions?.map((perm) => (
                  <div key={perm.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`perm-${perm.id}`}
                      checked={selectedPermissions.includes(perm.id)}
                      onCheckedChange={() => togglePermission(perm.id)}
                    />
                    <label
                      htmlFor={`perm-${perm.id}`}
                      className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {perm.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                updateRoleMutation.mutate({
                  id: selectedRole.id,
                  role: { name: selectedRole.name, description: selectedRole.description },
                  permissions: selectedPermissions,
                })
              }
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
