import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { useState } from 'react';
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
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard/staff')({
  head: () => ({
    meta: [{ title: 'Staff Management — GDU Portal' }],
  }),
  component: StaffManagementPage,
});

const mockStaff = [
  {
    id: '1',
    full_name: 'Adebayo Johnson',
    email: 'adebayo.johnson@gdu.gov.ng',
    phone: '+234 801 234 5678',
    department: 'Administration',
    position: 'Senior Administrative Officer',
    role: 'admin',
    grade_level: 8,
    step: 4,
    status: 'active',
    passport_url: null,
    employment_date: '2019-03-15',
  },
  {
    id: '2',
    full_name: 'Grace Okonkwo',
    email: 'grace.okonkwo@gdu.gov.ng',
    phone: '+234 802 345 6789',
    department: 'Finance',
    position: 'Chief Financial Officer',
    role: 'accounts',
    grade_level: 12,
    step: 6,
    status: 'active',
    passport_url: null,
    employment_date: '2015-07-01',
  },
  {
    id: '3',
    full_name: 'Emmanuel Obi',
    email: 'emmanuel.obi@gdu.gov.ng',
    phone: '+234 803 456 7890',
    department: 'ICT',
    position: 'ICT Director',
    role: 'ict',
    grade_level: 14,
    step: 2,
    status: 'active',
    passport_url: null,
    employment_date: '2012-01-10',
  },
  {
    id: '4',
    full_name: 'Fatima Bello',
    email: 'fatima.bello@gdu.gov.ng',
    phone: '+234 804 567 8901',
    department: 'Operations',
    position: 'Operations Manager',
    role: 'staff',
    grade_level: 9,
    step: 3,
    status: 'active',
    passport_url: null,
    employment_date: '2018-05-22',
  },
  {
    id: '5',
    full_name: 'Chidi Okafor',
    email: 'chidi.okafor@gdu.gov.ng',
    phone: '+234 805 678 9012',
    department: 'HR',
    position: 'HR Manager',
    role: 'admin',
    grade_level: 10,
    step: 5,
    status: 'active',
    passport_url: null,
    employment_date: '2017-09-01',
  },
  {
    id: '6',
    full_name: 'Amina Ibrahim',
    email: 'amina.ibrahim@gdu.gov.ng',
    phone: '+234 806 789 0123',
    department: 'Finance',
    position: 'Accountant',
    role: 'accounts',
    grade_level: 7,
    step: 2,
    status: 'active',
    passport_url: null,
    employment_date: '2020-11-15',
  },
  {
    id: '7',
    full_name: 'David Adeyemi',
    email: 'david.adeyemi@gdu.gov.ng',
    phone: '+234 807 890 1234',
    department: 'Administration',
    position: 'Director General',
    role: 'dg',
    grade_level: 17,
    step: 1,
    status: 'active',
    passport_url: null,
    employment_date: '2010-04-01',
  },
  {
    id: '8',
    full_name: 'Blessing Eze',
    email: 'blessing.eze@gdu.gov.ng',
    phone: '+234 808 901 2345',
    department: 'Operations',
    position: 'Field Officer',
    role: 'staff',
    grade_level: 5,
    step: 1,
    status: 'inactive',
    passport_url: null,
    employment_date: '2021-03-10',
  },
];

const departments = ['All Departments', 'Administration', 'Finance', 'ICT', 'Operations', 'HR'];
const roles = ['All Roles', 'super_admin', 'admin', 'accounts', 'dg', 'ta', 'ict', 'staff'];
const statuses = ['All Status', 'active', 'inactive', 'suspended', 'retired'];

function StaffManagementPage() {
  const { canAccess } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const canManageStaff = canAccess('staff', 'create') || canAccess('staff', 'edit');

  const filteredStaff = mockStaff.filter((staff) => {
    const matchesSearch =
      staff.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.phone.includes(searchQuery);
    const matchesDepartment =
      departmentFilter === 'All Departments' || staff.department === departmentFilter;
    const matchesRole = roleFilter === 'All Roles' || staff.role === roleFilter;
    const matchesStatus = statusFilter === 'All Status' || staff.status === statusFilter;
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

  const formatDate = (dateString: string) => {
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
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Bulk Upload
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
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
                  <StaffForm onSuccess={() => setIsAddDialogOpen(false)} />
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
                        {roles.map((role) => (
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Grade Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Employment Date</TableHead>
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
                                  .map((n) => n[0])
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
                            {staff.department}
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
                              <DropdownMenuItem asChild>
                                <Link to={`/dashboard/staff/${staff.id}`} className="cursor-pointer">
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              {canManageStaff && (
                                <>
                                  <DropdownMenuItem className="cursor-pointer">
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Staff
                                                          </DropdownMenuItem>
                                                          <DropdownMenuItem className="cursor-pointer">
                                    <Mail className="mr-2 h-4 w-4" />
                                    Send Message
                                                          </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
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
                {filteredStaff.length === 0 && (
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
      </div>
    </DashboardLayout>
  );
}

function StaffForm({ onSuccess }: { onSuccess: () => void }) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium">
            Full Name
          </label>
          <Input id="fullName" placeholder="Enter full name" />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input id="email" type="email" placeholder="Enter email address" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone Number
          </label>
          <Input id="phone" placeholder="Enter phone number" />
        </div>
        <div className="space-y-2">
          <label htmlFor="department" className="text-sm font-medium">
            Department
          </label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.slice(1).map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="position" className="text-sm font-medium">
            Position
          </label>
          <Input id="position" placeholder="Enter position" />
        </div>
        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-medium">
            Role
          </label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.slice(1).map((role) => (
                <SelectItem key={role} value={role}>
                  {role.replace('_', ' ').toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <label htmlFor="gradeLevel" className="text-sm font-medium">
            Grade Level
          </label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 17 }, (_, i) => i + 1).map((level) => (
                <SelectItem key={level} value={String(level)}>
                  Level {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="step" className="text-sm font-medium">
            Step
          </label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Step" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 15 }, (_, i) => i + 1).map((step) => (
                <SelectItem key={step} value={String(step)}>
                  Step {step}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="employmentDate" className="text-sm font-medium">
            Employment Date
          </label>
          <Input id="employmentDate" type="date" />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button>Create Staff</Button>
      </div>
    </div>
  );
}