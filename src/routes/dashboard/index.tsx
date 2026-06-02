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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/dashboard/')({
  head: () => ({
    meta: [{ title: 'Dashboard — GDU Portal' }],
  }),
  component: DashboardPage,
});

const attendanceData = [
  { name: 'Mon', present: 142, absent: 8, late: 6 },
  { name: 'Tue', present: 145, absent: 5, late: 6 },
  { name: 'Wed', present: 138, absent: 12, late: 6 },
  { name: 'Thu', present: 148, absent: 4, late: 4 },
  { name: 'Fri', present: 140, absent: 10, late: 6 },
];

const staffDistribution = [
  { name: 'Administration', value: 35, color: '#1e3a8a' },
  { name: 'Finance', value: 25, color: '#b45309' },
  { name: 'Operations', value: 45, color: '#15803d' },
  { name: 'ICT', value: 18, color: '#7e22ce' },
  { name: 'HR', value: 15, color: '#be185d' },
  { name: 'Others', value: 18, color: '#334155' },
];

const monthlyPayroll = [
  { name: 'Jan', value: 45000000 },
  { name: 'Feb', value: 48000000 },
  { name: 'Mar', value: 52000000 },
  { name: 'Apr', value: 49000000 },
  { name: 'May', value: 55000000 },
];

const recentActivities = [
  { id: '1', user: 'Adebayo Johnson', action: 'marked attendance', time: '5 mins ago', avatar: '' },
  { id: '2', user: 'Grace Okonkwo', action: 'processed payroll', time: '1 hour ago', avatar: '' },
  { id: '3', user: 'Emmanuel Obi', action: 'uploaded a document', time: '2 hours ago', avatar: '' },
  { id: '4', user: 'Fatima Bello', action: 'applied for leave', time: '3 hours ago', avatar: '' },
  { id: '5', user: 'Chidi Okafor', action: 'updated staff record', time: '5 hours ago', avatar: '' },
];

const pendingApprovals = [
  { id: '1', type: 'Leave Request', staff: 'Chidi Okafor', date: '2026-05-30' },
  { id: '2', type: 'Document Approval', staff: 'Amina Ibrahim', date: '2026-05-29' },
  { id: '3', type: 'Payroll Adjustment', staff: 'Multiple', date: '2026-05-28' },
];

function DashboardPage() {
  const { profile, isSuperAdmin, isAdmin, isAccounts, isDirector, isStaff } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    enabled: !isStaff,
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ['dashboard-attendance-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .eq('status', 'present');
      if (error) throw error;
      return { presentToday: count || 0 };
    },
    enabled: !isStaff,
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
    enabled: !isStaff,
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
    enabled: isStaff && !!profile?.id,
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

  if (!mounted) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">Initializing dashboard...</p>
        </div>
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
              {isStaff ? "Here's your personal overview for today." : "Here's what's happening with GDU today."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Calendar className="mr-2 h-4 w-4" />
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Button>
            {!isStaff && (
              <Button size="sm" className="shadow-lg shadow-primary/20">
                <TrendingUp className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            )}
          </div>
        </div>

        {/* Global Admin Stats */}
        {!isStaff && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Staff"
              value={staffStats?.total.toString() || '0'}
              icon={Users}
              trend="+2.5%"
              description="from last month"
            />
            <StatCard
              title="Attendance Rate"
              value={`${attendanceRate}%`}
              icon={CheckCircle}
              trend="+5.2%"
              description="vs yesterday"
            />
            <StatCard
              title="Active Departments"
              value={departmentStats?.total.toString() || '0'}
              icon={Activity}
              description="Operating units"
            />
            <StatCard
              title="Monthly Payroll"
              value={formatCurrency(55000000)}
              icon={DollarSign}
              trend="+12%"
              description="May 2026 budget"
            />
          </div>
        )}

        {/* Staff Personal Stats */}
        {isStaff && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="My Attendance Rate"
              value={`${personalStats?.attendanceRate || 0}%`}
              icon={CheckCircle}
              trend="+1.2%"
              description="this month"
            />
            <StatCard
              title="Total Present"
              value={personalStats?.totalPresent || 0}
              icon={Users}
              description="approved days"
            />
            <StatCard
              title="Last Check-in"
              value={personalStats?.lastCheckIn ? new Date(personalStats.lastCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
              icon={Clock}
              description="most recent"
            />
            <StatCard
              title="Leave Balance"
              value="12 Days"
              icon={Calendar}
              description="available this year"
            />
          </div>
        )}

        {!isStaff && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Pending Approvals"
              value={pendingApprovals.length}
              subtitle="Awaiting your review"
              icon={AlertCircle}
              variant="danger"
            />
            <StatCard
              title="Documents Uploaded"
              value="1,245"
              subtitle="This month"
              icon={FileText}
              trend={{ value: 12, isPositive: true }}
            />
            <StatCard
              title="Active Departments"
              value="8"
              subtitle="All operational"
              icon={Activity}
              variant="success"
            />
          </div>
        )}

        {!isStaff && (
          <div className="grid gap-4 lg:grid-cols-2">
            <BarChartCard
              title="Weekly Attendance Overview"
              description="Present, absent and late attendance"
              data={attendanceData}
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
            />
          </div>
        )}

        {!isStaff && (
          <div className="grid gap-4 lg:grid-cols-3">
            <AreaChartCard
              title="Monthly Payroll Trend"
              description="Payroll expenditure over time"
              data={monthlyPayroll}
              fill="var(--gold)"
              className="lg:col-span-2"
            />

            <Card className="border backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px]">
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
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
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {!isStaff && (
            <Card className="border backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Pending Approvals</CardTitle>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {pendingApprovals.length} pending
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingApprovals.map((approval) => (
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
                        <Button size="sm" variant="outline">
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className={cn("border backdrop-blur-sm", isStaff && "lg:col-span-2")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("grid gap-3", isStaff ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2")}>
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