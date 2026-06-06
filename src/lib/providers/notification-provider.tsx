import React, { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface NotificationProviderProps {
  children: ReactNode;
}

const NotificationContext = createContext<undefined>(undefined);

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user, profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!userId || !profile || authLoading) return;

    const channelName = `notifications-global:${userId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as any;
          
          // Manually update the query cache for immediate feedback
          queryClient.setQueryData(['notifications', userId], (old: any[] = []) => [newNotif, ...old]);
          
          // Also invalidate to ensure data consistency with server-side defaults/transforms
          queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
          
          // Show toast for new notification
          toast(newNotif.title, {
            description: newNotif.body,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to notifications for user ${userId}`);
        }
      });

    return () => {
      console.log(`[Realtime] Unsubscribing from notifications for user ${userId}`);
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return (
    <NotificationContext.Provider value={undefined}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificationSubscription = () => useContext(NotificationContext);
