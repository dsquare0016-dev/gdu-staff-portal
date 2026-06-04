import { Link } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { ModeToggle } from '@/components/mode-toggle';
import {
  Bell,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  HelpCircle,
  Menu,
  Moon,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useNotifications } from '@/lib/hooks/use-notifications';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  body: string;
  time: string;
  isRead: boolean;
  type: 'attendance' | 'payment' | 'leave' | 'system';
}

const mockNotifications: Notification[] = [
  {
    id: 'retirement-1',
    title: 'Retirement Alert',
    body: 'David Adeyemi is approaching retirement (2045-04-01).',
    time: 'Just now',
    isRead: false,
    type: 'system',
  },
  {
    id: '1',
    title: 'Attendance Marked',
    body: 'Your attendance for today has been recorded',
    time: '5 min ago',
    isRead: false,
    type: 'attendance',
  },
  {
    id: '2',
    title: 'Payment Processed',
    body: 'Your salary for May 2026 has been processed',
    time: '1 hour ago',
    isRead: false,
    type: 'payment',
  },
  {
    id: '3',
    title: 'Leave Approved',
    body: 'Your leave request has been approved',
    time: '2 hours ago',
    isRead: true,
    type: 'leave',
  },
];

export function Header() {
  const { profile, signOut } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center justify-between h-full px-4 gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>

          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff, records, documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-primary/5 border-primary/20 focus:bg-background transition-colors h-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle />

          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <HelpCircle className="h-5 w-5" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-0" align="end">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h4 className="font-semibold">Notifications</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-primary"
                  onClick={() => markAllAsRead.mutate()}
                  disabled={unreadCount === 0 || markAllAsRead.isPending}
                >
                  Mark all read
                </Button>
              </div>
              <ScrollArea className="h-[300px]">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => !notification.is_read && markAsRead.mutate(notification.id)}
                      className={cn(
                        'flex gap-3 px-4 py-3 hover:bg-primary/5 transition-colors cursor-pointer border-b border-border/50',
                        !notification.is_read && 'bg-primary/5'
                      )}
                    >
                      <div
                        className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
                          notification.type === 'attendance' && 'bg-blue-500/10 text-blue-500',
                          notification.type === 'payment' && 'bg-green-500/10 text-green-500',
                          notification.type === 'leave' && 'bg-purple-500/10 text-purple-500',
                          notification.type === 'birthday' && 'bg-pink-500/10 text-pink-500',
                          notification.type === 'retirement' && 'bg-orange-500/10 text-orange-500',
                          notification.type === 'system' && 'bg-gray-500/10 text-gray-500'
                        )}
                      >
                        <Bell className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.body}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(notification.created_at), 'PPp')}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                  </div>
                )}
              </ScrollArea>
              <div className="p-3 border-t border-border">
                <Button variant="ghost" size="sm" className="w-full text-primary" asChild>
                  <Link to="/dashboard/notifications">View all notifications</Link>
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm">
                    {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">
                    {profile?.full_name || 'User'}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {profile?.role}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{profile?.full_name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {profile?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/dashboard/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}