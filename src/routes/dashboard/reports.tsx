import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { useState } from 'react';
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
} from 'lucide-react';

export const Route = createFileRoute('/dashboard/reports')({
  head: () => ({
    meta: [{ title: 'Reports & Analytics — GDU Portal' }],
  }),
  component: ReportsPage,
});

const attendanceTrend = [
  { name: 'Week 1', present: 142, absent: 8, late: 6 },
  { name: 'Week 2', present: 145, absent: 6, late: 5 },
  { name: 'Week 3', present: 140, absent: 10, late: 6 },
  { name: 'Week 4', present: 148, absent: 4, late: 4 },
];

const staffByDepartment = [
  { name: 'Administration', value: 35, color: 'hsl(var(--primary))' },
  { name: 'Finance', value: 25, color: 'hsl(var(--gold))' },
  { name: 'Operations', value: 45, color: 'hsl(142 76% 36%)' },
  { name: 'ICT', value: 18, color: 'hsl(340 75% 55%)' },
  { name: 'HR', value: 15, color: 'hsl(25 95% 53%)' },
  { name: 'Others', value: 18, color: 'hsl(280 67% 52%)' },
];

const payrollTrend = [
  { name: 'Jan', value: 45000000 },
  { name: 'Feb', value: 48000000 },
  { name: 'Mar', value: 52000000 },
  { name: 'Apr', value: 49000000 },
  { name: 'May', value: 55000000 },
];

const leaveStats = [
  { name: 'Annual', value: 45, color: 'hsl(142 76% 36%)' },
  { name: 'Sick', value: 20, color: 'hsl(0 84% 60%)' },
  { name: 'Maternity', value: 12, color: 'hsl(340 75% 55%)' },
  { name: 'Paternity', value: 8, color: 'hsl(25 95% 53%)' },
  { name: 'Study', value: 5, color: 'hsl(280 67% 52%)' },
];

const monthlyNewStaff = [
  { name: 'Jan', value: 3 },
  { name: 'Feb', value: 5 },
  { name: 'Mar', value: 2 },
  { name: 'Apr', value: 8 },
  { name: 'May', value: 4 },
];

import { exportToPDF, exportToExcel, exportToCSV } from '@/lib/utils/export';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

function ReportsPage() {
  const { canAccess } = useAuth();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState('this-month');
  const [department, setDepartment] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
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

      if (format === 'pdf') {
        exportToPDF({ data, filename, title, headers });
      } else if (format === 'excel') {
        exportToExcel({ data, filename });
      } else {
        exportToCSV({ data, filename });
      }
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error("Export failed: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries();
    toast.success("Reports data refreshed");
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
                  <p className="text-2xl font-bold">156</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    +5.2% from last month
                  </p>
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
                  <p className="text-sm text-muted-foreground">Avg. Attendance</p>
                  <p className="text-2xl font-bold">91.2%</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    +2.3% from last week
                  </p>
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
                  <p className="text-2xl font-bold">{formatCurrency(55000000)}</p>
                  <p className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                    May 2026 disbursement
                  </p>
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
                  <p className="text-2xl font-bold">142</p>
                  <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />
                    91% of total staff
                  </p>
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
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <AreaChartCard
                title="Payroll Trend"
                description="Monthly payroll expenditure"
                data={payrollTrend}
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
                        <p className="text-sm font-medium">Active Staff</p>
                        <p className="text-xs text-muted-foreground">Currently active</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold">142</p>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Late Arrivals</p>
                        <p className="text-xs text-muted-foreground">Today</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold">6</p>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Absent</p>
                        <p className="text-xs text-muted-foreground">Today</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold">8</p>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">On Leave</p>
                        <p className="text-xs text-muted-foreground">Currently</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold">4</p>
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
              />
              <AreaChartCard
                title="New Staff Joined"
                description="Monthly recruitment trend"
                data={monthlyNewStaff}
                areas={[{ dataKey: 'value', color: 'hsl(var(--primary))', name: 'New Staff' }]}
              />
            </div>
            <Card className="border backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Staff Summary</CardTitle>
                <CardDescription>Current staff statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold text-primary">156</p>
                    <p className="text-sm text-muted-foreground">Total Staff</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold text-green-600">142</p>
                    <p className="text-sm text-muted-foreground">Active</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold text-yellow-600">8</p>
                    <p className="text-sm text-muted-foreground">Inactive</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold text-blue-600">6</p>
                    <p className="text-sm text-muted-foreground">On Leave</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <BarChartCard
                title="Attendance by Week"
                description="Present, absent, and late trends"
                data={attendanceTrend}
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
              />
            </div>
          </TabsContent>

          <TabsContent value="payroll" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <AreaChartCard
                title="Monthly Payroll"
                description="Payroll expenditure trend"
                data={payrollTrend}
                areas={[{ dataKey: 'value', color: 'hsl(var(--gold))', name: 'Expenditure' }]}
              />
              <Card className="border backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Payroll Summary</CardTitle>
                  <CardDescription>May 2026</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">Basic Salary</span>
                    <span className="font-semibold">{formatCurrency(38500000)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">Allowances</span>
                    <span className="font-semibold text-green-600">{formatCurrency(21500000)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm">Deductions</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(5000000)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <span className="text-sm font-medium">Total Net Salary</span>
                    <span className="font-bold text-lg">{formatCurrency(55000000)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}