import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';
import { createNotification } from './use-notifications';
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
        .select('*')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle();
      
      if (error) throw error;
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
      return data;
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
      // 1. Fetch requests with staff records (excluding department join)
      const { data: requests, error: requestsError } = await supabase
        .from('monthly_allowance_requests')
        .select(`
          *,
          staff:staff_records!staff_id(
            id,
            full_name,
            readable_id,
            department_id,
            account_name,
            bank_name,
            account_number,
            passport_photo,
            passport_url
          )
        `)
        .eq('month', currentMonth)
        .eq('year', currentYear);

      if (requestsError) {
        handleDatabaseError(requestsError, 'fetch allowance requests');
        return [];
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

      // 3. Manual merge
      return (requests || []).map((req: any) => {
        const staff = req.staff;
        if (staff) {
          staff.department = staff.department_id ? { name: deptMap[staff.department_id] || 'N/A' } : { name: 'N/A' };
        }
        return req;
      });
    },
    enabled: !!profile && ['accounts', 'admin', 'dg', 'technical_assistant', 'ict', 'super_admin'].includes(profile?.role || ''),
  });

  // Accountant: Update request status
  const updateRequestStatus = useMutation({
    mutationFn: async ({ requestId, status, reason }: { requestId: string, status: AllowanceStatus, reason?: string }) => {
      const updates: any = { status, reviewed_by: profile?.id, reviewed_at: new Date().toISOString() };
      if (status === 'Paid') updates.paid_at = new Date().toISOString();
      if (reason) updates.rejection_reason = reason;

      const { data: request, error: fetchError } = await supabase
        .from('monthly_allowance_requests')
        .select('staff:staff_records!staff_id(user_id), month, year')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('monthly_allowance_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;

      // Create notification for staff
      const staffUserId = (request.staff as any)?.user_id;
      if (staffUserId) {
        let title = '';
        let body = '';
        const monthName = format(new Date(request.year, request.month - 1), 'MMMM');

        if (status === 'Approved') {
          title = 'Allowance Approved';
          body = `Your monthly allowance request for ${monthName} ${request.year} has been approved.`;
        } else if (status === 'Paid') {
          title = 'Allowance Paid';
          body = `Your monthly allowance for ${monthName} ${request.year} has been paid into your account.`;
        } else if (status === 'Rejected') {
          title = 'Allowance Rejected';
          body = `Your monthly allowance request for ${monthName} ${request.year} was not approved. Reason: ${reason || 'Not specified'}`;
        }

        if (title) {
          await createNotification({
            user_id: staffUserId,
            type: 'payment',
            title,
            body,
            related_module: 'allowance',
            related_record_id: requestId
          } as any);
        }
      }
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

    const eligibleRoles = settings.eligible_roles || [];
    const eligibleDeptIds = settings.eligible_departments || [];

    const isRoleEligible = eligibleRoles.length === 0 || eligibleRoles.includes(staffRecord.role);
    const isDeptEligible = eligibleDeptIds.length === 0 || (staffRecord.department_id && eligibleDeptIds.includes(staffRecord.department_id));

    if (!isRoleEligible || !isDeptEligible) {
      return { 
        status: false, 
        reason: 'You are not entitled to this month’s allowance based on your role or department.' 
      };
    }

    const threshold = settings.attendance_threshold || 80;
    if (attendanceStats && attendanceStats.percentage < threshold) {
      return { 
        status: false, 
        reason: `Sorry, you do not have up to ${threshold}% attendance and you are not entitled to this month’s payment. Thanks for your understanding.` 
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
    mutationFn: async ({ amount, minAttendance, roles, deptIds }: any) => {
      let settingId = settings?.id;

      if (settingId) {
        const { error } = await supabase
          .from('monthly_allowance_settings')
          .update({ 
            amount, 
            attendance_threshold: minAttendance,
            eligible_roles: roles,
            eligible_departments: deptIds,
            set_by: profile?.id, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', settingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('monthly_allowance_settings')
          .insert({ 
            amount, 
            month: currentMonth, 
            year: currentYear, 
            attendance_threshold: minAttendance,
            eligible_roles: roles,
            eligible_departments: deptIds,
            set_by: profile?.id 
          });
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
    isEligible,
    isLoading: isLoadingSettings || isLoadingAttendance || isLoadingMyRequest || isLoadingAllRequests,
    submitRequest,
    updateRequestStatus,
    updateSettings,
    currentMonthName: format(now, 'MMMM'),
    currentYear,
  };
}
