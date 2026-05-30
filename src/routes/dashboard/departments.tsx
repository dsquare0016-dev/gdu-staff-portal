import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Building2,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  UserCircle,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard/departments')({
  head: () => ({
    meta: [{ title: 'Departments — GDU Portal' }],
  }),
  component: DepartmentsPage,
});

const mockDepartments = [
  {
    id: '1',
    name: 'Administration',
    code: 'ADMIN',
    description: 'Handles general administration and human resources',
    head_name: 'David Adeyemi',
    head_role: 'Director General',
    staff_count: 35,
    parent_id: null,
    is_active: true,
  },
  {
    id: '2',
    name: 'Finance',
    code: 'FIN',
    description: 'Manages all financial operations and payroll',
    head_name: 'Grace Okonkwo',
    head_role: 'Chief Financial Officer',
    staff_count: 25,
    parent_id: '1',
    is_active: true,
  },
  {
    id: '3',
    name: 'ICT',
    code: 'ICT',
    description: 'Information and Communications Technology',
    head_name: 'Emmanuel Obi',
    head_role: 'ICT Director',
    staff_count: 18,
    parent_id: '1',
    is_active: true,
  },
  {
    id: '4',
    name: 'Operations',
    code: 'OPS',
    description: 'Core operations and field activities',
    head_name: 'Fatima Bello',
    head_role: 'Director, Operations',
    staff_count: 45,
    parent_id: '1',
    is_active: true,
  },
  {
    id: '5',
    name: 'Human Resources',
    code: 'HR',
    description: 'Staff management and development',
    head_name: 'Chidi Okafor',
    head_role: 'HR Manager',
    staff_count: 15,
    parent_id: '1',
    is_active: true,
  },
  {
    id: '6',
    name: 'Procurement',
    code: 'PROC',
    description: 'Manages procurement and supplies',
    head_name: 'Kunle Bakare',
    head_role: 'Procurement Officer',
    staff_count: 12,
    parent_id: '1',
    is_active: false,
  },
];

function DepartmentsPage() {
  const { canAccess } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const canManage = canAccess('staff', 'create') || canAccess('staff', 'edit');

  const filteredDepartments = mockDepartments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDepts = mockDepartments.filter((d) => d.is_active).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
            <p className="text-muted-foreground mt-1">
              Manage organizational departments and structure
            </p>
          </div>
          {canManage && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Department
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Department</DialogTitle>
                  <DialogDescription>
                    Create a new department in the organization structure.
                  </DialogDescription>
                </DialogHeader>
                <DepartmentForm onSuccess={() => setIsAddDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Departments</p>
                  <p className="text-2xl font-bold">{mockDepartments.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Departments</p>
                  <p className="text-2xl font-bold">{activeDepts}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Staff</p>
                  <p className="text-2xl font-bold">156</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Department List</CardTitle>
                <CardDescription>All organizational departments</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search departments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Head</TableHead>
                  <TableHead>Staff Count</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{dept.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {dept.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{dept.code}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm">{dept.head_name}</p>
                          <p className="text-xs text-muted-foreground">{dept.head_role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{dept.staff_count}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          dept.is_active
                            ? 'bg-green-500/10 text-green-600 border-green-500/20'
                            : 'bg-gray-500/10 text-gray-600 border-gray-500/20'
                        )}
                      >
                        {dept.is_active ? 'Active' : 'Inactive'}
                      </Badge>
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
                          <DropdownMenuItem className="cursor-pointer">
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {canManage && (
                            <>
                              <DropdownMenuItem className="cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Department
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer">
                                <Users className="mr-2 h-4 w-4" />
                                Manage Staff
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function DepartmentForm({ onSuccess }: { onSuccess: () => void }) {
  return (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Department Name</label>
        <Input placeholder="Enter department name" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Department Code</label>
        <Input placeholder="e.g., FIN, HR, ICT" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Input placeholder="Brief description" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Head of Department</label>
        <Input placeholder="Select or search staff" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Parent Department</label>
        <Input placeholder="Select parent department (optional)" />
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button>Create Department</Button>
      </div>
    </div>
  );
}