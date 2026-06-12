import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Trash2,
  Save,
  FileText,
} from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleDatabaseError, handlePortalNotification } from '@/lib/error-handler';
import { exportToPDF, exportToExcel } from '@/lib/utils/export';
import { useBranding } from '@/lib/hooks/use-branding';
import { format } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const Route = createFileRoute('/dashboard/allowances')({
  component: AllowancesPage,
});

function AllowancesPage() {
  const { profile, isAccounts, isSuperAdmin, isDirector, isAdmin, isTechnicalAssistant } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const canManage = isSuperAdmin || isAccounts || isAdmin || isTechnicalAssistant;
  
  const { data: branding } = useBranding();

  // Fetch departments for merge - MOVED UP to avoid ReferenceError
  const { data: allDepts = [] } = useQuery({
    queryKey: ['departments-all'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('id, name');
      return data || [];
    }
  });

  const { data: allowances = [], isLoading } = useQuery({
    queryKey: ['allowances', allDepts.length],
    queryFn: async () => {
      // 1. Fetch allowances with staff
      let query = supabase
        .from('allowances')
        .select('*, staff_records:staff_id(full_name, readable_id, department_id)')
        .order('created_at', { ascending: false });

      if (!isSuperAdmin && !isAccounts && !isAdmin && !isTechnicalAssistant) {
        query = query.eq('staff_id', profile?.staff_id);
      }

      const { data, error } = await query;
      if (error) {
        handleDatabaseError(error, 'fetch allowances');
        return [];
      }

      // 2. Manual merge with departments
      const deptMap = (allDepts || []).reduce((acc: any, d: any) => {
        acc[d.id] = d;
        return acc;
      }, {});

      return (data || []).map((item: any) => {
        const staff = item.staff_records;
        if (staff) {
          staff.department = staff.department_id ? deptMap[staff.department_id] : null;
        }
        return item;
      });
    },
    enabled: !!profile && allDepts.length > 0,
  });

  const handleExport = (formatType: 'pdf' | 'excel') => {
    const headers = ['Staff Name', 'Staff ID', 'Type', 'Amount', 'Month/Year', 'Date', 'Status'];
    const exportData = allowances.map(item => ({
      staff_name: item.staff_records?.full_name || 'N/A',
      staff_id: item.staff_records?.readable_id || 'N/A',
      type: item.allowance_type,
      amount: `₦${item.amount.toLocaleString()}`,
      'month/year': `${format(new Date(2024, item.month-1), 'MMMM')} ${item.year}`,
      date: format(new Date(item.payment_date), 'PPP'),
      status: item.payment_status.toUpperCase()
    }));

    if (formatType === 'pdf') {
      exportToPDF({
        data: exportData,
        filename: 'Allowances_Report',
        title: 'Staff Allowances & Payments Report',
        headers,
        generatedBy: profile?.full_name,
        branding
      });
    } else {
      exportToExcel({
        data: exportData,
        filename: 'Allowances_Report',
        title: 'Staff Allowances & Payments Report',
        branding
      });
    }
  };

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-list'],
    enabled: canManage,
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_records').select('id, full_name, readable_id');
      if (error) {
        handleDatabaseError(error, 'fetch staff list');
        return [];
      }
      return data;
    },
  });

  const createAllowanceMutation = useMutation({
    mutationFn: async (newData: any) => {
      const { error } = await supabase.from('allowances').insert([newData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allowances'] });
      handlePortalNotification('Allowance processed successfully', { severity: 'success' });
      setIsDialogOpen(false);
    },
    onError: (error: any) => handleDatabaseError(error, 'process allowance')
  });

  const [formData, setFormData] = useState({
    staff_id: '',
    allowance_type: '',
    amount: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    payment_status: 'pending' as const,
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createAllowanceMutation.mutateAsync({
        ...formData,
        amount: parseFloat(formData.amount),
        month: parseInt(formData.month.toString()),
        year: parseInt(formData.year.toString()),
      });
    } catch (error: any) {
      // Handled by mutation onError
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              Allowance Management
            </h2>
            <p className="text-sm text-muted-foreground font-medium">
              Track and manage staff allowances and bonuses.
            </p>
          </div>
          
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-red-500" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-green-500" />
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {canManage && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 rounded-xl shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4" />
                    Process New Allowance
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Process Allowance</DialogTitle>
                    <DialogDescription>Assign a new allowance to a staff member.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select Staff</Label>
                      <Select onValueChange={(v) => setFormData({ ...formData, staff_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                        <SelectContent>
                          {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.readable_id})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Allowance Type</Label>
                      <Select onValueChange={(v) => setFormData({ ...formData, allowance_type: v })}>
                        <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Housing">Housing</SelectItem>
                          <SelectItem value="Transport">Transport</SelectItem>
                          <SelectItem value="Medical">Medical</SelectItem>
                          <SelectItem value="Wardrobe">Wardrobe</SelectItem>
                          <SelectItem value="Leave">Leave</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Month</Label>
                        <Select defaultValue={formData.month.toString()} onValueChange={(v) => setFormData({ ...formData, month: parseInt(v) })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                              <SelectItem key={m} value={m.toString()}>{format(new Date(2024, m-1), 'MMMM')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Year</Label>
                        <Input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (₦)</Label>
                      <Input required type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Date</Label>
                      <Input required type="date" value={formData.payment_date} onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional details..." />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Confirm Payment
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          {allowances.length === 0 ? (
            <Card className="border-dashed flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-bold text-slate-900">No Allowance Records</h3>
              <p className="text-sm text-muted-foreground max-w-xs">There are currently no allowance records in the system.</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {allowances.map((item: any) => (
                <Card key={item.id} className="border hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/5 border flex items-center justify-center">
                          <Wallet className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{item.allowance_type}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono font-bold text-primary">{item.staff_records?.readable_id}</span>
                            <span>•</span>
                            <span className="font-medium">{item.staff_records?.full_name}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Amount</p>
                          <p className="text-lg font-black text-slate-900">₦{item.amount.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payment Date</p>
                          <p className="text-sm font-bold text-slate-600">{format(new Date(item.payment_date), 'MMM d, yyyy')}</p>
                        </div>
                        <Badge className={cn(
                          "uppercase text-[10px] font-black px-3 py-1",
                          item.payment_status === 'paid' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                        )}>
                          {item.payment_status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
