import { createFileRoute, Link } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import {
  ClipboardList,
  Search,
  Filter,
  Download,
  FileText,
  Users,
  Building2,
  Calendar,
  Eye,
  Loader2,
} from 'lucide-react';

export const Route = createFileRoute('/dashboard/nominal-roll')({
  head: () => ({
    meta: [{ title: 'Nominal Roll — GDU Portal' }],
  }),
  component: NominalRollPage,
});

const gradeLevels = ['All Levels', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17'];
const roles = ['All Roles', 'super_admin', 'admin', 'accounts', 'dg', 'ta', 'ict', 'staff'];

function NominalRollPage() {
  const { canAccess, isSuperAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [gradeFilter, setGradeFilter] = useState('All Levels');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Fetch departments from database
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

  // Fetch staff from database for nominal roll
  const { data: staffRecords = [], isLoading } = useQuery({
    queryKey: ['nominal-roll-records'],
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

  const availableRoles = isSuperAdmin 
    ? roles 
    : roles.filter(r => r !== 'super_admin');

  const canExport = canAccess('staff', 'view');

  const filteredRoll = staffRecords.filter((record) => {
    const staffDept = record.department?.name || '';
    const matchesSearch =
      record.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.position && record.position.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDepartment =
      departmentFilter === 'All Departments' || staffDept === departmentFilter;
    
    const matchesGrade = gradeFilter === 'All Levels' || record.grade_level === parseInt(gradeFilter);
    const matchesRole = roleFilter === 'All Roles' || record.role === roleFilter;
    
    // Hide super_admin from non-super admins
    if (!isSuperAdmin && record.role === 'super_admin') return false;
    
    return matchesSearch && matchesDepartment && matchesGrade && matchesRole;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const stats = {
    total: filteredRoll.length,
    male: filteredRoll.filter((r) => r.gender === 'male').length,
    female: filteredRoll.filter((r) => r.gender === 'female').length,
    departments: new Set(filteredRoll.map((r) => r.department?.name)).size,
  };

  const handleExportCSV = () => {
    if (filteredRoll.length === 0) return;
    
    const headers = ["S/No", "Full Name", "Rank/Position", "Grade Level", "Step", "Department", "Role", "Employment Date", "Qualification", "Gender", "State"];
    const rows = filteredRoll.map((r, i) => [
      i + 1,
      r.full_name,
      r.position || r.rank || '',
      r.grade_level,
      r.step,
      r.department?.name || 'N/A',
      r.role,
      r.employment_date || '',
      r.qualification || '',
      r.gender || '',
      r.state || ''
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `GDU_Nominal_Roll_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nominal Roll</h1>
            <p className="text-muted-foreground mt-1">
              Official staff register and workforce record
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setIsPreviewOpen(true)}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <FileText className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Staff</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Male Staff</p>
                  <p className="text-2xl font-bold">{stats.male}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-pink-500/10 to-pink-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Female Staff</p>
                  <p className="text-2xl font-bold">{stats.female}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-pink-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Departments</p>
                  <p className="text-2xl font-bold">{stats.departments}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or rank..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Building2 className="mr-2 h-4 w-4" />
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
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Briefcase className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level === 'All Levels' ? level : `Level ${level}`}
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[60px]">S/No</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Rank/Position</TableHead>
                    <TableHead>Grade Level</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Employment Date</TableHead>
                    <TableHead>Qualification</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>State</TableHead>
                  </TableRow>
                </TableHeader>
                  <TableBody>
                  {filteredRoll.map((record, index) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{record.full_name}</TableCell>
                      <TableCell>{record.position || record.rank}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          Level {record.grade_level} / Step {record.step}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.department?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.role === 'dg'
                              ? 'default'
                              : record.role === 'admin'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {record.role.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(record.employment_date)}</TableCell>
                      <TableCell className="text-sm">{record.qualification || '—'}</TableCell>
                      <TableCell className="capitalize">{record.gender || '—'}</TableCell>
                      <TableCell>{record.state || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nominal Roll Preview</DialogTitle>
              <DialogDescription>
                Government Delivery Unit (GDU) — Kogi State Government
              </DialogDescription>
            </DialogHeader>
            <div className="border rounded-lg p-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">GOVERNMENT DELIVERY UNIT (GDU)</h2>
                <p className="text-sm text-muted-foreground">KOGI STATE GOVERNMENT</p>
                <h3 className="text-lg font-semibold mt-4">NOMINAL ROLL</h3>
                <p className="text-sm text-muted-foreground">May 2026</p>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[60px]">S/No</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Rank</TableHead>
                      <TableHead>GL/Step</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Emp. Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoll.map((record, index) => (
                      <TableRow key={record.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{record.full_name}</TableCell>
                        <TableCell>{record.position || record.rank}</TableCell>
                        <TableCell>
                          {record.grade_level}/{record.step}
                        </TableCell>
                        <TableCell>{record.department?.name || 'N/A'}</TableCell>
                        <TableCell>{record.role.toUpperCase()}</TableCell>
                        <TableCell>{formatDate(record.employment_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-6 pt-6 border-t flex justify-between text-sm text-muted-foreground">
                <p>Total Staff: {filteredRoll.length}</p>
                <p>Generated: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}