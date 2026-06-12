import { format } from 'date-fns';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  ClipboardList,
  Wifi,
  WifiOff,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  QrCode,
  ScanQrCode,
} from 'lucide-react';
import { QRScanner } from '@/components/attendance/qr-scanner';
import { QRGenerator } from '@/components/attendance/qr-generator';
import { cn } from '@/lib/utils';
import { exportToPDF, exportToExcel } from '@/lib/utils/export';
import { useBranding } from '@/lib/hooks/use-branding';
import { toast } from 'sonner';
import { handleDatabaseError, handlePortalNotification } from '@/lib/error-handler';
import { PortalLoader } from '@/components/ui/portal-loader';
import { createNotification } from '@/lib/hooks/use-notifications';

export const Route = createFileRoute('/dashboard/attendance')({
  head: () => ({
    meta: [{ title: 'Attendance Management — GDU Portal' }],
  }),
  component: AttendancePage,
});


const statuses = ['All Status', 'present', 'absent', 'late', 'leave', 'holiday'];

function AttendancePage() {
  const { profile, canAccess, isSuperAdmin, isAdmin, isICT } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [manualStaffId, setManualStaffId] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const handleManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStaffId.trim()) return;

    try {
      setIsSubmittingManual(true);
      
      // 1. Find staff by readable_id
      const { data: staff, error: staffError } = await supabase
        .from('staff_records')
        .select('id, full_name, position')
        .eq('readable_id', manualStaffId.trim().toUpperCase())
        .maybeSingle();

      if (staffError || !staff) {
        throw new Error('Staff record not found with ID: ' + manualStaffId);
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // 2. Check if already checked in today
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('staff_id', staff.id)
        .eq('date', today)
        .maybeSingle();

      if (existing) {
        // Update check-out
        const { error: updateError } = await supabase
          .from('attendance')
          .update({ 
            check_out: now.toISOString(),
            status: 'present'
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
        toast.success(`Check-out recorded for ${staff.full_name}`);
      } else {
        // Insert check-in
        const { error: insertError } = await supabase
          .from('attendance')
          .insert([{
            staff_id: staff.id,
            date: today,
            check_in: now.toISOString(),
            status: now.getHours() >= 9 && now.getMinutes() > 0 ? 'late' : 'present',
          }]);

        if (insertError) throw insertError;
        toast.success(`Check-in recorded for ${staff.full_name}`);
      }

      setManualStaffId('');
      setIsManualEntryOpen(false);
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const canScan = isSuperAdmin || isAdmin || isICT;

  // Fetch departments from database
  const { data: dbDepartments = [] as any[] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('status', 'active')
        .order('name');
      if (error) {
        handleDatabaseError(error, 'fetch departments');
        return [] as any[];
      }
      return data as any[];
    },
  });

  const departments = ['All Departments', ...dbDepartments.map(d => d.name)];

  // Fetch departments for manual merge
  const { data: depts = [] } = useQuery({
    queryKey: ['departments-all'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('id, name');
      return data || [];
    }
  });

  // Fetch attendance from database
  const { data: attendanceRecords = [] as any[], isLoading } = useQuery({
    queryKey: ['attendance', date?.toISOString().split('T')[0], profile?.id, profile?.role, depts.length],
    queryFn: async () => {
      const dateStr = date?.toISOString().split('T')[0];
      let query = supabase
        .from('attendance')
        .select(`
          *,
          staff:staff_records!staff_id(
            id,
            full_name,
            email,
            role,
            user_id,
            readable_id,
            passport_url,
            department_id
          )
        `);

      // If not privileged role, only show own records
       const isPrivileged = ['ict', 'admin', 'super_admin'].includes(profile?.role || '');
       
       if (!isPrivileged) {
         query = query.eq('staff_id', profile?.staff_id).eq('approved', true);
       } else {
         query = query.eq('date', dateStr);
       }
      
      const { data, error } = await query;
      
      if (error) {
        handleDatabaseError(error, 'fetch attendance');
        return [] as any[];
      }

      // Manual merge with departments
      const deptMap = (depts || []).reduce((acc: any, d: any) => {
        acc[d.id] = d;
        return acc;
      }, {});

      return (data || []).map((record: any) => {
        const staff = record.staff;
        if (staff) {
          staff.department = staff.department_id ? deptMap[staff.department_id] : null;
        }
        return record;
      });
    },
    enabled: !!date && !!profile && depts.length > 0,
  });

  const canManageAttendance = canAccess('attendance', 'edit') || canAccess('attendance', 'verify');
  const canInitiateAttendance = profile?.role === 'ict' || profile?.role === 'admin' || profile?.role === 'super_admin';

  const updateAttendanceMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const { error } = await supabase
        .from('attendance')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      // Also invalidate dashboard stats as they depend on attendance
      queryClient.invalidateQueries({ queryKey: ['dashboard-weekly-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-attendance-stats'] });
    },
    onError: (error: any) => {
      handleDatabaseError(error, 'update attendance');
    },
  });

  const handleVerify = async (record: any) => {
    // Skip verification/approval requirement for Technical Assistant, DG, ICT
    const skipApprovalRoles = ['technical_assistant', 'dg', 'ict'];
    const needsApproval = !skipApprovalRoles.includes(record.staff?.role || '');
    
    updateAttendanceMutation.mutate({
      id: record.id,
      updates: {
        verified: true,
        verified_by: profile?.id,
        verified_at: new Date().toISOString(),
        // If role is TA, DG, or ICT, it's auto-approved upon verification
        approved: needsApproval ? record.approved : true,
        approved_by: needsApproval ? record.approved_by : profile?.id,
        approved_at: needsApproval ? record.approved_at : new Date().toISOString(),
      }
    });
    
    // Create notification for staff
    if (record.staff?.user_id) {
      await createNotification({
        user_id: record.staff.user_id,
        type: 'attendance',
        title: 'Attendance Verified',
        body: `Your attendance for ${format(new Date(record.date), 'PP')} has been verified by the ${profile?.role}.`,
        related_module: 'attendance',
        related_record_id: record.id
      } as any);
    }
    
    handlePortalNotification(`Attendance for ${record.staff?.full_name} verified`, { severity: 'success' });
  };

  const handleDecline = async (record: any, newStatus: string) => {
    updateAttendanceMutation.mutate({
      id: record.id,
      updates: {
        status: newStatus,
        verified: false,
        approved: false,
        verified_by: null,
        verified_at: null,
        approved_by: null,
        approved_at: null,
      }
    });

    // Create notification for staff
    if (record.staff?.user_id) {
      await createNotification({
        user_id: record.staff.user_id,
        type: 'attendance',
        title: 'Attendance Rejected',
        body: `Your attendance for ${format(new Date(record.date), 'PP')} was rejected and set to ${newStatus}.`,
        related_module: 'attendance',
        related_record_id: record.id
      } as any);
    }

    handlePortalNotification(`Attendance for ${record.staff?.full_name} declined and set to ${newStatus}`, { severity: 'warning' });
  };

  const handleApprove = async (record: any) => {
    updateAttendanceMutation.mutate({
      id: record.id,
      updates: {
        approved: true,
        approved_by: profile?.id,
        approved_at: new Date().toISOString(),
      }
    });

    // Create notification for staff
    if (record.staff?.user_id) {
      await createNotification({
        user_id: record.staff.user_id,
        type: 'attendance',
        title: 'Attendance Approved',
        body: `Your attendance for ${format(new Date(record.date), 'PP')} has been approved.`,
        related_module: 'attendance',
        related_record_id: record.id
      } as any);
    }

    handlePortalNotification(`Attendance for ${record.staff?.full_name} approved`, { severity: 'success' });
  };

  const { data: branding } = useBranding();

  const handleExport = (exportFormat: 'pdf' | 'excel') => {
    const headers = ['Staff Name', 'Department', 'Check In', 'Check Out', 'Status', 'Date'];
    const exportData = filteredAttendance.map(record => ({
      staff_name: record.staff?.full_name || 'N/A',
      department: record.staff?.department?.name || 'N/A',
      check_in: record.check_in ? format(new Date(record.check_in), 'HH:mm') : '-',
      check_out: record.check_out ? format(new Date(record.check_out), 'HH:mm') : '-',
      status: record.status,
      date: format(new Date(record.date), 'PPP')
    }));

    if (exportFormat === 'pdf') {
      exportToPDF({
        data: exportData,
        filename: `Attendance_Report_${date ? format(date, 'yyyy-MM-dd') : 'All'}`,
        title: `Attendance Report - ${date ? format(date, 'PPPP') : 'All Dates'}`,
        headers,
        generatedBy: profile?.full_name,
        branding
      });
    } else {
      exportToExcel({
        data: exportData,
        filename: `Attendance_Report_${date ? format(date, 'yyyy-MM-dd') : 'All'}`,
        title: `Attendance Report - ${date ? format(date, 'PPPP') : 'All Dates'}`,
        branding
      });
    }
  };

  const filteredAttendance = (attendanceRecords || []).filter((record) => {
    const staffName = record.staff?.full_name || '';
    const staffEmail = record.staff?.email || '';
    const staffDept = record.staff?.department?.name || '';

    const matchesSearch =
      (staffName || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (staffEmail || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    
    const matchesDepartment =
      departmentFilter === 'All Departments' || staffDept === departmentFilter;
    
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
    present: (attendanceRecords || []).filter((r) => r.status === 'present').length,
    absent: (attendanceRecords || []).filter((r) => r.status === 'absent').length,
    late: (attendanceRecords || []).filter((r) => r.status === 'late').length,
    onLeave: (attendanceRecords || []).filter((r) => r.status === 'leave').length,
  };

  const totalRecords = (attendanceRecords || []).length || 1;
  const presentRate = Math.round((todayStats.present / totalRecords) * 100);

  const formatTime = (isoString: string | null) => {
    if (!isoString) return null;
    return format(new Date(isoString), 'HH:mm');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              Attendance Management
            </h2>
            <p className="text-sm text-muted-foreground font-medium">
              Track daily presence and punctuality.
            </p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isQRCodeOpen} onOpenChange={setIsQRCodeOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-xl">
                  <QrCode className="h-4 w-4" />
                  My QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xs rounded-2xl">
                <DialogHeader>
                  <DialogTitle>My ID Barcode</DialogTitle>
                  <DialogDescription>Show this to the scanner for attendance.</DialogDescription>
                </DialogHeader>
                <div className="flex justify-center py-6">
                  <QRGenerator 
                    staffId={profile?.readable_id || 'GDU-PENDING'} 
                    name={profile?.full_name || ''} 
                    department={profile?.department?.name || 'General'} 
                    role={profile?.role || 'staff'}
                    size={200}
                  />
                </div>
              </DialogContent>
            </Dialog>

            {canScan && (
              <>
                <Dialog open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 rounded-xl">
                      <Search className="h-4 w-4" />
                      Manual Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>Manual Attendance Entry</DialogTitle>
                      <DialogDescription>Enter Staff ID or scan barcode manually.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleManualAttendance} className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Staff ID / Barcode</label>
                        <Input 
                          placeholder="e.g. GDU001" 
                          value={manualStaffId}
                          onChange={(e) => setManualStaffId(e.target.value)}
                          className="text-lg font-mono uppercase"
                          autoFocus
                        />
                      </div>
                      <Button type="submit" className="w-full gap-2" disabled={isSubmittingManual}>
                        {isSubmittingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                        Mark Attendance
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 rounded-xl shadow-lg shadow-primary/20">
                    <ScanQrCode className="h-4 w-4" />
                    Scan Attendance
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Attendance Scanner</DialogTitle>
                    <DialogDescription>Scan a staff member's barcode to record attendance.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <QRScanner />
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
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
                        <SelectItem value="All Departments">All Departments</SelectItem>
                        {(dbDepartments || []).map((dept: any) => (
                          <SelectItem key={dept.id || dept.name} value={dept.name}>
                            {dept.name}
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
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <PortalLoader message="Loading records..." size="sm" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Late Minutes</TableHead>
                        <TableHead>Verification</TableHead>
                        <TableHead>Approval</TableHead>
                        {canManageAttendance && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttendance.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={record.staff?.passport_url || undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs">
                                  {(record.staff?.full_name || 'U')
                                    .split(' ')
                                    .map((n: string) => n[0])
                                    .join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{record.staff?.full_name}</p>
                                <p className="text-xs text-muted-foreground">{record.staff?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{record.staff?.department?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {record.check_in ? (
                              <div className="flex items-center gap-2">
                                <LogIn className="h-4 w-4 text-green-500" />
                                {formatTime(record.check_in)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.check_out ? (
                              <div className="flex items-center gap-2">
                                <LogOut className="h-4 w-4 text-red-500" />
                                {formatTime(record.check_out)}
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
                          <TableCell>
                            {record.verified ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-400 border-gray-200 gap-1">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.approved ? (
                              <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Approved
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200 gap-1">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          {canManageAttendance && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {!record.verified && (
                                  <div className="flex gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-8 text-xs border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                      onClick={() => handleVerify(record)}
                                    >
                                      Verify
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 text-xs text-destructive border-destructive/20 hover:bg-destructive/10">
                                          Decline
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent>
                                        <DropdownMenuLabel>Choose Status</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleDecline(record, 'absent')}>
                                          Mark Absent
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDecline(record, 'late')}>
                                          Mark Late
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDecline(record, 'leave')}>
                                          Mark On Leave
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                                {record.verified && !record.approved && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-xs border-green-200 hover:bg-green-50 hover:text-green-600"
                                    onClick={() => handleApprove(record)}
                                  >
                                    Approve
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" className="h-8 text-xs">
                                  Edit
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {!isLoading && filteredAttendance.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No attendance records found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      No records for this date or criteria
                    </p>
                  </div>
                )}
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
            <Card className="border backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Attendance Reports</CardTitle>
                <CardDescription>
                  Generate and download attendance reports
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <div className="space-y-1">
                  <h3 className="font-bold">Generate Daily Attendance Report</h3>
                  <p className="text-sm text-muted-foreground">Download a detailed report for {date ? format(date, 'PPP') : 'today'}</p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => handleExport('pdf')} className="rounded-xl gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button onClick={() => handleExport('excel')} variant="outline" className="rounded-xl gap-2">
                    <Download className="h-4 w-4" />
                    Download Excel
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

function AttendanceForm({ onSuccess }: { onSuccess: () => void }) {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('present');
  const [method, setMethod] = useState<'manual' | 'qr' | 'facial'>('manual');
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: staffRecords = [] } = useQuery({
    queryKey: ['staff-records-lite'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_records')
        .select('id, full_name')
        .eq('status', 'active')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const handleScan = () => {
    if (!selectedStaff) return toast.error('Please select a staff member first');
    setIsScanning(true);
    // Simulate scanning delay
    setTimeout(() => {
      setIsScanning(false);
      toast.success(`${method === 'qr' ? 'QR Code' : 'Face'} scanned successfully!`);
    }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return toast.error('Please select a staff member');
    
    setIsSubmitting(true);
    try {
      // Check for existing attendance today
      const today = new Date().toISOString().split('T')[0];
      const { data: existing, error: checkError } = await supabase
        .from('attendance')
        .select('*')
        .eq('staff_id', selectedStaff)
        .eq('date', today)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        toast.error('Attendance for this staff has already been recorded today');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('attendance')
        .insert([{
          staff_id: selectedStaff,
          date: today,
          status: attendanceStatus,
          check_in: attendanceStatus === 'present' ? new Date().toISOString() : null,
          verified: false, // Needs admin verification as per requirement
          approved: false,
        }]);

      if (error) throw error;
      toast.success('Attendance recorded and pending verification');
      onSuccess();
    } catch (error: any) {
      toast.error('Failed to record attendance: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Staff</label>
        <Select value={selectedStaff} onValueChange={setSelectedStaff}>
          <SelectTrigger>
            <SelectValue placeholder="Choose staff member" />
          </SelectTrigger>
          <SelectContent>
            {staffRecords.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                {staff.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Verification Method</label>
        <Tabs value={method} onValueChange={(v) => setMethod(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
            <TabsTrigger value="facial">Facial</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {method !== 'manual' && (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-muted/30">
          {isScanning ? (
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
              <p className="text-sm font-medium">
                {method === 'qr' ? 'Scanning QR Code...' : 'Detecting Face...'}
              </p>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                {method === 'qr' ? <FileText className="h-8 w-8 text-primary" /> : <UserCheck className="h-8 w-8 text-primary" />}
              </div>
              <Button type="button" variant="outline" onClick={handleScan}>
                Start {method === 'qr' ? 'QR Scanner' : 'Facial Recognition'}
              </Button>
            </div>
          )}
        </div>
      )}

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
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" type="button" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isScanning}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Record Attendance
        </Button>
      </div>
    </form>
  );
}