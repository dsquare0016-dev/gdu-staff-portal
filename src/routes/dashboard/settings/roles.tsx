import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Edit2, Trash2, Plus } from 'lucide-react';

export const Route = createFileRoute('/dashboard/settings/roles')({
  component: RolesSettings,
});

const ROLES = [
  { name: 'Super Admin', slug: 'super_admin', count: 2, permissions: 'All Access' },
  { name: 'Administrator', slug: 'admin', count: 5, permissions: 'Staff, Attendance, Reports' },
  { name: 'Accounts Officer', slug: 'accounts', count: 3, permissions: 'Payroll, Allowances' },
  { name: 'Director General', slug: 'dg', count: 1, permissions: 'Read-only, Reports' },
  { name: 'Technical Adviser', slug: 'ta', count: 2, permissions: 'Read-only, Reports' },
  { name: 'ICT Support', slug: 'ict', count: 4, permissions: 'Tickets, ICT Tools' },
  { name: 'Staff Member', slug: 'staff', count: 120, permissions: 'Self Service' },
];

function RolesSettings() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Roles & Permissions</h2>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Role
        </Button>
      </div>

      <Card className="border backdrop-blur-sm">
        <CardHeader>
          <CardTitle>System Roles</CardTitle>
          <CardDescription>Manage user roles and their associated permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Key Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLES.map((role) => (
                <TableRow key={role.slug}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      {role.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{role.slug}</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {role.count}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{role.permissions}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
