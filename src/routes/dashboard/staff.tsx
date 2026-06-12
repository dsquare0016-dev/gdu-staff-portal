import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleDatabaseError, handlePortalNotification } from '@/lib/error-handler';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  Users,
  UserPlus,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Clock,
  Shield,
  CheckCircle,
  Loader2,
  FileText,
  ShieldAlert,
  Key,
  RefreshCcw,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';
import { exportToPDF, exportToExcel } from '@/lib/utils/export';
import { useBranding } from '@/lib/hooks/use-branding';
import { PortalLoader } from '@/components/ui/portal-loader';
import { format } from 'date-fns';

import { generateNextStaffId } from '@/lib/utils/staff-id';
import { sendWelcomeEmail } from '@/lib/utils/email-service';
import { generateSecurePassword } from '@/lib/utils/password-gen';

export const Route = createFileRoute('/dashboard/staff')({
  head: () => ({
    meta: [{ title: 'Staff Management — GDU Portal' }],
  }),
  component: StaffManagementPage,
});

const roles = ['All Roles', 'super_admin', 'admin', 'accounts', 'dg', 'technical_assistant', 'ict', 'staff', 'adhoc'];
const statuses = ['All Status', 'active', 'inactive', 'suspended', 'retired'];

function StaffManagementPage() {
  const { profile, canAccess, isSuperAdmin, isICT, isTechnicalAssistant, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');

  const canManageStaff = isSuperAdmin || isAdmin || isICT || isTechnicalAssistant;
  const updateStaffRoleMutation = useMutation({
    mutationFn: async ({ staffId, userId, newRole }: { staffId: string, userId: string | null, newRole: string }) => {
      // 1. Update staff_records
      const { error: staffError } = await supabase
        .from('staff_records')
        .update({ role: newRole })
        .eq('id', staffId);
      
      if (staffError) throw staffError;

      // 2. Update profiles if user_id exists
      if (userId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: newRole as any })
          .eq('id', userId);
        
        if (profileError) throw profileError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-records'] });
      handlePortalNotification('User role updated successfully', { severity: 'success' });
      setIsRoleDialogOpen(false);
    },
    onError: (error: any) => handleDatabaseError(error, 'update staff role'),
  });

  const [roleUpdateStaff, setRoleUpdateStaff] = useState<any>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedStaffDetails, setSelectedStaffDetails] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRoleUpdate = (staff: any, newRole: string) => {
    updateStaffRoleMutation.mutate({
      staffId: staff.id,
      userId: staff.user_id,
      newRole
    });
    setIsRoleDialogOpen(false);
  };

  const handleResetToDefault = async (staff: any) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'reset-password', userId: staff.user_id, password: 'GDU@123' }
      });

      if (error) throw error;
      
      toast.success('Password reset to GDU@123 successfully!');
      setIsResetDialogOpen(false);
    } catch (error: any) {
      toast.error('Failed to reset password: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.functions.invoke('admin-auth', {
        body: { action: 'reset-password', userId: selectedStaffDetails.user_id, password: newPassword }
      });

      if (error) throw error;
      
      toast.success(`Password updated for ${selectedStaffDetails.full_name}`);
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

  const toggleStaffStatus = async (staff: any) => {
    const newStatus = staff.status === 'active' ? 'inactive' : 'active';
    try {
      const { error: staffError } = await supabase
        .from('staff_records')
        .update({ status: newStatus })
        .eq('id', staff.id);
      
      if (staffError) throw staffError;

      if (staff.user_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_active: newStatus === 'active' })
          .eq('id', staff.user_id);
        
        if (profileError) throw profileError;
      }

      queryClient.invalidateQueries({ queryKey: ['staff-records'] });
      toast.success(`Staff ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
      toast.error('Failed to update status: ' + error.message);
    }
  };

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: dbDepartments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      if (error) {
        handleDatabaseError(error, 'fetch departments');
        return [];
      }
      return data;
    },
  });

  const departments = ['All Departments', ...(dbDepartments || []).map(d => d.name)];

  // Fetch staff from database
  const { data: staffRecordsRaw = [], isLoading } = useQuery({
    queryKey: ['staff-records-raw'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_records')
        .select('*')
        .order('full_name');
      if (error) {
        handleDatabaseError(error, 'fetch staff records');
        return [];
      }
      return data;
    },
  });

  // Manual merge of staff and departments
  const staffRecords = useMemo(() => {
    return (staffRecordsRaw || []).map(staff => ({
      ...staff,
      department: (dbDepartments || []).find(d => d.id === staff.department_id) || null
    }));
  }, [staffRecordsRaw, dbDepartments]);

  const deleteStaffMutation = useMutation({
    mutationFn: async (staff: any) => {
      // 1. Delete Auth User if user_id exists
      if (staff.user_id) {
        const { error: authError } = await supabase.functions.invoke('admin-auth', {
          body: { action: 'delete-user', userId: staff.user_id }
        });
        if (authError) {
          console.warn('[Staff] Auth user deletion failed:', authError.message);
          // Continue with record deletion even if auth deletion fails
        }
      }

      // 2. Delete staff record
      const { error } = await supabase
        .from('staff_records')
        .delete()
        .eq('id', staff.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-records'] });
      handlePortalNotification('Staff record deleted', { severity: 'success' });
    },
    onError: (error: any) => handleDatabaseError(error, 'delete staff record'),
  });

  const { data: branding } = useBranding();

  const handleExport = (formatType: 'pdf' | 'excel') => {
    const headers = ['Full Name', 'Staff ID', 'Email', 'Department', 'Role', 'Status', 'Level', 'Step'];
    const exportData = filteredStaff.map(staff => ({
      full_name: staff.full_name,
      staff_id: staff.readable_id || 'N/A',
      email: staff.email,
      department: typeof staff.department === 'object' ? staff.department?.name : (staff.department || 'N/A'),
      role: staff.role.toUpperCase(),
      status: staff.status.toUpperCase(),
      level: staff.grade_level?.toString() || 'N/A',
      step: staff.step?.toString() || 'N/A'
    }));

    if (formatType === 'pdf') {
      exportToPDF({
        data: exportData,
        filename: 'Staff_Records_Report',
        title: 'Staff Records Management Report',
        headers,
        generatedBy: profile?.full_name,
        branding
      });
    } else {
      exportToExcel({
        data: exportData,
        filename: 'Staff_Records_Report',
        title: 'Staff Records Management Report',
        branding
      });
    }
  };

  const availableRoles = isSuperAdmin 
    ? roles 
    : roles.filter(r => r !== 'super_admin');

  const filteredStaff = (staffRecords || []).filter((staff) => {
    const matchesSearch =
      (staff.full_name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (staff.email || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (staff.phone && staff.phone.includes(searchQuery));
    
    const staffDept = typeof staff.department === 'object' ? staff.department?.name : staff.department;
    const matchesDepartment =
      departmentFilter === 'All Departments' || staffDept === departmentFilter;
    
    const matchesRole = roleFilter === 'All Roles' || staff.role === roleFilter;
    const matchesStatus = statusFilter === 'All Status' || staff.status === statusFilter;
    
    // Hide super_admin from non-super admins
    if (!isSuperAdmin && staff.role === 'super_admin') return false;
    
    return matchesSearch && matchesDepartment && matchesRole && matchesStatus;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'accounts':
        return 'secondary';
      case 'dg':
        return 'outline';
      case 'technical_assistant':
        return 'default';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage all staff records, roles, and permissions
            </p>
          </div>
          {canManageStaff && (
            <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Upload
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-xl gap-2">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2 cursor-pointer">
                      <FileText className="h-4 w-4 text-red-500" />
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2 cursor-pointer">
                      <FileText className="h-4 w-4 text-green-500" />
                      Export as Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Staff
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Staff Member</DialogTitle>
                    <DialogDescription>
                      Fill in the staff details below to create a new staff record.
                    </DialogDescription>
                  </DialogHeader>
                  <StaffForm 
                    departments={dbDepartments} 
                    availableRoles={availableRoles}
                    onSuccess={() => {
                      setIsAddDialogOpen(false);
                      queryClient.invalidateQueries({ queryKey: ['staff-records'] });
                    }} 
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Staff</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card className="border backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role === 'All Roles' ? role : role.replace('_', ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status === 'All Status' ? status : status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <PortalLoader message="Loading staff records..." />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Grade Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Employment Date</TableHead>
                        <TableHead>Retirement Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={staff.passport_url || undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">
                                  {staff.full_name
                                    .split(' ')
                                    .map((n: string) => n[0])
                                    .join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{staff.full_name}</p>
                                <p className="text-xs text-muted-foreground">{staff.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {typeof staff.department === 'object' ? staff.department?.name : (staff.department || 'N/A')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(staff.role)}>
                              {staff.role.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              Level {staff.grade_level} / Step {staff.step}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={staff.status === 'active' ? 'default' : 'secondary'}
                              className={cn(
                                staff.status === 'active' && 'bg-green-500/10 text-green-600 border-green-500/20',
                                staff.status === 'inactive' && 'bg-gray-500/10 text-gray-600 border-gray-500/20'
                              )}
                            >
                              {staff.status.charAt(0).toUpperCase() + staff.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(staff.employment_date)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {staff.retirement_date ? formatDate(staff.retirement_date) : '—'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="cursor-pointer"
                                  onClick={() => {
                                    setSelectedStaffDetails(staff);
                                    setIsDetailsDialogOpen(true);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="cursor-pointer"
                                  onClick={() => {
                                    setSelectedStaffDetails(staff);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Staff
                                </DropdownMenuItem>
                                {isSuperAdmin && (
                                  <>
                                    <DropdownMenuItem 
                                      className="cursor-pointer"
                                      onClick={() => {
                                        setSelectedStaffDetails(staff);
                                        setIsPasswordDialogOpen(true);
                                      }}
                                    >
                                      <Key className="mr-2 h-4 w-4 text-blue-500" />
                                      Change Password
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="cursor-pointer"
                                      onClick={() => {
                                        setSelectedStaffDetails(staff);
                                        setIsResetDialogOpen(true);
                                      }}
                                    >
                                      <RefreshCcw className="mr-2 h-4 w-4 text-amber-500" />
                                      Reset to Default
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="cursor-pointer"
                                      onClick={() => handleSendRecoveryEmail(staff.email)}
                                    >
                                      <Mail className="mr-2 h-4 w-4 text-primary" />
                                      Send Recovery Email
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="cursor-pointer"
                                      onClick={() => toggleStaffStatus(staff)}
                                    >
                                      <ShieldAlert className={cn("mr-2 h-4 w-4", staff.status === 'active' ? "text-red-500" : "text-green-500")} />
                                      {staff.status === 'active' ? 'Deactivate User' : 'Activate User'}
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {canManageStaff && (
                                  <>
                                    {isSuperAdmin && (
                                      <DropdownMenuItem 
                                        className="cursor-pointer"
                                        onClick={() => {
                                          setRoleUpdateStaff(staff);
                                          setIsRoleDialogOpen(true);
                                        }}
                                      >
                                        <Shield className="mr-2 h-4 w-4" />
                                        Change Role
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem 
                                      className="cursor-pointer"
                                      onClick={() => window.location.href = `mailto:${staff.email}`}
                                    >
                                      <Mail className="mr-2 h-4 w-4" />
                                      Send Message
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive cursor-pointer"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete ${staff.full_name}?`)) {
                                      deleteStaffMutation.mutate(staff);
                                    }
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {!isLoading && filteredStaff.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No staff found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="active">
            <Card className="border backdrop-blur-sm p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Active Staff</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Showing {filteredStaff.filter((s) => s.status === 'active').length} active staff members
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="inactive">
            <Card className="border backdrop-blur-sm p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Inactive Staff</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Showing {filteredStaff.filter((s) => s.status === 'inactive').length} inactive staff members
              </p>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Role Change Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Change System Role</DialogTitle>
              <DialogDescription>
                Assign a new login role to {roleUpdateStaff?.full_name}. This affects their system permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select New Role</label>
                <div className="grid grid-cols-1 gap-2">
                  {availableRoles.filter(r => r !== 'All Roles').map((role) => (
                    <Button
                      key={role}
                      variant={roleUpdateStaff?.role === role ? "default" : "outline"}
                      className="justify-start h-12 gap-3"
                      onClick={() => handleRoleUpdate(roleUpdateStaff, role)}
                      disabled={updateStaffRoleMutation.isPending}
                    >
                      <Shield className={cn("h-4 w-4", roleUpdateStaff?.role === role ? "text-primary-foreground" : "text-primary")} />
                      <div className="text-left">
                        <p className="text-sm font-semibold uppercase">{role.replace('_', ' ')}</p>
                      </div>
                      {roleUpdateStaff?.role === role && <CheckCircle className="ml-auto h-4 w-4" />}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Staff Member — {selectedStaffDetails?.full_name}</DialogTitle>
              <DialogDescription>
                Update details for staff record #{selectedStaffDetails?.id.slice(0, 8)}
              </DialogDescription>
            </DialogHeader>
            {selectedStaffDetails && (
              <StaffForm 
                departments={dbDepartments} 
                availableRoles={availableRoles}
                initialData={selectedStaffDetails}
                isEditing={true}
                onSuccess={() => {
                  setIsEditDialogOpen(false);
                  queryClient.invalidateQueries({ queryKey: ['staff-records'] });
                }} 
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Reset Password Confirmation Dialog */}
        <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <DialogContent className="rounded-3xl border-2">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase italic tracking-tight">Confirm Password Reset</DialogTitle>
              <DialogDescription className="font-medium">
                You are about to reset the password for <span className="text-primary font-bold">{selectedStaffDetails?.full_name}</span> to the default <span className="font-bold underline">GDU@123</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-800 text-xs">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <p className="font-medium">
                This action will take effect immediately. The user will be able to log in using the default password and should be advised to change it immediately.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsResetDialogOpen(false)} className="rounded-xl h-12 font-bold">
                Cancel
              </Button>
              <Button 
                onClick={() => handleResetToDefault(selectedStaffDetails)} 
                disabled={isUpdating}
                className="rounded-xl h-12 font-bold bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200"
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                Confirm Reset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom Change Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="rounded-3xl border-2">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase italic tracking-tight">Change User Password</DialogTitle>
              <DialogDescription className="font-medium">
                Set a custom password for <span className="text-primary font-bold">{selectedStaffDetails?.full_name}</span>.
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
                Min length: 6 characters.
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

        {/* Staff Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Staff Profile — {selectedStaffDetails?.full_name}</DialogTitle>
              <DialogDescription>
                Detailed information for staff record #{selectedStaffDetails?.id.slice(0, 8)}
              </DialogDescription>
            </DialogHeader>
            
            {selectedStaffDetails && (
              <div className="space-y-6 py-4">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <Avatar className="h-32 w-32 border-4 border-muted shadow-xl">
                    <AvatarImage src={selectedStaffDetails.passport_url} />
                    <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
                      {selectedStaffDetails.full_name.split(' ').map((n: any) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <h2 className="text-2xl font-bold">{selectedStaffDetails.full_name}</h2>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {selectedStaffDetails.email}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {selectedStaffDetails.phone || 'No phone recorded'}
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Badge variant={getRoleBadgeVariant(selectedStaffDetails.role)}>
                        {selectedStaffDetails.role.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {selectedStaffDetails.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-primary">Employment Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Department:</span>
                        <span className="font-medium">{selectedStaffDetails.department?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Rank/Position:</span>
                        <span className="font-medium">{selectedStaffDetails.position || selectedStaffDetails.rank || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Grade Level:</span>
                        <span className="font-medium">Level {selectedStaffDetails.grade_level}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Step:</span>
                        <span className="font-medium">Step {selectedStaffDetails.step}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Employment Date:</span>
                        <span className="font-medium">{formatDate(selectedStaffDetails.employment_date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-primary">Personal Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Gender:</span>
                        <span className="font-medium capitalize">{selectedStaffDetails.gender || 'N/A'}</span>
                      </div>
                    <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">State of Origin:</span>
                        <span className="font-medium">{selectedStaffDetails.state_of_origin || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Qualification:</span>
                        <span className="font-medium">{selectedStaffDetails.qualification || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Retirement Date:</span>
                        <span className="font-medium">{formatDate(selectedStaffDetails.retirement_date)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function StaffForm({ 
  onSuccess, 
  departments, 
  availableRoles,
  initialData,
  isEditing = false
}: { 
  onSuccess: () => void;
  departments: any[];
  availableRoles: string[];
  initialData?: any;
  isEditing?: boolean;
}) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: initialData?.full_name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    department_id: initialData?.department_id || '',
    position: initialData?.position || '',
    role: initialData?.role || 'staff',
    grade_level: initialData?.grade_level?.toString() || '8',
    step: initialData?.step?.toString() || '1',
    employment_date: initialData?.employment_date || new Date().toISOString().split('T')[0],
    retirement_date: initialData?.retirement_date || '',
    adhoc_expiry: initialData?.adhoc_expiry || '',
    gender: initialData?.gender || 'male',
    state_of_origin: initialData?.state_of_origin || '',
    date_of_birth: initialData?.date_of_birth || '',
    qualification: initialData?.qualification || '',
    address: initialData?.address || '',
    next_of_kin_name: initialData?.next_of_kin_name || '',
    next_of_kin_phone: initialData?.next_of_kin_phone || '',
    next_of_kin_rel: initialData?.next_of_kin_rel || '',
    passport_url: initialData?.passport_url || '',
    readable_id: initialData?.readable_id || '',
  });

  useEffect(() => {
    if (!isEditing) {
      const fetchNextId = async () => {
        const nextId = await generateNextStaffId();
        setFormData(prev => ({ ...prev, readable_id: nextId }));
      };
      fetchNextId();
    }
  }, [isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const email = formData.email.trim().toLowerCase();

      if (isEditing) {
        // 1. Update Profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            email: email,
            role: formData.role as any,
            avatar_url: formData.passport_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', initialData.user_id);

        if (profileError) throw profileError;

        // 2. Update Staff Record
        const staffUpdate = {
          full_name: formData.full_name.trim(),
          email: email,
          role: formData.role,
          phone: formData.phone.trim(),
          position: formData.position.trim(),
          department_id: formData.department_id,
          grade_level: parseInt(formData.grade_level),
          step: parseInt(formData.step),
          gender: formData.gender,
          state_of_origin: formData.state_of_origin,
          date_of_birth: formData.date_of_birth || null,
          employment_date: formData.employment_date || null,
          retirement_date: formData.retirement_date || null,
          adhoc_expiry: formData.role === 'adhoc' ? formData.adhoc_expiry : null,
          qualification: formData.qualification.trim(),
          address: formData.address.trim(),
          passport_url: formData.passport_url,
          updated_at: new Date().toISOString()
        };

        const { error: staffError } = await supabase
          .from('staff_records')
          .update(staffUpdate)
          .eq('id', initialData.id);

        if (staffError) throw staffError;

        toast.success('Staff record updated successfully');
      } else {
        const password = "GDU@123";
        // 1. Create Auth User using Edge Function to avoid email confirmation and allow admin to create directly
        const { data: authData, error: authError } = await supabase.functions.invoke('admin-auth', {
          body: { 
            action: 'register-staff', 
            email, 
            password,
            fullName: formData.full_name,
            role: formData.role
          }
        });

        if (authError) {
          // Check for structured error from Edge Function
          const errorBody = authError.message ? JSON.parse(authError.message) : {};
          if (errorBody.code === 'user_already_exists') {
             throw new Error("User email already exists. Use edit staff instead.");
          }
          throw authError;
        }
        
        if (!authData || authData.error) {
           throw new Error(authData?.error || 'Failed to create user account');
        }

        const userId = authData.user.id;

        // 2. Insert staff record
        const insertData = {
          user_id: userId,
          full_name: formData.full_name.trim(),
          email: email,
          role: formData.role || 'staff',
          status: 'active',
          readable_id: formData.readable_id.trim(),
          phone: formData.phone.trim(),
          position: formData.position.trim(),
          department_id: formData.department_id || null,
          grade_level: parseInt(formData.grade_level) || null,
          step: parseInt(formData.step) || null,
          gender: formData.gender,
          state_of_origin: formData.state_of_origin,
          date_of_birth: formData.date_of_birth || null,
          employment_date: formData.employment_date || null,
          retirement_date: formData.retirement_date || null,
          adhoc_expiry: (formData.role === 'adhoc' && formData.adhoc_expiry) ? formData.adhoc_expiry : null,
          qualification: formData.qualification.trim(),
          address: formData.address.trim(),
          passport_url: formData.passport_url,
        };

        const { error: staffError } = await supabase
          .from('staff_records')
          .insert([insertData]);

        if (staffError) throw staffError;

        // 3. Send welcome email
        sendWelcomeEmail({
          fullName: formData.full_name,
          staffId: formData.readable_id,
          email: formData.email,
          password: password,
          role: formData.role,
          portalUrl: window.location.origin,
        }).catch(console.warn);

        toast.success(`Staff member registered successfully: ${formData.readable_id}`);
      }

      queryClient.invalidateQueries({ queryKey: ['staff-records'] });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Action failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };


  const handlePassportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image too large. Maximum size is 5MB.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const staffId = formData.readable_id || `temp-${Date.now()}`;
      const filePath = `passports/${staffId}-${Date.now()}.${fileExt}`;

      let publicUrl = '';

      // Strategy 1: Try Supabase Storage bucket
      try {
        const { error: uploadError } = await supabase.storage
          .from('staff-passports')
          .upload(filePath, file, { upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('staff-passports')
            .getPublicUrl(filePath);
          publicUrl = urlData.publicUrl;
        } else {
          console.warn('[Staff] Supabase upload failed:', uploadError.message, '— trying Cloudinary fallback');
        }
      } catch (supaErr) {
        console.warn('[Staff] Supabase storage unavailable, using Cloudinary fallback');
      }

      // Strategy 2: Fallback to Cloudinary
      if (!publicUrl) {
        try {
          const cloudinaryResult = await uploadToCloudinary(file, 'passports');
          if (cloudinaryResult?.secure_url) {
            publicUrl = cloudinaryResult.secure_url;
          }
        } catch (cloudErr: any) {
          console.error('[Staff] Cloudinary upload also failed:', cloudErr.message);
          throw new Error('Photo upload failed. Please check your internet connection and try again.');
        }
      }

      if (!publicUrl) {
        throw new Error('Upload failed — no URL returned from storage provider.');
      }

      setFormData(prev => ({ ...prev, passport_url: publicUrl }));
      toast.success('Passport photo uploaded successfully');
    } catch (error: any) {
      console.error('[Staff] Passport upload error:', error);

      handlePortalNotification('Error uploading passport: ' + (error.message || 'Unknown error'), { severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="max-h-[70vh] overflow-y-auto pr-4 space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Users className="h-4 w-4" />
              Personal Information
            </h3>
            {!isEditing && (
              <div className="flex items-center gap-2 bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                <span className="text-[10px] font-bold text-primary uppercase">Staff ID:</span>
                <span className="text-xs font-mono font-bold text-primary">{formData.readable_id || 'Generating...'}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Passport Photograph</label>
              <div className="h-32 w-32 rounded-xl border-2 border-dashed flex items-center justify-center bg-muted/50 overflow-hidden relative group">
                {formData.passport_url ? (
                  <img src={formData.passport_url} alt="Passport" className="h-full w-full object-cover" />
                ) : (
                  <Plus className="h-8 w-8 text-muted-foreground" />
                )}
                {isSubmitting && !formData.passport_url && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                <label 
                  htmlFor="passport-upload" 
                  className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-[10px]"
                >
                  {isSubmitting ? 'Uploading...' : 'Click to upload'}
                </label>
                <input id="passport-upload" type="file" className="hidden" accept="image/*" onChange={handlePassportUpload} disabled={isSubmitting} />
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input 
                  required 
                  value={formData.full_name} 
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} 
                  placeholder="e.g. Adebayo Johnson"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input 
                  required 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  placeholder="name@gdu.gov.ng"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input 
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                  placeholder="+234..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Gender</label>
                <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date of Birth</label>
                <Input 
                  type="date" 
                  value={formData.date_of_birth} 
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">State of Origin</label>
                <Input 
                  value={formData.state_of_origin} 
                  onChange={(e) => setFormData({ ...formData, state_of_origin: e.target.value })} 
                  placeholder="e.g. Kogi"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Qualification</label>
                <Input 
                  value={formData.qualification} 
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })} 
                  placeholder="e.g. M.Sc Computer Science"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Residential Address</label>
                <Input 
                  value={formData.address} 
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                  placeholder="Full residential address"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Employment Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Select value={formData.department_id} onValueChange={(v) => setFormData({ ...formData, department_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Position/Rank</label>
              <Input value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} placeholder="e.g. Senior Officer" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">System Role</label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.filter(r => r !== 'All Roles').map(r => <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Grade Level</label>
                <Select value={formData.grade_level} onValueChange={(v) => setFormData({ ...formData, grade_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 17 }, (_, i) => (i + 1).toString()).map(l => <SelectItem key={l} value={l}>Level {l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Step</label>
                <Select value={formData.step} onValueChange={(v) => setFormData({ ...formData, step: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 15 }, (_, i) => (i + 1).toString()).map(s => <SelectItem key={s} value={s}>Step {s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Employment Date</label>
              <Input type="date" value={formData.employment_date} onChange={(e) => setFormData({ ...formData, employment_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Retirement Date</label>
              <Input type="date" value={formData.retirement_date} onChange={(e) => setFormData({ ...formData, retirement_date: e.target.value })} />
            </div>
            {formData.role === 'adhoc' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-destructive font-bold uppercase tracking-tight">Adhoc Expiry Date</label>
                <Input 
                  required={formData.role === 'adhoc'}
                  type="date" 
                  value={formData.adhoc_expiry} 
                  onChange={(e) => setFormData({ ...formData, adhoc_expiry: e.target.value })} 
                  className="border-destructive/30 focus-visible:ring-destructive"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Staff ID (Optional)</label>
              <Input 
                value={formData.readable_id} 
                onChange={(e) => setFormData({ ...formData, readable_id: e.target.value })} 
                placeholder="e.g. GDU100"
                disabled={isEditing}
              />
            </div>
          </div>
        </section>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" type="button" onClick={onSuccess}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Update Staff Record' : 'Register Staff Member'}
        </Button>
      </div>
    </form>
  );
}