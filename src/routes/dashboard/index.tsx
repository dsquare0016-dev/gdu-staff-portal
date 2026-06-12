import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
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
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { handleDatabaseError } from '@/lib/error-handler';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, subMonths } from 'date-fns';

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
  const { profile, isSuperAdmin, isAdmin, isAccounts, isDirector, isStaff, isTechnicalAssistant, loading, authError } = useAuth();
  const { notifications, markAsRead } = useNotifications();
  const [mounted, setMounted] = useState(false);
  const [showBirthdayPopup, setShowBirthdayPopup] = useState(false);
  const [birthdayNotifId, setBirthdayNotifId] = useState<string | null>(null);

  const navigate = useNavigate();

  // Redirect if not logged in and not loading
  useEffect(() => {
    if (mounted && !loading && !profile && !authError) {
      console.log('[Dashboard] No session found, redirecting to login...');
      navigate({ to: '/' });
    }
  }, [mounted, loading, profile, authError, navigate]);

  // Check for unread birthday notification
  useEffect(() => {
    const birthdayNotif = notifications.find(n => (n.type as string) === 'birthday' && !n.is_read);
    if (birthdayNotif) {
      setBirthdayNotifId(birthdayNotif.id);
      setShowBirthdayPopup(true);
    }
  }, [notifications]);

  // Safety check for isStaff
  const userIsStaff = isStaff === true;

  useEffect(() => {
    setMounted(true);
    console.log('DASHBOARD_LOADED');
  }, []);

  // 1. Fetch Weekly Attendance Data
  const { data: weeklyAttendance = [] as any[], isLoading: isLoadingAttendanceData } = useQuery({
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
        return [] as any[];
      }

      const days = eachDayOfInterval({ start, end });
      return days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayRecords = (data || []).filter(r => r.date === dateStr);
        return {
          name: format(day, 'EEE'),
          present: dayRecords.filter(r => r.status === 'present').length,
          absent: dayRecords.filter(r => r.status === 'absent').length,
          late: dayRecords.filter(r => r.status === 'late').length,
        };
      }) as any[];
    },
    enabled: !!profile && (isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector),
  });

  const { data: staffDistribution = [] as any[], isLoading: isLoadingDist } = useQuery({
    queryKey: ['dashboard-staff-distribution'],
    queryFn: async () => {
      // 1. Fetch staff records
      const { data: staff, error: staffError } = await supabase
        .from('staff_records')
        .select('department_id');
      
      if (staffError) {
        handleDatabaseError(staffError, 'fetch staff records');
        return [] as any[];
      }

      // 2. Fetch departments
      const { data: depts, error: deptsError } = await supabase
        .from('departments')
        .select('id, name');
      
      if (deptsError) {
        handleDatabaseError(deptsError, 'fetch departments');
        return [] as any[];
      }

      const deptMap = (depts || []).reduce((acc: Record<string, string>, d: any) => {
        acc[d.id] = d.name;
        return acc;
      }, {});

      const dist: Record<string, number> = {};
      (staff || []).forEach((s: any) => {
        const deptName = s.department_id ? (deptMap[s.department_id] || 'Unassigned') : 'Unassigned';
        dist[deptName] = (dist[deptName] || 0) + 1;
      });
      return Object.entries(dist).map(([name, value]) => ({ name, value })) as any[];
    },
    enabled: !!profile && (isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector),
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
        const monthData = (data || []).filter(r => r.month === monthNum && r.year === yearNum);
        const total = monthData.reduce((sum, r) => sum + Number(r.net_salary), 0);
        return {
          name: format(m, 'MMM'),
          value: total || 0
        };
      });
    },
    enabled: !!profile && (isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector),
  });

  // 4. Fetch Recent Activity (Audit Logs)
  const { data: recentActivities = [] as any[], isLoading: isLoadingActivities } = useQuery({
    queryKey: ['dashboard-recent-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, created_at, user:profiles(full_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        // Don't show toast for this one as it's less critical
        console.error('Error fetching audit logs:', error);
        return [] as any[];
      }

      return (data || []).map(log => ({
        id: log.id,
        user: (log.user as any)?.full_name || 'System',
        action: log.action.toLowerCase(),
        time: format(new Date(log.created_at), 'p'),
        avatar: (log.user as any)?.avatar_url || ''
      })) as any[];
    },
    enabled: !!profile && (isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector),
  });

  // 5. Fetch Pending Approvals
  const { data: pendingApprovals = [], isLoading: isLoadingApprovals } = useQuery({
    queryKey: ['dashboard-pending-approvals'],
    queryFn: async () => {
      const allPending: any[] = [];
      
      try {
        // Fetch leave requests with staff name (this join is safe)
        const { data: leaves } = await supabase
          .from('leave_requests')
          .select('id, staff_id, created_at')
          .eq('status', 'pending')
          .limit(5);
        
        leaves?.forEach(l => allPending.push({
          id: l.id,
          type: 'Leave Request',
          staff: 'Staff Member',
          staff_id: l.staff_id,
          date: format(new Date(l.created_at), 'yyyy-MM-dd')
        }));
      } catch (e) { /* non-critical */ }

      try {
        // Fetch monthly allowance requests — avoid joining staff_records to prevent relationship error
        const { data: allowances } = await supabase
          .from('monthly_allowance_requests')
          .select('id, staff_id, created_at')
          .eq('status', 'Processing')
          .limit(5);
        
        allowances?.forEach(a => allPending.push({
          id: a.id,
          type: 'Allowance Request',
          staff: 'Staff Member',
          staff_id: a.staff_id,
          date: format(new Date(a.created_at), 'yyyy-MM-dd')
        }));
      } catch (e) { /* non-critical */ }

      try {
        // Fetch documents
        const { data: docs } = await supabase
          .from('documents')
          .select('id, name, staff_id, created_at')
          .eq('status', 'pending')
          .limit(5);
        
        docs?.forEach(d => allPending.push({
          id: d.id,
          type: `Document: ${d.name}`,
          staff: 'Staff Member',
          staff_id: d.staff_id,
          date: format(new Date(d.created_at), 'yyyy-MM-dd')
        }));
      } catch (e) { /* non-critical */ }

      // Batch fetch staff names for all collected staff_ids
      const staffIds = [...new Set(allPending.map(p => p.staff_id).filter(Boolean))];
      if (staffIds.length > 0) {
        try {
          const { data: staffData, error: staffError } = await supabase
            .from('staff_records')
            .select('id, full_name')
            .in('id', staffIds);
          
          if (staffError) throw staffError;

          const staffMap = (staffData || []).reduce((acc: Record<string, string>, s: any) => {
            acc[s.id] = s.full_name;
            return acc;
          }, {});
          
          allPending.forEach(p => {
            if (p.staff_id && staffMap[p.staff_id]) {
              p.staff = staffMap[p.staff_id];
            }
          });
        } catch (e) { /* non-critical */ }
      }

      return allPending.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5) as any[];
    },
    enabled: !!profile && (isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector),
  });

  const { data: globalStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard-global-stats'],
    queryFn: async () => {
      const [
        { count: totalStaff, error: err1 },
        { count: totalDepts, error: err2 },
        { count: totalDocs, error: err3 }
      ] = await Promise.all([
        supabase.from('staff_records').select('*', { count: 'exact', head: true }),
        supabase.from('departments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('documents').select('*', { count: 'exact', head: true })
      ]);
      
      if (err1 || err2 || err3) {
        console.warn('[Dashboard] Stats fetch warning:', err1?.message || err2?.message || err3?.message);
      }

      return {
        totalStaff: totalStaff || 0,
        totalDepartments: totalDepts || 0,
        totalDocuments: totalDocs || 0
      } as any;
    },
    enabled: !!profile && (isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector),
  });

  // Fetch personal allowances for staff
  const { data: myAllowances = [] } = useQuery({
    queryKey: ['my-allowances', profile?.staff_id],
    queryFn: async () => {
      if (!profile?.staff_id) return [];
      try {
        const { data, error } = await supabase
          .from('allowances')
          .select('*')
          .eq('staff_id', profile.staff_id)
          .order('payment_date', { ascending: false })
          .limit(3);
        if (error) {
          console.warn('[Dashboard] Failed to fetch personal allowances:', error.message);
          return [];
        }
        return data || [];
      } catch (e: any) {
        console.warn('[Dashboard] Exception fetching personal allowances:', e.message);
        return [];
      }
    },
    enabled: userIsStaff && !!profile?.staff_id,
  });

  const { data: staffStats, isLoading: isLoadingStaffStats } = useQuery({
    queryKey: ['dashboard-staff-stats'],
    queryFn: async () => {
      const [
        { count: total, error: err1 },
        { count: active, error: err2 }
      ] = await Promise.all([
        supabase.from('staff_records').select('*', { count: 'exact', head: true }),
        supabase.from('staff_records').select('*', { count: 'exact', head: true }).eq('status', 'active')
      ]);
      
      if (err1 || err2) {
        console.warn('[Dashboard] Staff stats fetch warning:', err1?.message || err2?.message);
      }
      
      return { total: total || 0, active: active || 0 } as any;
    },
    enabled: !!profile && (isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector),
  });

  const { data: attendanceStats, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['dashboard-attendance-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const [
        { count: presentToday, error: err1 },
        { count: lateToday, error: err2 }
      ] = await Promise.all([
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'present'),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).eq('status', 'late')
      ]);
      
      if (err1 || err2) {
        console.warn('[Dashboard] Attendance stats fetch warning:', err1?.message || err2?.message);
      }
      
      return { presentToday: presentToday || 0, lateToday: lateToday || 0 } as any;
    },
    enabled: !!profile && (isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector),
  });

  const { data: allowanceStats, isLoading: isLoadingAllowances } = useQuery({
    queryKey: ['dashboard-allowance-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('allowances').select('amount').eq('payment_status', 'paid');
      
      if (error) {
        console.warn('[Dashboard] Allowance stats fetch warning:', error.message);
      }

      const totalApproved = (data || []).reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
      return { totalApproved } as any;
    },
    enabled: !!profile && (isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector),
  });

  const { data: departmentStats } = useQuery({
    queryKey: ['dashboard-department-stats'],
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from('departments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
        if (error) {
          console.warn('[Dashboard] Failed to fetch department stats:', error.message);
          return { total: 0 };
        }
        return { total: count || 0 };
      } catch (e: any) {
        console.warn('[Dashboard] Exception fetching department stats:', e.message);
        return { total: 0 };
      }
    },
    enabled: !!profile && (isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector),
  });

  // Staff Personal Stats
  const { data: personalStats } = useQuery({
    queryKey: ['dashboard-personal-stats', profile?.staff_id],
    queryFn: async () => {
      if (!profile?.staff_id) return { attendanceRate: 0, totalPresent: 0, lastCheckIn: null };
      
      try {
        const { data: records, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('staff_id', profile.staff_id)
          .eq('approved', true);
        
        if (error) {
          console.warn('[Dashboard] Failed to fetch personal stats:', error.message);
          return { attendanceRate: 0, totalPresent: 0, lastCheckIn: null };
        }
        
        const safeRecords = records || [];
        const presentCount = safeRecords.filter(r => r.status === 'present').length;
        const totalCount = safeRecords.length || 1;
        const rate = Math.round((presentCount / totalCount) * 100);
        
        return {
          attendanceRate: rate,
          totalPresent: presentCount,
          lastCheckIn: [...safeRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.check_in || null
        };
      } catch (e: any) {
        console.warn('[Dashboard] Exception fetching personal stats:', e.message);
        return { attendanceRate: 0, totalPresent: 0, lastCheckIn: null };
      }
    },
    enabled: userIsStaff && !!profile?.id,
  });

  // 7. Fetch Current Month Allowance
  const { data: allowanceSetting } = useQuery({
    queryKey: ['dashboard-allowance-setting'],
    queryFn: async () => {
      try {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const { data, error } = await supabase
          .from('monthly_allowance_settings')
          .select('amount')
          .eq('month', month)
          .eq('year', year)
          .single();
        if (error && error.code !== 'PGRST116') {
          console.warn('[Dashboard] Failed to fetch allowance setting:', error.message);
          return { amount: 0 };
        }
        return data || { amount: 0 };
      } catch (e: any) {
        console.warn('[Dashboard] Exception fetching allowance setting:', e.message);
        return { amount: 0 };
      }
    },
    enabled: !!profile && (isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector),
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
      </DashboardLayout>
    );
  }

  const attendanceRate = staffStats?.total ? Math.round((attendanceStats?.presentToday || 0) / (staffStats.total || 1) * 100) : 0;

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
              {(isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector) ? "Here's what's happening with GDU today." : "Here's your personal overview for today."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Calendar className="mr-2 h-4 w-4" />
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Button>
            {(isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector) && (
              <Button size="sm" className="shadow-lg shadow-primary/20">
                <TrendingUp className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            )}
          </div>
        </div>

        {/* Global Admin Stats */}
        {(isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector) && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Staff"
              value={staffStats?.total?.toString() || '0'}
              icon={Users}
              trend={{ value: 2.5, isPositive: true }}
              subtitle="from last month"
            />
            <StatCard
              title="Present Today"
              value={attendanceStats?.presentToday?.toString() || '0'}
              icon={CheckCircle}
              trend={{ value: attendanceRate, isPositive: true }}
              subtitle="attendance rate"
            />
            <StatCard
              title="Late Comers"
              value={attendanceStats?.lateToday?.toString() || '0'}
              icon={Clock}
              variant="danger"
              subtitle="needs attention"
            />
            <StatCard
              title="Approved Allowances"
              value={`₦${allowanceStats?.totalApproved?.toLocaleString() || '0'}`}
              icon={Wallet}
              variant="success"
              subtitle="current month"
            />
          </div>
        )}

        {/* Monthly Allowance Management/Summary for Admin/Accountant/DG/etc */}
        {(isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector) && (
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
              <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                  title="Attendance Rate"
                  value={`${personalStats?.attendanceRate || 0}%`}
                  icon={CheckCircle}
                  subtitle="overall presence"
                />
                <StatCard
                  title="Total Present"
                  value={personalStats?.totalPresent?.toString() || '0'}
                  icon={Activity}
                  subtitle="days recorded"
                />
                <StatCard
                  title="Last Check-in"
                  value={personalStats?.lastCheckIn ? (personalStats.lastCheckIn.includes(':') ? personalStats.lastCheckIn.split(':').slice(0, 2).join(':') : new Date(personalStats.lastCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : 'None'}
                  icon={Clock}
                  subtitle="today's status"
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
                    {myAllowances?.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No allowances processed yet.</p>
                    ) : (
                      (myAllowances || []).map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <DollarSign className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{item.allowance_type}</p>
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

        {(isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector) && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Pending Approvals"
              value={pendingApprovals?.length || 0}
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

        {(isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector) && (
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

        {(isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector) && (
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
                    ) : (recentActivities || []).length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">No recent activity logged.</div>
                    ) : (
                      (recentActivities || []).map((activity) => (
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
          {(isSuperAdmin || isAdmin || isTechnicalAssistant || isAccounts || isDirector) && (
            <Card className="border backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Pending Approvals</CardTitle>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {(pendingApprovals || []).length} pending
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingApprovals ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                  ) : (pendingApprovals || []).length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">No pending approvals found.</div>
                  ) : (
                    (pendingApprovals || []).map((approval) => (
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