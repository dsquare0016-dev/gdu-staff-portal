import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Search, Filter, Download } from 'lucide-react';

export const Route = createFileRoute('/dashboard/settings/audit-logs')({
  component: AuditLogs,
});

const LOGS = [
  { user: 'Admin User', action: 'Update Staff Record', target: 'John Doe', ip: '192.168.1.1', time: '10 mins ago' },
  { user: 'Accounts Officer', action: 'Process Payroll', target: 'May 2026', ip: '192.168.1.5', time: '1 hour ago' },
  { user: 'Super Admin', action: 'Change System Setting', target: 'Maintenance Mode', ip: '192.168.1.1', time: '3 hours ago' },
  { user: 'Admin User', action: 'Delete Staff Record', target: 'Richard Roe', ip: '192.168.1.1', time: '5 hours ago' },
  { user: 'ICT Support', action: 'Resolve Ticket', target: 'TKT-20260530-001', ip: '192.168.1.12', time: '1 day ago' },
];

function AuditLogs() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Audit Logs</h2>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </div>

      <Card className="border backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>System Activity</CardTitle>
              <CardDescription>Track all administrative actions across the portal</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search logs..." className="pl-9 w-[200px]" />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LOGS.map((log, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{log.user}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">{log.action}</Badge>
                  </TableCell>
                  <TableCell>{log.target}</TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono">{log.ip}</TableCell>
                  <TableCell className="text-muted-foreground">{log.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
