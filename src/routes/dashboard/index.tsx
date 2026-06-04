import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { StatCard } from '@/components/dashboard/stat-card';
import { PieChartCard, BarChartCard, AreaChartCard } from '@/components/dashboard/charts';
import {
  Users,
  Clock,
  TrendingUp,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Activity,
  UserPlus,
  MessageSquare,
  Loader2,
  Wallet,
  QrCode,
} from 'lucide-react';
import { QRGenerator } from '@/components/attendance/qr-generator';
import { MonthlyAllowanceStaff } from '@/components/dashboard/monthly-allowance-staff';
import { MonthlyAllowanceAccountant } from '@/components/dashboard/monthly-allowance-accountant';
import { MonthlyAllowanceSummary } from '@/components/dashboard/monthly-allowance-summary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from '@tanstack/react-router';
import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { handleDatabaseError } from '@/lib/error-handler';

import { useNotifications } from '@/lib/hooks/use-notifications';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

export const Route = createFileRoute('/dashboard/')({
  beforeLoad: async ({ context }) => {
    // If no profile, we should redirect to login
    // But we handle this in DashboardLayout for now
  },
  head: () => ({
    meta: [{ title: 'Dashboard — GDU Portal' }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, isSuperAdmin, isAdmin, isAccounts, isDirector, isStaff, loading } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const [mounted, setMounted] = useState(false);
  const [showBirthdayPopup, setShowBirthdayPopup] = useState(false);
  const [birthdayNotifId, setBirthdayNotifId] = useState<string | null>(null);

  // Check for unread birthday notification
  useEffect(() => {
    const birthdayNotif = notifications.find(n => n.type === 'birthday' && !n.is_read);
    if (birthdayNotif) {
      setBirthdayNotifId(birthdayNotif.id);
      setShowBirthdayPopup(true);
    }
  }, [notifications]);

  // Safety check for isStaff
  const userIsStaff = isStaff === true;

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Fetch Weekly Attendance Data
  const { data: weeklyAttendance = [], isLoading: isLoadingAttendanceData } = useQuery({
    queryKey: ['dashboard-weekly-attendance'],
    queryFn: async () => {
      const start = startOfWeek(new Date(), { weekStartsOn: 1 });
      const end = endOfWeek(new Date(), { weekStartsOn: 1 });
      
      const { data, error } = await supabase
        .from('attendance')
        .select('date, status')
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0]);
      
      if (error) {
        handleDatabaseError(error, 'fetch weekly attendance');
        return [];
      }

      const days = eachDayOfInterval({ start, end });
      return days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayRecords = data.filter(r => r.date === dateStr);
        return {
          name: format(day, 'EEE'),
          present: dayRecords.filter(r => r.status === 'present').length,
          absent: dayRecords.filter(r => r.status === 'absent').length,
          late: dayRecords.filter(r => r.status === 'late').length,
        };
      });
    },
    enabled: !!profile && !userIsStaff,
  });

  // 2. Fetch Staff Distribution by Department
  const { data: staffDistribution = [], isLoading: isLoadingDist } = useQuery({
    queryKey: ['dashboard-staff-distribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_records')
        .select('department:departments(name)');
      
      if (error) {
        handleDatabaseError(error, 'fetch staff distribution');
        return [];
      }

      const counts: Record<string, number> = {};
      data.forEach(r => {
        const deptName = r.department?.name || 'Unassigned';
        counts[deptName] = (counts[deptName] || 0) + 1;
      });

      const colors = ['#1e3a8a', '#b45309', '#15803d', '#7e22ce', '#be188a', '#334155'];
      return Object.entries(counts).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }));
    },
    enabled: !!profile && !userIsStaff,
  });

  // 3. Fetch Monthly Payroll Trend
  const { data: payrollTrend = [], isLoading: isLoadingPayroll } = useQuery({
    queryKey: ['dashboard-payroll-trend'],
    queryFn: async () => {
      const now = new Date();
      const months = Array.from({ length: 5 }).map((_, i) => subMonths(now, 4 - i));
      
      const { data, error } = await supabase
        .from('payroll')
        .select('month, year, net_salary');
      
      if (error) {
        handleDatabaseError(error, 'fetch payroll trend');
        return [];
      }

      return months.map(m => {
        const monthNum = m.getMonth() + 1;
        const yearNum = m.getFullYear();
        const monthData = data.filter(r => r.month === monthNum && r.year === yearNum);
        const total = monthData.reduce((sum, r) => sum + Number(r.net_salary), 0);
        return {
          name: format(m, 'MMM'),
          value: total || 0
        };
      });
    },
    enabled: !!profile && !userIsStaff,
  });

  // 4. Fetch Recent Activity (Audit Logs)
  const { data: recentActivities = [], isLoading: isLoadingActivities } = useQuery({
    queryKey: ['dashboard-recent-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, created_at, user:profiles(full_name, avatar_url)')
        .order('created_at', { descending: true })
        .limit(10);
      
      if (error) {
        // Don't show toast for this one as it's less critical
        console.error('Error fetching audit logs:', error);
        return [];
      }

      return data.map(log => ({
        id: log.id,
        user: log.user?.full_name || 'System',
        action: log.action.toLowerCase(),
        time: format(new Date(log.created_at), 'p'),
        avatar: log.user?.avatar_url || ''
      }));
    },
    enabled: !!profile && !userIsStaff,
  });

  // 5. Fetch Pending Approvals
  const { data: pendingApprovals = [], isLoading: isLoadingApprovals } = useQuery({
    queryKey: ['dashboard-pending-approvals'],
    queryFn: async () => {
      const [leaves, allowances, docs] = await Promise.all([
        supabase.from('leave_requests').select('id, staff:staff_records(full_name), created_at').eq('status', 'pending').limit(5),
        supabase.from('monthly_allowance_requests' as any).select('id, staff:staff_records(full_name), created_at').eq('status', 'Processing').limit(5),
        supabase.from('documents').select('id, name, staff:staff_records(full_name), created_at').eq('status', 'pending').limit(5)
      ]);

      const allPending: any[] = [];
      
      leaves.data?.forEach(l => allPending.push({
        id: l.id,
        type: 'Leave Request',
        staff: l.staff?.full_name || 'Unknown',
        date: format(new Date(l.created_at), 'yyyy-MM-dd')
      }));

      allowances.data?.forEach(a => allPending.push({
        id: a.id,
        type: 'Allowance Request',
        staff: a.staff?.full_name || 'Unknown',
        date: format(new Date(a.created_at), 'yyyy-MM-dd')
      }));

      docs.data?.forEach(d => allPending.push({
        id: d.id,
        type: `Document: ${d.name}`,
        staff: d.staff?.full_name || 'Unknown',
        date: format(new Date(d.created_at), 'yyyy-MM-dd')
      }));

      return allPending.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    },
    enabled: !!profile && !userIsStaff,
  });

  // 6. Fetch Global Stats for Admin
  const { data: globalStats } = useQuery({
    queryKey: ['dashboard-global-stats'],
    queryFn: async () => {
      const [docs, depts] = await Promise.all([
        supabase.from('documents').select('*', { count: 'exact', head: true }),
        supabase.from('departments').select('*', { count: 'exact', head: true }).eq('is_active', true)
      ]);
      return {
        totalDocuments: docs.count || 0,
        totalDepartments: depts.count || 0
      };
    },
    enabled: !!profile && !userIsStaff,
  });

  // Fetch personal allowances for staff
  const { data: myAllowances = [] } = useQuery({
    queryKey: ['my-allowances', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('allowances')
        .select('*')
        .eq('staff_id', profile.id)
        .order('payment_date', { descending: true })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: userIsStaff && !!profile?.id,
  });

  // Admin/Global Stats
  const { data: staffStats } = useQuery({
    queryKey: ['dashboard-staff-stats'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('staff_records')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return { total: count || 0 };
    },
    enabled: !userIsStaff && !!profile,
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ['dashboard-attendance-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('status')
        .eq('date', today);
      
      if (error) throw error;
      
      return {
        presentToday: data.filter(r => r.status === 'present' || r.status === 'late').length,
        absentToday: data.filter(r => r.status === 'absent').length,
      };
    },
    enabled: !userIsStaff && !!profile,
  });

  const { data: allowanceStats } = useQuery({
    queryKey: ['dashboard-allowance-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_allowance_requests' as any)
        .select('status');
      
      if (error) throw error;

      return {
        pending: data.filter(r => r.status === 'Processing').length,
        paid: data.filter(r => r.status === 'Paid').length,
      };
    },
    enabled: !userIsStaff && !!profile,
  });

  const { data: departmentStats } = useQuery({
    queryKey: ['dashboard-department-stats'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('departments')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      if (error) throw error;
      return { total: count || 0 };
    },
    enabled: !userIsStaff && !!profile,
  });

  // Staff Personal Stats
  const { data: personalStats } = useQuery({
    queryKey: ['dashboard-personal-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      
      const { data: records, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('staff_id', profile.id)
        .eq('approved', true);
      
      if (error) throw error;
      
      const presentCount = records.filter(r => r.status === 'present').length;
      const totalCount = records.length || 1;
      const rate = Math.round((presentCount / totalCount) * 100);
      
      return {
        attendanceRate: rate,
        totalPresent: presentCount,
        lastCheckIn: records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.check_in
      };
    },
    enabled: userIsStaff && !!profile?.id,
  });

  // 7. Fetch Current Month Allowance
  const { data: allowanceSetting } = useQuery({
    queryKey: ['dashboard-allowance-setting'],
    queryFn: async () => {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const { data, error } = await supabase
        .from('monthly_allowance_settings')
        .select('amount')
        .eq('month', month)
        .eq('year', year)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!profile && !userIsStaff,
  });

  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
      }).format(value);
    } catch (e) {
      return `₦${value.toLocaleString()}`;
    }
  };

  if (!mounted || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Initializing dashboard...</p>
          </div>
        </div>

      {/* Birthday Celebration Popup */}
      <Dialog open={showBirthdayPopup} onOpenChange={(open) => {
        setShowBirthdayPopup(open);
        if (!open && birthdayNotifId) {
          markAsRead.mutate(birthdayNotifId);
        }
      }}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-pink-50 via-white to-purple-50 border-pink-200">
          <DialogHeader className="flex flex-col items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-pink-100 flex items-center justify-center text-4xl animate-bounce">
              🎂
            </div>
            <DialogTitle className="text-2xl font-black text-pink-600 tracking-tight text-center">
              Happy Birthday, {profile?.full_name?.split(' ')[0]}!
            </DialogTitle>
            <DialogDescription className="text-center text-slate-600 font-medium leading-relaxed">
              “Wishing you good health, success, and happiness on your special day and always. Thank you for your contributions to the GDU team!”
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex sm:justify-center mt-4">
            <Button 
              onClick={() => {
                setShowBirthdayPopup(false);
                if (birthdayNotifId) markAsRead.mutate(birthdayNotifId);
              }}
              className="bg-pink-500 hover:bg-pink-600 text-white rounded-full px-8 shadow-lg shadow-pink-200"
            >
              Thank You!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

  const attendanceRate = staffStats?.total ? Math.round((attendanceStats?.presentToday || 0) / staffStats.total * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              Welcome back, {profile?.full_name?.split(' ')[0]}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {userIsStaff ? "Here's your personal overview for today." : "Here's what's happening with GDU today."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Calendar className="mr-2 h-4 w-4" />
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Button>
            {!userIsStaff && (
              <Button size="sm" className="shadow-lg shadow-primary/20">
                <TrendingUp className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            )}
          </div>
        </div>

        {/* Global Admin Stats */}
        {!userIsStaff && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Staff"
              value={staffStats?.total.toString() || '0'}
              icon={Users}
              trend="+2.5%"
              description="from last month"
            />
            <StatCard
              title="Present Today"
              value={attendanceStats?.presentToday.toString() || '0'}
              icon={CheckCircle}
              trend={`${attendanceRate}%`}
              description="attendance rate"
            />
            <StatCard
              title="Absent Today"
              value={attendanceStats?.absentToday.toString() || '0'}
              icon={AlertCircle}
              variant="danger"
              description="Requires attention"
            />
            <StatCard
              title="Paid Allowances"
              value={allowanceStats?.paid.toString() || '0'}
              icon={Wallet}
              variant="success"
              description="Processed this month"
            />
          </div>
        )}

        {/* Monthly Allowance Management/Summary for Admin/Accountant/DG/etc */}
        {!userIsStaff && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Monthly Allowance System
              </h2>
            </div>
            {isAccounts ? <MonthlyAllowanceAccountant /> : <MonthlyAllowanceSummary />}
          </div>
        )}

        {/* Staff Personal Stats */}
        {userIsStaff && (
          <div className="grid gap-6 md:grid-cols-12">
            <div className="md:col-span-8 space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  title="Attendance Rate"
                  value={`${personalStats?.attendanceRate || 0}%`}
                  icon={CheckCircle}
                  description="Overall presence"
                />
                <StatCard
                  title="Total Present"
                  value={personalStats?.totalPresent.toString() || '0'}
                  icon={Activity}
                  description="Days recorded"
                />
                <StatCard
                  title="Last Check-in"
                  value={personalStats?.lastCheckIn ? new Date(personalStats.lastCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
                  icon={Clock}
                  description="Today's status"
                />
              </div>

              {/* Monthly Allowance Section */}
              <MonthlyAllowanceStaff />

              {/* Personal Allowances Card */}
              <Card className="border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    My Recent Allowances
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/dashboard/allowances">View All</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {myAllowances.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No allowances processed yet.</p>
                    ) : (
                      myAllowances.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <DollarSign className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{item.title}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">{new Date(item.payment_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <p className="text-sm font-black text-slate-900">₦{item.amount.toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-4">
              <Card className="border shadow-xl bg-gradient-to-br from-primary/5 via-white to-white overflow-hidden sticky top-24">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <QrCode className="h-32 w-32" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-primary" />
                    Digital Staff ID
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 pt-4">
                  <div className="p-4 bg-white rounded-2xl shadow-lg border-2 border-primary/10">
                    <QRGenerator 
                      staffId={profile?.readable_id || 'GDU-PENDING'} 
                      name={profile?.full_name || ''} 
                      department={profile?.department?.name || 'General'} 
                      role={profile?.role || 'staff'}
                      size={180}
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-lg font-black text-slate-900 uppercase italic tracking-tight">{profile?.full_name}</p>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">{profile?.position}</p>
                  </div>
                  <div className="w-full h-[1px] bg-slate-100 my-2" />
                  <p className="text-[10px] text-muted-foreground px-6 text-center leading-relaxed font-medium">
                    Show this QR code to the portal scanner at the entrance to record your daily attendance.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {!userIsStaff && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Pending Approvals"
              value={pendingApprovals.length}
              subtitle={isLoadingApprovals ? "Loading..." : "Awaiting your review"}
              icon={AlertCircle}
              variant="danger"
            />
            <StatCard
              title="Documents Uploaded"
              value={globalStats?.totalDocuments || 0}
              subtitle="Total in system"
              icon={FileText}
            />
            <StatCard
              title="Active Departments"
              value={globalStats?.totalDepartments || 0}
              subtitle="Operational units"
              icon={Activity}
              variant="success"
            />
          </div>
        )}

        {!userIsStaff && (
          <div className="grid gap-4 lg:grid-cols-2">
            <BarChartCard
              title="Weekly Attendance Overview"
              description="Present, absent and late attendance"
              data={weeklyAttendance}
              isLoading={isLoadingAttendanceData}
              bars={[
                { dataKey: 'present', color: '#16a34a', name: 'Present' },
                { dataKey: 'absent', color: '#dc2626', name: 'Absent' },
                { dataKey: 'late', color: '#f59e0b', name: 'Late' },
              ]}
            />

            <PieChartCard
              title="Staff Distribution"
              description="By department"
              data={staffDistribution}
              isLoading={isLoadingDist}
            />
          </div>
        )}

        {!userIsStaff && (
          <div className="grid gap-4 lg:grid-cols-3">
            <AreaChartCard
              title="Monthly Payroll Trend"
              description="Payroll expenditure over time"
              data={payrollTrend}
              isLoading={isLoadingPayroll}
              areas={[{ dataKey: 'value', color: 'var(--gold)', name: 'Expenditure' }]}
              className="lg:col-span-2"
            />

            <Card className="border backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary" asChild>
                  <Link to="/dashboard/settings/audit-logs">
                    View All
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px]">
                  <div className="space-y-4">
                    {isLoadingActivities ? (
                      <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                    ) : recentActivities.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">No recent activity logged.</div>
                    ) : (
                      recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={activity.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs">
                              {activity.user.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium">{activity.user}</span>{' '}
                              <span className="text-muted-foreground">{activity.action}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">{activity.time}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {!userIsStaff && (
            <Card className="border backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Pending Approvals</CardTitle>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {pendingApprovals.length} pending
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingApprovals ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                  ) : pendingApprovals.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">No pending approvals found.</div>
                  ) : (
                    pendingApprovals.map((approval) => (
                      <div
                        key={approval.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{approval.type}</p>
                            <p className="text-xs text-muted-foreground">{approval.staff}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{approval.date}</span>
                          <Button size="sm" variant="outline" asChild>
                             <Link to={approval.type.includes('Leave') ? '/dashboard/staff' : approval.type.includes('Allowance') ? '/dashboard' : '/dashboard/documents'}>Review</Link>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className={cn("border backdrop-blur-sm", userIsStaff && "lg:col-span-2")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("grid gap-3", userIsStaff ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2")}>
                {(isAdmin || isSuperAdmin) && (
                  <>
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col gap-2 justify-center"
                      asChild
                    >
                      <Link to="/dashboard/staff">
                        <UserPlus className="h-5 w-5" />
                        <span className="text-xs">Add Staff</span>
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col gap-2 justify-center"
                      asChild
                    >
                      <Link to="/dashboard/attendance">
                        <Clock className="h-5 w-5" />
                        <span className="text-xs">Mark Attendance</span>
                      </Link>
                    </Button>
                  </>
                )}
                {isAccounts && (
                  <>
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col gap-2 justify-center"
                      asChild
                    >
                      <Link to="/dashboard/payroll">
                        <DollarSign className="h-5 w-5" />
                        <span className="text-xs">Process Payroll</span>
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col gap-2 justify-center"
                      asChild
                    >
                      <Link to="/dashboard/payroll">
                        <TrendingUp className="h-5 w-5" />
                        <span className="text-xs">Add Allowance</span>
                      </Link>
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2 justify-center"
                  asChild
                >
                  <Link to="/dashboard/chat">
                    <MessageSquare className="h-5 w-5" />
                    <span className="text-xs">Send Message</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col gap-2 justify-center"
                  asChild
                >
                  <Link to="/dashboard/nominal-roll">
                    <FileText className="h-5 w-5" />
                    <span className="text-xs">Generate Roll</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}