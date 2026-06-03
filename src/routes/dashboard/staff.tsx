import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Loader2,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard/staff')({
  head: () => ({
    meta: [{ title: 'Staff Management — GDU Portal' }],
  }),
  component: StaffManagementPage,
});

const roles = ['All Roles', 'super_admin', 'admin', 'accounts', 'dg', 'ta', 'ict', 'staff'];
const statuses = ['All Status', 'active', 'inactive', 'suspended', 'retired'];

function StaffManagementPage() {
  const { profile, canAccess, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');
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
      toast.success('User role updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update role: ' + error.message);
    },
  });

  const [roleUpdateStaff, setRoleUpdateStaff] = useState<any>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedStaffDetails, setSelectedStaffDetails] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const handleRoleUpdate = (staff: any, newRole: string) => {
    updateStaffRoleMutation.mutate({
      staffId: staff.id,
      userId: staff.user_id,
      newRole
    });
    setIsRoleDialogOpen(false);
   };

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

   const { data: dbDepartments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const departments = ['All Departments', ...dbDepartments.map(d => d.name)];

  // Fetch staff from database
  const { data: staffRecords = [], isLoading } = useQuery({
    queryKey: ['staff-records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_records')
        .select(`
          *,
          department:departments(name)
        `)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff_records')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-records'] });
      toast.success('Staff record deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete staff: ' + error.message);
    },
  });

  const canManageStaff = canAccess('staff', 'create') || canAccess('staff', 'edit');

  const availableRoles = isSuperAdmin 
    ? roles 
    : roles.filter(r => r !== 'super_admin');

  const filteredStaff = staffRecords.filter((staff) => {
    const matchesSearch =
      staff.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export All
                </Button>
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
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                    <p className="text-muted-foreground">Loading staff records...</p>
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
                                {canManageStaff && (
                                  <>
                                    <DropdownMenuItem 
                                      className="cursor-pointer"
                                      onClick={() => {
                                        setSelectedStaffDetails(staff);
                                        setIsDetailsDialogOpen(true);
                                      }}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit Staff
                                    </DropdownMenuItem>
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
                                      deleteStaffMutation.mutate(staff.id);
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
                        <span className="font-medium">{selectedStaffDetails.state || 'N/A'}</span>
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
  availableRoles 
}: { 
  onSuccess: () => void;
  departments: any[];
  availableRoles: string[];
}) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    department_id: '',
    position: '',
    role: 'staff',
    grade_level: '8',
    step: '1',
    employment_date: new Date().toISOString().split('T')[0],
    retirement_date: '',
    gender: 'male',
    date_of_birth: '',
    qualification: '',
    state: '',
    lga: '',
    address: '',
    next_of_kin_name: '',
    next_of_kin_phone: '',
    next_of_kin_rel: '',
    passport_url: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('staff_records')
        .insert([{
          ...formData,
          grade_level: parseInt(formData.grade_level),
          step: parseInt(formData.step),
          retirement_date: formData.retirement_date || null,
        }])
        .select();

      if (error) throw error;

      toast.success('Staff member added successfully');
      onSuccess();
    } catch (error: any) {
      toast.error('Failed to add staff: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePassportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsSubmitting(true);
      
      // Upload to Cloudinary
      const res = await uploadToCloudinary(file, 'passports');

      setFormData({ ...formData, passport_url: res.secure_url });
      toast.success('Passport photo uploaded');
    } catch (error: any) {
      toast.error('Error uploading passport: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="max-h-[70vh] overflow-y-auto pr-4 space-y-8">
        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            <Users className="h-4 w-4" />
            Personal Information
          </h3>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Passport Photograph</label>
              <div className="h-32 w-32 rounded-xl border-2 border-dashed flex items-center justify-center bg-muted/50 overflow-hidden relative group">
                {formData.passport_url ? (
                  <img src={formData.passport_url} alt="Passport" className="h-full w-full object-cover" />
                ) : (
                  <Plus className="h-8 w-8 text-muted-foreground" />
                )}
                <label 
                  htmlFor="passport-upload" 
                  className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-[10px]"
                >
                  Click to upload
                </label>
                <input id="passport-upload" type="file" className="hidden" accept="image/*" onChange={handlePassportUpload} />
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
                <label className="text-sm font-medium">Qualification</label>
                <Input 
                  value={formData.qualification} 
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })} 
                  placeholder="e.g. M.Sc Computer Science"
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
          </div>
        </section>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" type="button" onClick={onSuccess}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Register Staff Member
        </Button>
      </div>
    </form>
  );
}