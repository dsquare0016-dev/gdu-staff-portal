import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  Filter, 
  MoreVertical, 
  Trash2,
  Calendar,
  Wallet,
  UserCheck,
  ShieldAlert,
  Search
} from 'lucide-react';
import { useState } from 'react';
import { useNotifications, type NotificationType } from '@/lib/hooks/use-notifications';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

export const Route = createFileRoute('/dashboard/notifications')({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { profile } = useAuth();
  const { 
    notifications, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAll 
  } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'read') return n.is_read;
    return true;
  }).filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (n.body?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'attendance': return <UserCheck className="h-5 w-5" />;
      case 'payment': return <Wallet className="h-5 w-5" />;
      case 'leave': return <Calendar className="h-5 w-5" />;
      case 'birthday': return <span className="text-xl">🎂</span>;
      case 'retirement': return <ShieldAlert className="h-5 w-5" />;
      case 'system': return <ShieldAlert className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const getIconBg = (type: NotificationType) => {
    switch (type) {
      case 'attendance': return 'bg-blue-500/10 text-blue-500';
      case 'payment': return 'bg-green-500/10 text-green-500';
      case 'leave': return 'bg-purple-500/10 text-purple-500';
      case 'birthday': return 'bg-pink-500/10 text-pink-500';
      case 'retirement': return 'bg-orange-500/10 text-orange-500';
      case 'system': return 'bg-amber-500/10 text-amber-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              Stay updated with the latest alerts and activities.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending || notifications.every(n => n.is_read)}
            >
              {markAllAsRead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Mark all as read
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm('Are you sure you want to clear all notifications?')) {
                  clearAll.mutate();
                }
              }}
              disabled={clearAll.isPending || notifications.length === 0}
            >
              {clearAll.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Clear all
            </Button>
          </div>
        </div>

        <Card className="border backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg w-fit">
                <Button 
                  variant={filter === 'all' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setFilter('all')}
                  className="rounded-md"
                >
                  All
                </Button>
                <Button 
                  variant={filter === 'unread' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setFilter('unread')}
                  className="rounded-md"
                >
                  Unread
                </Button>
                <Button 
                  variant={filter === 'read' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setFilter('read')}
                  className="rounded-md"
                >
                  Read
                </Button>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search notifications..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Fetching notifications...</p>
              </div>
            ) : filteredNotifications.length > 0 ? (
              <div className="divide-y border-t">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex gap-4 p-4 hover:bg-primary/5 transition-colors cursor-pointer group',
                      !notification.is_read && 'bg-primary/[0.02]'
                    )}
                    onClick={() => !notification.is_read && markAsRead.mutate(notification.id)}
                  >
                    <div className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-white/20',
                      getIconBg(notification.type)
                    )}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold tracking-tight">{notification.title}</p>
                          {!notification.is_read && (
                            <Badge className="h-2 w-2 rounded-full p-0 bg-primary" />
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(notification.created_at), 'p')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {notification.body}
                      </p>
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter flex items-center gap-1">
                          {format(new Date(notification.created_at), 'MMM d, yyyy')}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                          {!notification.is_read && (
                            <button 
                              className="text-[10px] font-bold text-primary uppercase hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead.mutate(notification.id);
                              }}
                            >
                              Mark as read
                            </button>
                          )}
                          <span className="text-muted-foreground/30">|</span>
                          <button 
                            className="text-[10px] font-bold text-destructive uppercase hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification.mutate(notification.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold">No notifications found</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                  You're all caught up! When you receive new alerts, they'll appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
