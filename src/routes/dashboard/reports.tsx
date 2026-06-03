import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChartCard,
  PieChartCard,
  AreaChartCard,
} from '@/components/dashboard/charts';
import {
  Download,
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  Calendar,
  Filter,
  RefreshCw,
  Eye,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToPDF, exportToExcel, exportToCSV } from '@/lib/utils/export';
import { handleDatabaseError, handlePortalNotification } from '@/lib/error-handler';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

export const Route = createFileRoute('/dashboard/reports')({
  head: () => ({
    meta: [{ title: 'Reports & Analytics — GDU Portal' }],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { canAccess } = useAuth();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState('this-month');
  const [isExporting, setIsExporting] = useState(false);

  // 1. Fetch Attendance Trend
  const { data: attendanceTrend = [], isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['reports-attendance-trend'],
    queryFn: async () => {
      const now = new Date();
      const weeks = [3, 2, 1, 0].map(w => {
        const start = startOfWeek(subMonths(now, 0), { weekStartsOn: 1 });
        // Simplified for now: just get last 4 weeks
        return { start: startOfWeek(new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000)), end: endOfWeek(new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000)) };
      });

      const results = [];
      for (const [index, week] of weeks.entries()) {
        const { data, error } = await supabase
          .from('attendance')
          .select('status')
          .gte('date', week.start.toISOString().split('T')[0])
          .lte('date', week.end.toISOString().split('T')[0]);
        
        if (error) continue;
        results.push({
          name: `Week ${index + 1}`,
          present: data.filter(r => r.status === 'present').length,
          absent: data.filter(r => r.status === 'absent').length,
          late: data.filter(r => r.status === 'late').length,
        });
      }
      return results;
    }
  });

  // 2. Fetch Staff Distribution
  const { data: staffByDepartment = [], isLoading: isLoadingDist } = useQuery({
    queryKey: ['reports-staff-dist'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_records').select('department:departments(name)');
      if (error) return [];
      const counts: Record<string, number> = {};
      data.forEach(r => {
        const name = r.department?.name || 'Other';
        counts[name] = (counts[name] || 0) + 1;
      });
      const colors = ['#1e3a8a', '#b45309', '#15803d', '#7e22ce', '#be185d', '#334155'];
      return Object.entries(counts).map(([name, value], i) => ({
        name, value, color: colors[i % colors.length]
      }));
    }
  });

  // 3. Fetch Payroll Trend
  const { data: payrollTrend = [], isLoading: isLoadingPayroll } = useQuery({
    queryKey: ['reports-payroll-trend'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payroll').select('month, year, net_salary');
      if (error) return [];
      const now = new Date();
      return [4, 3, 2, 1, 0].map(m => {
        const date = subMonths(now, m);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const total = data.filter(r => r.month === month && r.year === year).reduce((sum, r) => sum + Number(r.net_salary), 0);
        return { name: format(date, 'MMM'), value: total };
      });
    }
  });

  // 4. Fetch Leave Stats
  const { data: leaveStats = [], isLoading: isLoadingLeave } = useQuery({
    queryKey: ['reports-leave-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leave_requests').select('type');
      if (error) return [];
      const counts: Record<string, number> = {};
      data.forEach(r => {
        counts[r.type] = (counts[r.type] || 0) + 1;
      });
      const colors = ['#15803d', '#dc2626', '#be185d', '#f59e0b', '#7e22ce'];
      return Object.entries(counts).map(([name, value], i) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        value, 
        color: colors[i % colors.length]
      }));
    }
  });

  // 5. Fetch New Staff Trend
  const { data: monthlyNewStaff = [] } = useQuery({
    queryKey: ['reports-new-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_records').select('employment_date');
      if (error) return [];
      const now = new Date();
      return [4, 3, 2, 1, 0].map(m => {
        const date = subMonths(now, m);
        const monthStr = format(date, 'yyyy-MM');
        const count = data.filter(r => r.employment_date?.startsWith(monthStr)).length;
        return { name: format(date, 'MMM'), value: count };
      });
    }
  });

  // 6. Fetch Global Summary Stats
  const { data: summaryStats } = useQuery({
    queryKey: ['reports-summary-stats'],
    queryFn: async () => {
      const [staff, attendance, payroll, activeUsers] = await Promise.all([
        supabase.from('staff_records').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('status').eq('date', new Date().toISOString().split('T')[0]),
        supabase.from('payroll').select('net_salary').eq('month', new Date().getMonth() + 1),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).not('last_seen', 'is', null)
      ]);

      return {
        totalStaff: staff.count || 0,
        todayAttendance: attendance.data?.length ? (attendance.data.filter(r => r.status === 'present').length / staff.count! * 100).toFixed(1) : 0,
        monthlyPayroll: payroll.data?.reduce((sum, r) => sum + Number(r.net_salary), 0) || 0,
        activeUsers: activeUsers.count || 0
      };
    }
  });

  const handleExport = async (formatType: 'pdf' | 'excel' | 'csv') => {
    setIsExporting(true);
    try {
      const data = [
        ...attendanceTrend.map(t => ({ Category: 'Attendance', Label: t.name, Value: t.present })),
        ...staffByDepartment.map(d => ({ Category: 'Staff', Label: d.name, Value: d.value })),
        ...payrollTrend.map(p => ({ Category: 'Payroll', Label: p.name, Value: p.value })),
      ];

      const filename = `GDU_Report_${new Date().toISOString().split('T')[0]}`;
      const title = "GDU PORTAL - CONSOLIDATED WORKFORCE REPORT";
      const headers = ["Category", "Label", "Value"];

      if (formatType === 'pdf') {
        exportToPDF({ data, filename, title, headers });
      } else if (formatType === 'excel') {
        exportToExcel({ data, filename });
      } else {
        exportToCSV({ data, filename });
      }
      handlePortalNotification(`Report exported as ${formatType.toUpperCase()}`, { severity: 'success' });
    } catch (err: any) {
      handlePortalNotification("Export failed: " + err.message, { severity: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries();
    handlePortalNotification("Reports data refreshed", { severity: 'success' });
  };

  const canViewReports = canAccess('reports', 'view');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Workforce insights and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-quarter">This Quarter</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={isExporting}>
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Export Report
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl w-48">
                <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-red-600" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2 cursor-pointer">
                  <BarChart3 className="h-4 w-4 text-green-600" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Staff</p>
                  <p className="text-2xl font-bold">{summaryStats?.totalStaff || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today Attendance</p>
                  <p className="text-2xl font-bold">{summaryStats?.todayAttendance || 0}%</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Payroll</p>
                  <p className="text-2xl font-bold">{formatCurrency(summaryStats?.monthlyPayroll || 0)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{summaryStats?.activeUsers || 0}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="staff">Staff Analytics</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <BarChartCard
                title="Attendance Trend"
                description="Weekly attendance overview"
                data={attendanceTrend}
                isLoading={isLoadingAttendance}
                bars={[
                  { dataKey: 'present', color: 'hsl(142 76% 36%)', name: 'Present' },
                  { dataKey: 'absent', color: 'hsl(0 84% 60%)', name: 'Absent' },
                  { dataKey: 'late', color: 'hsl(38 92% 50%)', name: 'Late' },
                ]}
              />
              <PieChartCard
                title="Staff Distribution"
                description="By department"
                data={staffByDepartment}
                isLoading={isLoadingDist}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <AreaChartCard
                title="Payroll Trend"
                description="Monthly payroll expenditure"
                data={payrollTrend}
                isLoading={isLoadingPayroll}
                areas={[{ dataKey: 'value', color: 'hsl(var(--gold))', name: 'Expenditure' }]}
              />
              <Card className="border backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total Active Staff</p>
                        <p className="text-xs text-muted-foreground">Currently active</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold">{summaryStats?.totalStaff || 0}</p>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Logged In Users</p>
                        <p className="text-xs text-muted-foreground">In system</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold">{summaryStats?.activeUsers || 0}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="staff" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <PieChartCard
                title="Staff by Department"
                description="Workforce distribution"
                data={staffByDepartment}
                isLoading={isLoadingDist}
              />
              <AreaChartCard
                title="New Staff Joined"
                description="Monthly recruitment trend"
                data={monthlyNewStaff}
                areas={[{ dataKey: 'value', color: 'hsl(var(--primary))', name: 'New Staff' }]}
              />
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <BarChartCard
                title="Attendance by Week"
                description="Present, absent, and late trends"
                data={attendanceTrend}
                isLoading={isLoadingAttendance}
                bars={[
                  { dataKey: 'present', color: 'hsl(142 76% 36%)', name: 'Present' },
                  { dataKey: 'absent', color: 'hsl(0 84% 60%)', name: 'Absent' },
                  { dataKey: 'late', color: 'hsl(38 92% 50%)', name: 'Late' },
                ]}
              />
              <PieChartCard
                title="Leave Type Distribution"
                description="By leave category"
                data={leaveStats}
                isLoading={isLoadingLeave}
              />
            </div>
          </TabsContent>

          <TabsContent value="payroll" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <AreaChartCard
                title="Monthly Payroll"
                description="Payroll expenditure trend"
                data={payrollTrend}
                isLoading={isLoadingPayroll}
                areas={[{ dataKey: 'value', color: 'hsl(var(--gold))', name: 'Expenditure' }]}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}