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
} from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleDatabaseError, handlePortalNotification } from '@/lib/error-handler';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const Route = createFileRoute('/dashboard/allowances')({
  component: AllowancesPage,
});

function AllowancesPage() {
  const { profile, isAccounts, isSuperAdmin, isDirector, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const canManage = isAccounts || isSuperAdmin;

  const { data: allowances = [], isLoading } = useQuery({
    queryKey: ['allowances'],
    queryFn: async () => {
      let query = supabase
        .from('allowances')
        .select('*, staff_records:staff_id(full_name, readable_id)')
        .order('created_at', { descending: true });

      if (!isSuperAdmin && !isAccounts && !isDirector && !isAdmin) {
        query = query.eq('staff_id', profile?.staff_id);
      }

      const { data, error } = await query;
      if (error) {
        handleDatabaseError(error, 'fetch allowances');
        return [];
      }
      return data;
    },
  });

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
    title: '',
    description: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    status: 'pending' as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createAllowanceMutation.mutateAsync({
        ...formData,
        amount: parseFloat(formData.amount),
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
                    <Label>Allowance Title</Label>
                    <Input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Travel Allowance" />
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
                    <Label>Description (Optional)</Label>
                    <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Additional details..." />
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
                          <h3 className="font-bold text-slate-900">{item.title}</h3>
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
                          item.status === 'paid' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                        )}>
                          {item.status}
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
