import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';
import { handleDatabaseError, handlePortalNotification } from '@/lib/error-handler';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export type AllowanceStatus = 'Not Requested' | 'Processing' | 'Approved' | 'Paid' | 'Rejected';

export function useMonthlyAllowance() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  // Fetch current month's allowance settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['monthly-allowance-settings', currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_allowance_settings' as any)
        .select('*')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
      return data;
    },
  });

  // Fetch attendance percentage for the current month
  const { data: attendanceStats, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['monthly-attendance-stats', profile?.staff_id, currentMonth, currentYear],
    queryFn: async () => {
      if (!profile?.staff_id) return { percentage: 0, totalDays: 0, presentDays: 0 };
      
      const startDate = startOfMonth(now).toISOString().split('T')[0];
      const endDate = endOfMonth(now).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('staff_id', profile.staff_id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      const totalDays = data.length;
      const presentDays = data.filter(r => r.status === 'present' || r.status === 'late').length;
      const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

      return { percentage, totalDays, presentDays };
    },
    enabled: !!profile?.staff_id,
  });

  // Fetch staff's request for the current month
  const { data: myRequest, isLoading: isLoadingMyRequest } = useQuery({
    queryKey: ['my-monthly-allowance-request', profile?.staff_id, currentMonth, currentYear],
    queryFn: async () => {
      if (!profile?.staff_id) return null;
      const { data, error } = await supabase
        .from('monthly_allowance_requests' as any)
        .select('*')
        .eq('staff_id', profile.staff_id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!profile?.staff_id,
  });

  // Submit request mutation
  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!profile?.staff_id || !settings || !attendanceStats) {
        throw new Error('Missing required information');
      }

      if (attendanceStats.percentage < 80) {
        throw new Error('Sorry, you do not have up to 80% attendance and you are not entitled to this month’s payment. Thanks for your understanding.');
      }

      const { error } = await supabase
        .from('monthly_allowance_requests' as any)
        .insert({
          staff_id: profile.staff_id,
          month: currentMonth,
          year: currentYear,
          attendance_percentage: attendanceStats.percentage,
          allowance_amount: settings.amount,
          status: 'Processing',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-monthly-allowance-request'] });
      handlePortalNotification('Request submitted successfully', { severity: 'success' });
    },
    onError: (error: any) => {
      handleDatabaseError(error, 'submit allowance request');
    },
  });

  // Accountant: Fetch all requests
  const { data: allRequests, isLoading: isLoadingAllRequests } = useQuery({
    queryKey: ['all-monthly-allowance-requests', currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_allowance_requests' as any)
        .select(`
          *,
          staff:staff_records(
            id,
            full_name,
            readable_id,
            department:departments(name)
          )
        `)
        .eq('month', currentMonth)
        .eq('year', currentYear);

      if (error) {
        handleDatabaseError(error, 'fetch allowance requests');
        return [];
      }
      return data;
    },
    enabled: ['accounts', 'admin', 'dg', 'ta', 'ict', 'super_admin'].includes(profile?.role || ''),
  });

  // Accountant: Update request status
  const updateRequestStatus = useMutation({
    mutationFn: async ({ requestId, status, reason }: { requestId: string, status: AllowanceStatus, reason?: string }) => {
      const updates: any = { status, reviewed_by: profile?.id, reviewed_at: new Date().toISOString() };
      if (status === 'Paid') updates.paid_at = new Date().toISOString();
      if (reason) updates.rejection_reason = reason;

      const { error } = await supabase
        .from('monthly_allowance_requests' as any)
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-monthly-allowance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-monthly-allowance-request'] });
      handlePortalNotification('Request status updated', { severity: 'success' });
    },
    onError: (error: any) => {
      handleDatabaseError(error, 'update allowance status');
    },
  });

  // Accountant: Update settings
  const updateSettings = useMutation({
    mutationFn: async (amount: number) => {
      const { data: existing } = await supabase
        .from('monthly_allowance_settings' as any)
        .select('id')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('monthly_allowance_settings' as any)
          .update({ amount, set_by: profile?.id, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('monthly_allowance_settings' as any)
          .insert({ amount, month: currentMonth, year: currentYear, set_by: profile?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-allowance-settings'] });
      handlePortalNotification('Monthly allowance updated', { severity: 'success' });
    },
    onError: (error: any) => {
      handleDatabaseError(error, 'update allowance settings');
    },
  });

  return {
    settings,
    attendanceStats,
    myRequest,
    allRequests,
    isLoading: isLoadingSettings || isLoadingAttendance || isLoadingMyRequest || isLoadingAllRequests,
    submitRequest,
    updateRequestStatus,
    updateSettings,
    currentMonthName: format(now, 'MMMM'),
    currentYear,
  };
}
