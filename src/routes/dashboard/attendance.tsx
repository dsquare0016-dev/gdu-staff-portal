import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Clock,
  Search,
  Filter,
  Download,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  AlertCircle,
  LogIn,
  LogOut,
  UserCheck,
  FileText,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export const Route = createFileRoute('/dashboard/attendance')({
  head: () => ({
    meta: [{ title: 'Attendance Management — GDU Portal' }],
  }),
  component: AttendancePage,
});

const mockAttendance = [
  {
    id: '1',
    staff_id: '1',
    staff_name: 'Adebayo Johnson',
    staff_email: 'adebayo.johnson@gdu.gov.ng',
    date: '2026-05-30',
    check_in: '08:15',
    check_out: '17:30',
    status: 'present',
    late_minutes: 15,
    department: 'Administration',
  },
  {
    id: '2',
    staff_id: '2',
    staff_name: 'Grace Okonkwo',
    staff_email: 'grace.okonkwo@gdu.gov.ng',
    date: '2026-05-30',
    check_in: '08:00',
    check_out: null,
    status: 'present',
    late_minutes: 0,
    department: 'Finance',
  },
  {
    id: '3',
    staff_id: '3',
    staff_name: 'Emmanuel Obi',
    staff_email: 'emmanuel.obi@gdu.gov.ng',
    date: '2026-05-30',
    check_in: '09:30',
    check_out: null,
    status: 'late',
    late_minutes: 90,
    department: 'ICT',
  },
  {
    id: '4',
    staff_id: '4',
    staff_name: 'Fatima Bello',
    staff_email: 'fatima.bello@gdu.gov.ng',
    date: '2026-05-30',
    check_in: null,
    check_out: null,
    status: 'absent',
    late_minutes: 0,
    department: 'Operations',
  },
  {
    id: '5',
    staff_id: '5',
    staff_name: 'Chidi Okafor',
    staff_email: 'chidi.okafor@gdu.gov.ng',
    date: '2026-05-30',
    check_in: '08:05',
    check_out: '17:00',
    status: 'present',
    late_minutes: 5,
    department: 'HR',
  },
  {
    id: '6',
    staff_id: '6',
    staff_name: 'Amina Ibrahim',
    staff_email: 'amina.ibrahim@gdu.gov.ng',
    date: '2026-05-30',
    check_in: null,
    check_out: null,
    status: 'leave',
    late_minutes: 0,
    department: 'Finance',
  },
];

const departments = ['All Departments', 'Administration', 'Finance', 'ICT', 'Operations', 'HR'];
const statuses = ['All Status', 'present', 'absent', 'late', 'leave', 'holiday'];

function AttendancePage() {
  const { profile, canAccess } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const canManageAttendance = canAccess('attendance', 'create') || canAccess('attendance', 'edit');

  const filteredAttendance = mockAttendance.filter((record) => {
    const matchesSearch =
      record.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.staff_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment =
      departmentFilter === 'All Departments' || record.department === departmentFilter;
    const matchesStatus = statusFilter === 'All Status' || record.status === statusFilter;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'late':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'leave':
        return <UserCheck className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      present: 'bg-green-500/10 text-green-600 border-green-500/20',
      absent: 'bg-red-500/10 text-red-600 border-red-500/20',
      late: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      leave: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      holiday: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    };
    return (
      <Badge className={cn('capitalize', variants[status] || '')}>
        {getStatusIcon(status)}
        <span className="ml-1">{status}</span>
      </Badge>
    );
  };

  const todayStats = {
    present: mockAttendance.filter((r) => r.status === 'present').length,
    absent: mockAttendance.filter((r) => r.status === 'absent').length,
    late: mockAttendance.filter((r) => r.status === 'late').length,
    onLeave: mockAttendance.filter((r) => r.status === 'leave').length,
  };

  const presentRate = Math.round((todayStats.present / mockAttendance.length) * 100);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendance Management</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage staff attendance records
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                isOnline
                  ? 'bg-green-500/10 text-green-600'
                  : 'bg-red-500/10 text-red-600'
              )}
            >
              {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
              <DialogTrigger asChild>
                <Button>
                  <LogIn className="mr-2 h-4 w-4" />
                  Record Attendance
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Record Attendance</DialogTitle>
                  <DialogDescription>
                    Mark attendance for {format(date || new Date(), 'PPP')}
                  </DialogDescription>
                </DialogHeader>
                <AttendanceForm onSuccess={() => setIsCheckInOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Present</p>
                  <p className="text-2xl font-bold">{todayStats.present}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-red-500/10 to-red-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Absent</p>
                  <p className="text-2xl font-bold">{todayStats.absent}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Late</p>
                  <p className="text-2xl font-bold">{todayStats.late}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">On Leave</p>
                  <p className="text-2xl font-bold">{todayStats.onLeave}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                  <p className="text-2xl font-bold">{presentRate}%</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="daily" className="space-y-4">
          <TabsList>
            <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
            <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="space-y-4">
            <Card className="border backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search staff..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[180px]">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, 'PPP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status === 'All Status'
                              ? status
                              : status.charAt(0).toUpperCase() + status.slice(1)}
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
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Late Minutes</TableHead>
                      {canManageAttendance && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs">
                                {record.staff_name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{record.staff_name}</p>
                              <p className="text-xs text-muted-foreground">{record.staff_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{record.department}</TableCell>
                        <TableCell>
                          {record.check_in ? (
                            <div className="flex items-center gap-2">
                              <LogIn className="h-4 w-4 text-green-500" />
                              {record.check_in}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.check_out ? (
                            <div className="flex items-center gap-2">
                              <LogOut className="h-4 w-4 text-red-500" />
                              {record.check_out}
                            </div>
                          ) : record.status === 'present' ? (
                            <span className="text-xs text-muted-foreground">On duty</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          {record.late_minutes > 0 ? (
                            <span className="text-yellow-600 font-medium">
                              {record.late_minutes} min
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {canManageAttendance && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <Card className="border backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Attendance Calendar</CardTitle>
                <CardDescription>
                  View attendance patterns by month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-8">
                  <Calendar mode="single" selected={date} onSelect={setDate} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="border backdrop-blur-sm p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Attendance Reports</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Generate and download attendance reports
              </p>
              <Button className="mt-4">
                <Download className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function AttendanceForm({ onSuccess }: { onSuccess: () => void }) {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('present');

  return (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Staff</label>
        <Select value={selectedStaff} onValueChange={setSelectedStaff}>
          <SelectTrigger>
            <SelectValue placeholder="Choose staff member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Adebayo Johnson</SelectItem>
            <SelectItem value="2">Grace Okonkwo</SelectItem>
            <SelectItem value="3">Emmanuel Obi</SelectItem>
            <SelectItem value="4">Fatima Bello</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Attendance Status</label>
        <Select value={attendanceStatus} onValueChange={setAttendanceStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="present">Present</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
            <SelectItem value="late">Late</SelectItem>
            <SelectItem value="leave">On Leave</SelectItem>
            <SelectItem value="holiday">Holiday</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Check In Time</label>
          <Input type="time" defaultValue="08:00" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Check Out Time</label>
          <Input type="time" />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Notes</label>
        <Input placeholder="Add any notes..." />
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button>Save Record</Button>
      </div>
    </div>
  );
}