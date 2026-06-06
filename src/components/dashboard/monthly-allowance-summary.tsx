import { useMonthlyAllowance } from '@/lib/hooks/use-monthly-allowance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  CreditCard, 
  Wallet,
  TrendingUp,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from './stat-card';
import { startOfMonth, endOfMonth } from 'date-fns';

export function MonthlyAllowanceSummary() {
  const { 
    settings, 
    allRequests, 
    isLoading: isLoadingAllowance, 
    currentMonthName, 
    currentYear 
  } = useMonthlyAllowance();

  // Fetch total staff and eligibility stats
  const { data: summaryStats, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['monthly-allowance-summary-stats', currentMonthName, currentYear],
    queryFn: async () => {
      const now = new Date();
      const startDate = startOfMonth(now).toISOString().split('T')[0];
      const endDate = endOfMonth(now).toISOString().split('T')[0];

      // 1. Total active staff
      const { count: totalStaff } = await supabase
        .from('staff_records')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // 2. Fetch all attendance for the month to calculate eligibility
      const { data: attendance } = await supabase
        .from('attendance')
        .select('staff_id, status')
        .gte('date', startDate)
        .lte('date', endDate);

      // Group by staff_id
      const staffAttendance: Record<string, { total: number, present: number }> = {};
      const safeAttendance = attendance || [];
      safeAttendance.forEach(record => {
        if (!staffAttendance[record.staff_id]) {
          staffAttendance[record.staff_id] = { total: 0, present: 0 };
        }
        staffAttendance[record.staff_id].total++;
        if (record.status === 'present' || record.status === 'late') {
          staffAttendance[record.staff_id].present++;
        }
      });

      const eligibleStaffIds = Object.keys(staffAttendance).filter(id => {
        const stats = staffAttendance[id];
        return (stats.present / stats.total) >= 0.8;
      });

      const ineligibleStaffIds = Object.keys(staffAttendance).filter(id => {
        const stats = staffAttendance[id];
        return (stats.present / stats.total) < 0.8;
      });

      return {
        totalStaff: totalStaff || 0,
        eligibleStaff: eligibleStaffIds.length,
        ineligibleStaff: ineligibleStaffIds.length
      };
    }
  });

  if (isLoadingAllowance || isLoadingSummary) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const requests = allRequests || [];
  const stats = {
    totalRequests: requests.length,
    approved: requests.filter(r => r.status === 'Approved').length,
    rejected: requests.filter(r => r.status === 'Rejected').length,
    paid: requests.filter(r => r.status === 'Paid').length,
    pending: requests.filter(r => r.status === 'Processing').length,
    payableAmount: requests.filter(r => r.status !== 'Rejected').reduce((acc, r) => acc + Number(r.allowance_amount), 0),
    paidAmount: requests.filter(r => r.status === 'Paid').reduce((acc, r) => acc + Number(r.allowance_amount), 0),
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Staff"
          value={summaryStats?.totalStaff.toString() || '0'}
          icon={Users}
          description="Active staff members"
        />
        <StatCard
          title="Eligible Staff"
          value={summaryStats?.eligibleStaff.toString() || '0'}
          icon={CheckCircle2}
          description="80%+ attendance"
          variant="success"
        />
        <StatCard
          title="Ineligible Staff"
          value={summaryStats?.ineligibleStaff.toString() || '0'}
          icon={XCircle}
          description="Below 80% attendance"
          variant="danger"
        />
        <StatCard
          title="Total Requests"
          value={stats.totalRequests.toString()}
          icon={TrendingUp}
          description="Submitted this month"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-blue-600">{stats.pending}</p>
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-green-600">{stats.approved}</p>
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-red-600">{stats.rejected}</p>
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-emerald-600">{stats.paid}</p>
              <CreditCard className="h-5 w-5 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Payable Amount
            </CardTitle>
            <CardDescription>Total amount for approved and pending requests</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-slate-900">₦{stats.payableAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm bg-gradient-to-br from-green-50 to-transparent">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Amount Paid
            </CardTitle>
            <CardDescription>Total amount already disbursed</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-slate-900">₦{stats.paidAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
