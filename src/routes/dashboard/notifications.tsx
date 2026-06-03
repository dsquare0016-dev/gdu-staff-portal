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
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

export const Route = createFileRoute('/dashboard/notifications')({
  head: () => ({
    meta: [{ title: 'Notifications — GDU Portal' }],
  }),
  component: NotificationsPage,
});

interface Notification {
  id: string;
  title: string;
  body: string;
  time: string;
  date: string;
  isRead: boolean;
  type: 'attendance' | 'payment' | 'leave' | 'system';
}

const mockNotifications: Notification[] = [
  {
    id: 'retirement-1',
    title: 'Retirement Alert',
    body: 'David Adeyemi is approaching retirement (2045-04-01).',
    time: 'Just now',
    date: '2026-06-03',
    isRead: false,
    type: 'system',
  },
  {
    id: '1',
    title: 'Attendance Marked',
    body: 'Your attendance for today has been recorded',
    time: '5 min ago',
    date: '2026-06-03',
    isRead: false,
    type: 'attendance',
  },
  {
    id: '2',
    title: 'Payment Processed',
    body: 'Your salary for May 2026 has been processed',
    time: '1 hour ago',
    date: '2026-06-03',
    isRead: false,
    type: 'payment',
  },
  {
    id: '3',
    title: 'Leave Approved',
    body: 'Your leave request has been approved',
    time: '2 hours ago',
    date: '2026-06-03',
    isRead: true,
    type: 'leave',
  },
  {
    id: '4',
    title: 'New Policy Announcement',
    body: 'A new workforce management policy has been published.',
    time: '1 day ago',
    date: '2026-06-02',
    isRead: true,
    type: 'system',
  },
  {
    id: '5',
    title: 'Payroll Reminder',
    body: 'Please submit your bank details update by end of week.',
    time: '2 days ago',
    date: '2026-06-01',
    isRead: true,
    type: 'payment',
  }
];

function NotificationsPage() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotifications = mockNotifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  }).filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'attendance': return <UserCheck className="h-5 w-5" />;
      case 'payment': return <Wallet className="h-5 w-5" />;
      case 'leave': return <Calendar className="h-5 w-5" />;
      case 'system': return <ShieldAlert className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const getIconBg = (type: Notification['type']) => {
    switch (type) {
      case 'attendance': return 'bg-blue-500/10 text-blue-500';
      case 'payment': return 'bg-green-500/10 text-green-500';
      case 'leave': return 'bg-purple-500/10 text-purple-500';
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
            <Button variant="outline" size="sm" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Mark all as read
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
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
            {filteredNotifications.length > 0 ? (
              <div className="divide-y border-t">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex gap-4 p-4 hover:bg-primary/5 transition-colors cursor-pointer group',
                      !notification.isRead && 'bg-primary/[0.02]'
                    )}
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
                          {!notification.isRead && (
                            <Badge className="h-2 w-2 rounded-full p-0 bg-primary" />
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {notification.time}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {notification.body}
                      </p>
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter flex items-center gap-1">
                          {format(new Date(notification.date), 'MMM d, yyyy')}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                          <button className="text-[10px] font-bold text-primary uppercase hover:underline">
                            Mark as read
                          </button>
                          <span className="text-muted-foreground/30">|</span>
                          <button className="text-[10px] font-bold text-destructive uppercase hover:underline">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
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
