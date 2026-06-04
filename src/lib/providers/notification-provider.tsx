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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channelName = `notifications-global:${user.id}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as any;
          
          // Manually update the query cache for immediate feedback
          queryClient.setQueryData(['notifications', user.id], (old: any[] = []) => [newNotif, ...old]);
          
          // Also invalidate to ensure data consistency with server-side defaults/transforms
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          
          // Show toast for new notification
          toast(newNotif.title, {
            description: newNotif.body,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to notifications for user ${user.id}`);
        }
      });

    return () => {
      console.log(`[Realtime] Unsubscribing from notifications for user ${user.id}`);
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return (
    <NotificationContext.Provider value={undefined}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificationSubscription = () => useContext(NotificationContext);
