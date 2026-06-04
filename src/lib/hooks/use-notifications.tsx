import { useAuth } from './use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { format, isToday, parseISO } from 'date-fns';

export type NotificationType = 'attendance' | 'payment' | 'leave' | 'ticket' | 'announcement' | 'chat' | 'system' | 'birthday' | 'retirement';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  is_read: boolean;
  link: string | null;
  metadata: any;
  status: string;
  created_at: string;
}

export function useNotifications() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { descending: true });

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  const { data: preferences } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          queryClient.setQueryData(['notifications', user.id], (old: Notification[] = []) => [newNotif, ...old]);
          
          // Show toast for new notification
          toast(newNotif.title, {
            description: newNotif.body,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, status: 'read' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, status: 'read' })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Birthday & Retirement Checks
  useEffect(() => {
    const checkSpecialEvents = async () => {
      if (!user || !profile) return;

      // Get staff record for this user
      const { data: staff, error } = await supabase
        .from('staff_records')
        .select('full_name, date_of_birth, retirement_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !staff) return;

      // 1. Birthday Check
      if (staff.date_of_birth) {
        const dob = parseISO(staff.date_of_birth);
        const today = new Date();
        if (dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate()) {
          // It's birthday! Check if we already sent a notification today
          const startOfToday = new Date();
          startOfToday.setHours(0,0,0,0);
          
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'birthday')
            .gte('created_at', startOfToday.toISOString())
            .limit(1);

          if (!existing || existing.length === 0) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              type: 'birthday',
              title: `Happy Birthday, ${staff.full_name}!`,
              body: 'Wishing you good health, success, and happiness.',
              status: 'unread'
            });
          }
        }
      }

      // 2. Retirement Check
      if (staff.retirement_date) {
        const retirementDate = parseISO(staff.retirement_date);
        const today = new Date();
        const diffInMonths = (retirementDate.getFullYear() - today.getFullYear()) * 12 + (retirementDate.getMonth() - today.getMonth());
        
        const reminderPeriods = [12, 6, 3, 1];
        if (reminderPeriods.includes(diffInMonths)) {
          // Check if already notified for this period this month
          const startOfMonthDate = new Date();
          startOfMonthDate.setDate(1);
          startOfMonthDate.setHours(0,0,0,0);

          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'retirement')
            .eq('metadata->period', diffInMonths)
            .gte('created_at', startOfMonthDate.toISOString())
            .limit(1);

          if (!existing || existing.length === 0) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              type: 'retirement',
              title: 'Retirement Reminder',
              body: `You are approaching retirement. Estimated time remaining: ${diffInMonths} month(s).`,
              metadata: { period: diffInMonths },
              status: 'unread'
            });
          }
        }
      }
    };

    checkSpecialEvents();
  }, [user, profile]);

  return {
    notifications,
    unreadCount: notifications.filter(n => !n.is_read).length,
    isLoading,
    preferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  };
}

export async function createNotification(params: {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  metadata?: any;
  related_module?: string;
  related_record_id?: string;
}) {
  const { error } = await supabase.from('notifications').insert({
    user_id: params.user_id,
    type: params.type,
    title: params.title,
    body: params.body,
    link: params.link,
    metadata: params.metadata,
    related_module: params.related_module,
    related_record_id: params.related_record_id,
    status: 'unread'
  });

  if (error) {
    console.error('Error creating notification:', error);
    return { error };
  }

  // Also log activity
  await supabase.from('audit_logs').insert({
    user_id: params.user_id,
    action: `Notification: ${params.title}`,
    table_name: 'notifications'
  });

  return { error: null };
}
