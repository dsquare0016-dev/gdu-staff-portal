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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

export const Route = createFileRoute('/dashboard/')({
  head: () => ({
    meta: [{ title: 'Dashboard — GDU Portal' }],
  }),
  component: DashboardPage,
});

// ... (mock data remains same)

function DashboardPage() {
  const { profile, isSuperAdmin, isAdmin, isAccounts, isDirector } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here&apos;s what&apos;s happening at GDU today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild>
              <Link to="/dashboard/reports">
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Link>
            </Button>
            {(isAdmin || isSuperAdmin) && (
              <Button asChild>
                <Link to="/dashboard/staff">
                  <Users className="mr-2 h-4 w-4" />
                  Add Staff
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Staff"
            value="156"
            subtitle="Active workforce"
            icon={Users}
            trend={{ value: 5.2, isPositive: true }}
          />
          <StatCard
            title="Present Today"
            value="142"
            subtitle="90.2% attendance rate"
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="On Leave"
            value="8"
            subtitle="Currently on approved leave"
            icon={Calendar}
            variant="warning"
          />
          <StatCard
            title="Monthly Payroll"
            value={formatCurrency(55000000)}
            subtitle="May 2026 disbursement"
            icon={DollarSign}
          />
        </div>

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

        <div className="grid gap-4 lg:grid-cols-2">
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

          <Card className="border backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
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