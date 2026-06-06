import { useMonthlyAllowance, AllowanceStatus } from '@/lib/hooks/use-monthly-allowance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Wallet, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  CreditCard, 
  Save, 
  Loader2, 
  User, 
  Building2, 
  Calendar,
  AlertCircle,
  Settings2,
  Shield
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';

export function MonthlyAllowanceAccountant() {
  const { 
    settings, 
    allRequests, 
    isLoading, 
    updateSettings, 
    updateRequestStatus,
    currentMonthName, 
    currentYear 
  } = useMonthlyAllowance();

  const [amount, setAmount] = useState('');
  const [minAttendance, setMinAttendance] = useState('80');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean, requestId: string, reason: string }>({
    open: false,
    requestId: '',
    reason: ''
  });

  useEffect(() => {
    if (settings) {
      setAmount(settings.amount?.toString() || '');
      setMinAttendance(settings.attendance_threshold?.toString() || '80');
      setSelectedRoles(settings.eligible_roles || []);
      setSelectedDepts(settings.eligible_departments || []);
    }
  }, [settings]);

  // Fetch all roles
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('roles').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch all departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*');
      if (error) throw error;
      return data;
    },
  });

  const handleUpdateSettings = () => {
    const amt = parseFloat(amount);
    const minAtt = parseInt(minAttendance);
    if (isNaN(amt) || isNaN(minAtt)) return;
    
    updateSettings.mutate({
      amount: amt,
      minAttendance: minAtt,
      roles: selectedRoles,
      deptIds: selectedDepts
    });
  };

  const handleStatusUpdate = (requestId: string, status: AllowanceStatus) => {
    updateRequestStatus.mutate({ requestId, status });
  };

  const handleReject = () => {
    if (!rejectDialog.reason) return;
    updateRequestStatus.mutate({ 
      requestId: rejectDialog.requestId, 
      status: 'Rejected', 
      reason: rejectDialog.reason 
    });
    setRejectDialog({ open: false, requestId: '', reason: '' });
  };

  const toggleRole = (roleSlug: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleSlug) ? prev.filter(s => s !== roleSlug) : [...prev, roleSlug]
    );
  };

  const toggleDept = (deptId: string) => {
    setSelectedDepts(prev => 
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="bg-primary/5 border-b pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                Eligibility Rules — {currentMonthName} {currentYear}
              </CardTitle>
              <CardDescription>Configure who is entitled to this month's allowance.</CardDescription>
            </div>
            <Button 
              onClick={handleUpdateSettings} 
              disabled={updateSettings.isPending}
              className="rounded-xl gap-2 px-6"
            >
              {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save All Rules
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Allowance Amount (₦)</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minAttendance">Min. Attendance (%)</Label>
                  <Input 
                    id="minAttendance" 
                    type="number" 
                    value={minAttendance} 
                    onChange={(e) => setMinAttendance(e.target.value)}
                    placeholder="80"
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Eligible Roles
                </Label>
                <div className="grid grid-cols-2 gap-3 p-4 border rounded-xl bg-muted/20 max-h-[200px] overflow-y-auto">
                  {roles?.map(role => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`role-${role.slug}`} 
                        checked={selectedRoles.includes(role.slug)}
                        onCheckedChange={() => toggleRole(role.slug)}
                      />
                      <label htmlFor={`role-${role.slug}`} className="text-xs font-medium cursor-pointer">{role.name}</label>
                    </div>
                  ))}
                  {(!roles || roles.length === 0) && <p className="text-xs text-muted-foreground italic col-span-2">No roles found</p>}
                </div>
                <p className="text-[10px] text-muted-foreground italic">If none selected, all roles are eligible.</p>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Eligible Departments
              </Label>
              <div className="grid grid-cols-2 gap-3 p-4 border rounded-xl bg-muted/20 max-h-[200px] overflow-y-auto">
                {departments?.map(dept => (
                  <div key={dept.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`dept-${dept.id}`} 
                      checked={selectedDepts.includes(dept.id)}
                      onCheckedChange={() => toggleDept(dept.id)}
                    />
                    <label htmlFor={`dept-${dept.id}`} className="text-xs font-medium cursor-pointer">{dept.name}</label>
                  </div>
                ))}
                {(!departments || departments.length === 0) && <p className="text-xs text-muted-foreground italic col-span-2">No departments found</p>}
              </div>
              <p className="text-[10px] text-muted-foreground italic">If none selected, all departments are eligible.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Allowance Requests</CardTitle>
          <CardDescription>Review and process staff allowance requests for this month.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Attendance</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!allRequests || allRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No requests submitted yet for this month.
                    </TableCell>
                  </TableRow>
                ) : (
                  allRequests.map((req: any) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                              {req.staff?.full_name?.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{req.staff?.full_name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground uppercase">{req.staff?.readable_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Building2 className="h-3 w-3" />
                          {req.staff?.department?.name || 'General'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={req.attendance_percentage >= (settings?.minimum_attendance_percentage || 80) ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
                          {req.attendance_percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        ₦{req.allowance_amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(req.requested_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {req.status === 'Processing' && <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 gap-1"><Clock className="h-3 w-3" /> Processing</Badge>}
                        {req.status === 'Approved' && <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>}
                        {req.status === 'Paid' && <Badge variant="outline" className="bg-green-500 text-white border-green-600 gap-1"><CreditCard className="h-3 w-3" /> Paid</Badge>}
                        {req.status === 'Rejected' && <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {req.status === 'Processing' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-[10px] border-green-200 text-green-700 hover:bg-green-50"
                                onClick={() => handleStatusUpdate(req.id, 'Approved')}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-[10px] border-red-200 text-red-700 hover:bg-red-50"
                                onClick={() => setRejectDialog({ open: true, requestId: req.id, reason: '' })}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {req.status === 'Approved' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 text-[10px] border-blue-200 text-blue-700 hover:bg-blue-50"
                              onClick={() => handleStatusUpdate(req.id, 'Paid')}
                            >
                              Mark as Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reject Allowance Request</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this request.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Rejection Reason</Label>
            <Input 
              value={rejectDialog.reason} 
              onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
              placeholder="e.g. Incomplete records"
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, requestId: '', reason: '' })}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
