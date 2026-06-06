import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Search, Filter, Download, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { handleDatabaseError } from '@/lib/error-handler';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

export const Route = createFileRoute('/dashboard/settings/audit-logs')({
  component: AuditLogs,
});

function AuditLogs() {
  const { isSuperAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user_profile:profiles!audit_logs_user_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        handleDatabaseError(error, 'fetch audit logs');
        return [];
      }
      return data;
    },
    enabled: isSuperAdmin,
  });

  const filteredLogs = (logs || []).filter(log => 
    log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground">Only Super Admin can view system audit logs.</p>
      </div>
    );
  }

  const handleExport = () => {
    if (filteredLogs.length === 0) return;
    const headers = ["User", "Action", "Module", "Description", "IP Address", "Time"];
    const rows = filteredLogs.map(log => [
      log.user_profile?.full_name || 'System',
      log.action,
      log.module || 'N/A',
      log.description || 'N/A',
      log.ip_address || 'N/A',
      log.created_at
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GDU_Audit_Logs_${new Date().toISOString()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Audit Logs</h2>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
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
                <Input 
                  placeholder="Search logs..." 
                  className="pl-9 w-[200px]" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              No activity logs found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.user_profile?.full_name || 'System'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal capitalize">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-xs uppercase font-semibold text-muted-foreground">{log.module}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm" title={log.description}>{log.description}</TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">{log.ip_address || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

