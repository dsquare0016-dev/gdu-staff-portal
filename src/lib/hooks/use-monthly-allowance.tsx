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
        .from('monthly_allowance_settings')
        .select(`
          *,
          eligible_roles:monthly_allowance_eligible_roles(role_id),
          eligible_departments:monthly_allowance_eligible_departments(department_id)
        `)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Fetch staff record for eligibility check
  const { data: staffRecord } = useQuery({
    queryKey: ['staff-record-for-allowance', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data, error } = await supabase
        .from('staff_records')
        .select('id, department_id, role')
        .eq('user_id', profile.id)
        .single();
      if (error) throw error;
      
      // We also need the role id from the roles table
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('slug', data.role)
        .maybeSingle();
        
      return { ...data, role_id: roleData?.id };
    },
    enabled: !!profile?.id,
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
        .from('monthly_allowance_requests')
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

  // Accountant: Fetch all requests
  const { data: allRequests, isLoading: isLoadingAllRequests } = useQuery({
    queryKey: ['all-monthly-allowance-requests', currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_allowance_requests')
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
    enabled: !!profile && ['accounts', 'admin', 'dg', 'ta', 'ict', 'super_admin'].includes(profile?.role || ''),
  });

  // Accountant: Update request status
  const updateRequestStatus = useMutation({
    mutationFn: async ({ requestId, status, reason }: { requestId: string, status: AllowanceStatus, reason?: string }) => {
      const updates: any = { status, reviewed_by: profile?.id, reviewed_at: new Date().toISOString() };
      if (status === 'Paid') updates.paid_at = new Date().toISOString();
      if (reason) updates.rejection_reason = reason;

      const { error } = await supabase
        .from('monthly_allowance_requests')
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

  // Check eligibility
  const isEligible = (() => {
    if (!settings || !staffRecord) return { status: false, reason: 'Loading...' };

    const eligibleRoleIds = settings.eligible_roles?.map((r: any) => r.role_id) || [];
    const eligibleDeptIds = settings.eligible_departments?.map((d: any) => d.department_id) || [];

    const isRoleEligible = eligibleRoleIds.length === 0 || (staffRecord.role_id && eligibleRoleIds.includes(staffRecord.role_id));
    const isDeptEligible = eligibleDeptIds.length === 0 || (staffRecord.department_id && eligibleDeptIds.includes(staffRecord.department_id));

    if (!isRoleEligible || !isDeptEligible) {
      return { 
        status: false, 
        reason: 'You are not entitled to this month’s allowance based on your role or department.' 
      };
    }

    if (attendanceStats && attendanceStats.percentage < (settings.minimum_attendance_percentage || 80)) {
      return { 
        status: false, 
        reason: `Sorry, you do not have up to ${settings.minimum_attendance_percentage || 80}% attendance and you are not entitled to this month’s payment. Thanks for your understanding.` 
      };
    }

    return { status: true, reason: '' };
  })();

  // Submit request mutation
  const submitRequest = useMutation({
    mutationFn: async () => {
      if (!profile?.staff_id || !settings || !attendanceStats || !staffRecord) {
        throw new Error('Missing required information');
      }

      if (!isEligible.status) {
        throw new Error(isEligible.reason);
      }

      const { error } = await supabase
        .from('monthly_allowance_requests')
        .insert({
          staff_id: profile.staff_id,
          department_id: staffRecord.department_id,
          role_id: staffRecord.role_id,
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

  // Accountant: Update settings
  const updateSettings = useMutation({
    mutationFn: async ({ amount, minAttendance, roleIds, deptIds }: any) => {
      let settingId = settings?.id;

      if (settingId) {
        const { error } = await supabase
          .from('monthly_allowance_settings')
          .update({ 
            amount, 
            minimum_attendance_percentage: minAttendance,
            updated_by: profile?.id, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', settingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('monthly_allowance_settings')
          .insert({ 
            amount, 
            month: currentMonth, 
            year: currentYear, 
            minimum_attendance_percentage: minAttendance,
            created_by: profile?.id 
          })
          .select()
          .single();
        if (error) throw error;
        settingId = data.id;
      }

      // Update eligible roles
      await supabase.from('monthly_allowance_eligible_roles').delete().eq('allowance_setting_id', settingId);
      if (roleIds?.length > 0) {
        const { error: roleError } = await supabase
          .from('monthly_allowance_eligible_roles')
          .insert(roleIds.map((rid: string) => ({ allowance_setting_id: settingId, role_id: rid })));
        if (roleError) throw roleError;
      }

      // Update eligible departments
      await supabase.from('monthly_allowance_eligible_departments').delete().eq('allowance_setting_id', settingId);
      if (deptIds?.length > 0) {
        const { error: deptError } = await supabase
          .from('monthly_allowance_eligible_departments')
          .insert(deptIds.map((did: string) => ({ allowance_setting_id: settingId, department_id: did })));
        if (deptError) throw deptError;
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
    isEligible,
    isLoading: isLoadingSettings || isLoadingAttendance || isLoadingMyRequest || isLoadingAllRequests,
    submitRequest,
    updateRequestStatus,
    updateSettings,
    currentMonthName: format(now, 'MMMM'),
    currentYear,
  };
}
