import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { Shield, Settings, Lock, Palette, ScanFace, Users, History, Download, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard/settings')({
  head: () => ({
    meta: [{ title: 'System Settings — GDU Portal' }],
  }),
  component: SettingsLayout,
});

function SettingsLayout() {
  const { profile } = useAuth();
  const location = useLocation();

  if (!profile) return null;

  const navItems = [
    { label: 'Account', icon: User, href: '/dashboard/settings' },
    { label: 'General', icon: Settings, href: '/dashboard/settings/general', roles: ['super_admin'] },
    { label: 'Security', icon: Lock, href: '/dashboard/settings/security', roles: ['super_admin'] },
    { label: 'Branding', icon: Palette, href: '/dashboard/settings/branding', roles: ['super_admin'] },
    { label: 'Login Page', icon: ScanFace, href: '/dashboard/settings/login-page', roles: ['super_admin'] },
    { label: 'Roles & Permissions', icon: Shield, href: '/dashboard/settings/roles', roles: ['super_admin'] },
    { label: 'Audit Logs', icon: History, href: '/dashboard/settings/audit-logs', roles: ['super_admin'] },
    { label: 'Export Data', icon: Download, href: '/dashboard/settings/export', roles: ['super_admin'] },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || (profile && item.roles.includes(profile.role))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and system-wide configuration
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 space-y-1">
            {filteredNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  location.pathname === item.href
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'hover:bg-primary/10 text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </aside>

          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}
