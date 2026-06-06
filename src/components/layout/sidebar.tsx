import { Link, useLocation } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  LayoutDashboard,
  Users,
  Clock,
  FileText,
  Building2,
  Wallet,
  Network,
  MessageSquare,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  ChevronLeft,
  ChevronRight,
  Bot,
  FolderOpen,
  CalendarDays,
  UserCircle,
  ScanFace,
  Download,
  History,
  Lock,
  Palette,
  UserPlus,
  ClipboardList,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
  roles?: string[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    roles: ['staff', 'accounts', 'admin', 'dg', 'technical_assistant', 'ict', 'super_admin'],
  },
  {
    label: 'Staff Management',
    icon: Users,
    href: '/dashboard/staff',
    roles: ['admin', 'super_admin', 'ict', 'technical_assistant'],
  },
  {
    label: 'Attendance',
    icon: Clock,
    href: '/dashboard/attendance',
    roles: ['staff', 'accounts', 'admin', 'dg', 'technical_assistant', 'ict', 'super_admin'],
  },
  {
    label: 'Nominal Roll',
    icon: ClipboardList,
    href: '/dashboard/nominal-roll',
    roles: ['admin', 'dg', 'technical_assistant', 'super_admin', 'ict'],
  },
  {
    label: 'Finance & Accounts',
    icon: Wallet,
    href: '/dashboard/payroll',
    roles: ['accounts', 'admin', 'super_admin', 'dg', 'technical_assistant', 'ict'],
  },
  {
    label: 'Allowances',
    icon: Wallet,
    href: '/dashboard/allowances',
    roles: ['staff', 'accounts', 'admin', 'dg', 'technical_assistant', 'ict', 'super_admin'],
  },
  {
    label: 'Departments',
    icon: Building2,
    href: '/dashboard/departments',
    roles: ['admin', 'super_admin', 'ict', 'technical_assistant'],
  },
  {
    label: 'Organogram',
    icon: Network,
    href: '/dashboard/organogram',
    roles: ['staff', 'accounts', 'admin', 'dg', 'technical_assistant', 'ict', 'super_admin'],
  },
  {
    label: 'Documents',
    icon: FolderOpen,
    href: '/dashboard/documents',
    roles: ['staff', 'accounts', 'admin', 'dg', 'ta', 'ict', 'super_admin'],
  },
  {
    label: 'Communication',
    icon: MessageSquare,
    href: '/dashboard/chat',
    roles: ['staff', 'accounts', 'admin', 'dg', 'ta', 'ict', 'super_admin'],
  },
  {
    label: 'Announcements',
    icon: Bell,
    href: '/dashboard/announcements',
    roles: ['admin', 'super_admin'],
  },
  {
    label: 'Reports & Analytics',
    icon: BarChart3,
    href: '/dashboard/reports',
    roles: ['admin', 'dg', 'ta', 'super_admin', 'ict'],
  },
  {
    label: 'AI Assistant',
    icon: Bot,
    href: '/dashboard/ai-assistant',
    roles: ['staff', 'accounts', 'admin', 'dg', 'ta', 'ict', 'super_admin'],
  },
  {
    label: 'System Settings',
    icon: Settings,
    href: '/dashboard/settings',
    roles: ['ict', 'super_admin'],
    children: [
      { label: 'Account', icon: UserCircle, href: '/dashboard/settings', roles: ['staff', 'accounts', 'admin', 'dg', 'ta', 'ict', 'super_admin'] },
      { label: 'General', icon: Settings, href: '/dashboard/settings/general', roles: ['ict', 'super_admin'] },
      { label: 'Security', icon: Lock, href: '/dashboard/settings/security', roles: ['ict', 'super_admin'] },
      { label: 'Branding', icon: Palette, href: '/dashboard/settings/branding', roles: ['ict', 'super_admin'] },
      { label: 'Login Page', icon: ScanFace, href: '/dashboard/settings/login-page', roles: ['ict', 'super_admin'] },
      { label: 'Roles & Permissions', icon: Shield, href: '/dashboard/settings/roles', roles: ['ict', 'super_admin'] },
      { label: 'Audit Logs', icon: History, href: '/dashboard/settings/audit-logs', roles: ['super_admin'] },
      { label: 'Export Data', icon: Download, href: '/dashboard/settings/export', roles: ['super_admin'] },
    ],
  },
];

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function Sidebar() {
  const location = useLocation();
  const { profile, signOut, isSuperAdmin, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const { data: branding } = useQuery({
    queryKey: ['portal-branding-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_branding_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (error) return null;
      return data;
    },
  });

  const filteredNavItems = navItems.filter(
    (item) => {
      const hasRole = !item.roles || (profile && item.roles.includes(profile.role));
      if (!hasRole) return false;
      
      // For items with children, check if the parent item itself should be visible
      // System Settings is now restricted at the top level
      return true;
    }
  ).map(item => {
    if (item.children) {
      return {
        ...item,
        children: item.children.filter(child => !child.roles || (profile && child.roles.includes(profile.role)))
      };
    }
    return item;
  }).filter(item => !item.children || item.children.length > 0);

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => location.pathname === href;

  const logoUrl = branding?.logo_url || "/logo.png";
  const portalName = branding?.portal_name || "GDU Portal";

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full bg-gradient-to-b from-primary/10 via-background to-background border-r border-border/50 backdrop-blur-xl transition-all duration-300',
        collapsed ? 'w-[70px]' : 'w-[280px]'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg overflow-hidden flex items-center justify-center shadow-lg bg-white p-0.5">
              <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">{portalName}</span>
              <span className="text-[10px] text-muted-foreground">Staff Management</span>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn('h-8 w-8', collapsed && 'mx-auto')}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="px-2 space-y-1">
          {filteredNavItems.map((item) => (
            <div key={item.label}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleExpanded(item.label)}
                    className={cn(
                      'flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      'hover:bg-primary/10 text-muted-foreground hover:text-foreground',
                      expandedItems.includes(item.label) && 'bg-primary/10 text-primary'
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="ml-3 flex-1 text-left">{item.label}</span>
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 transition-transform',
                            expandedItems.includes(item.label) && 'rotate-90'
                          )}
                        />
                      </>
                    )}
                  </button>
                  {!collapsed && expandedItems.includes(item.label) && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          to={child.href}
                          className={cn(
                            'flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-200',
                            isActive(child.href)
                              ? 'bg-primary/15 text-primary font-semibold'
                              : 'hover:bg-primary/10 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <child.icon className="h-4 w-4 mr-3" />
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1',
                        isActive(item.href)
                          ? 'bg-primary/15 text-primary shadow-[0_0_15px_rgba(0,0,0,0.08)]'
                          : 'hover:bg-primary/10 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="ml-3">{item.label}</span>
                          {item.badge && (
                            <Badge
                              variant="secondary"
                              className="ml-auto bg-primary/20 text-primary text-xs"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-border/50">
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground font-semibold shadow-lg">
            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
            </div>
          )}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut()}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="font-medium">
                Sign Out
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}