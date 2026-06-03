import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Wallet,
  Search,
  Filter,
  Download,
  Plus,
  MoreVertical,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileText,
  Receipt,
  PiggyBank,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChartCard, BarChartCard } from '@/components/dashboard/charts';
import { handleDatabaseError, handlePortalNotification } from '@/lib/error-handler';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths } from 'date-fns';

const months = [
  { label: 'January', value: '1' },
  { label: 'February', value: '2' },
  { label: 'March', value: '3' },
  { label: 'April', value: '4' },
  { label: 'May', value: '5' },
  { label: 'June', value: '6' },
  { label: 'July', value: '7' },
  { label: 'August', value: '8' },
  { label: 'September', value: '9' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
];

export const Route = createFileRoute('/dashboard/payroll')({
  head: () => ({
    meta: [{ title: 'Finance & Accounts — GDU Portal' }],
  }),
  component: PayrollPage,
});

function PayrollPage() {
  const { isAccounts, isSuperAdmin, isDirector, isAdmin, isICT, profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1 + '');
  const [isAddPayrollOpen, setIsAddPayrollOpen] = useState(false);
  const [isAddAllowanceOpen, setIsAddAllowanceOpen] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);

  // 1. Fetch Transactions
  const { data: transactions = [], isLoading: isLoadingTxns } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions').select('*').order('created_at', { descending: true });
      if (error) {
        handleDatabaseError(error, 'fetch transactions');
        return [];
      }
      return data;
    }
  });

  // 2. Fetch Payroll Records
  const { data: payrollRecords = [], isLoading: isLoadingPayroll } = useQuery({
    queryKey: ['payroll-records', monthFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll')
        .select(`
          *,
          staff:staff_records(full_name, email, department:departments(name))
        `)
        .eq('month', parseInt(monthFilter))
        .eq('year', new Date().getFullYear());
      
      if (error) {
        handleDatabaseError(error, 'fetch payroll records');
        return [];
      }
      return data;
    }
  });

  // 3. Fetch Allowances
  const { data: allowanceRecords = [], isLoading: isLoadingAllowances } = useQuery({
    queryKey: ['allowance-records', monthFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('allowances')
        .select(`
          *,
          staff:staff_records(full_name)
        `)
        .eq('month', parseInt(monthFilter))
        .eq('year', new Date().getFullYear());
      
      if (error) {
        handleDatabaseError(error, 'fetch allowance records');
        return [];
      }
      return data;
    }
  });

  // 4. Fetch Departments
  const { data: dbDepartments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('name').eq('is_active', true);
      if (error) return [];
      return data.map(d => d.name);
    }
  });

  const departments = ['All Departments', ...dbDepartments];

  const financialTrend = useMemo(() => {
    const now = new Date();
    return [4, 3, 2, 1, 0].map(m => {
      const date = subMonths(now, m);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      const income = transactions
        .filter(t => t.type === 'income' && new Date(t.created_at).getMonth() + 1 === month)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expenditure = transactions
        .filter(t => t.type === 'expenditure' && new Date(t.created_at).getMonth() + 1 === month)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return { name: format(date, 'MMM'), income, expenditure };
    });
  }, [transactions]);

  const canModify = isAccounts || isSuperAdmin;
  const canDelete = isSuperAdmin;
  const canView = isAccounts || isSuperAdmin || isDirector || isAdmin || isICT;

  const filteredPayroll = payrollRecords.filter((record) => {
    const staffName = record.staff?.full_name || '';
    const staffEmail = record.staff?.email || '';
    const staffDept = record.staff?.department?.name || '';

    const matchesSearch =
      staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staffEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment =
      departmentFilter === 'All Departments' || staffDept === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      paid: 'bg-green-500/10 text-green-600 border-green-500/20',
      completed: 'bg-green-500/10 text-green-600 border-green-500/20',
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      failed: 'bg-red-500/10 text-red-600 border-red-500/20',
      cancelled: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    };
    return (
      <Badge className={cn('capitalize font-medium', variants[status] || '')}>
        {status === 'paid' || status === 'completed' ? <CheckCircle className="h-3 w-3 mr-1" /> : null}
        {status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
        {status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
        {status}
      </Badge>
    );
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenditure = transactions.filter(t => t.type === 'expenditure').reduce((sum, t) => sum + Number(t.amount), 0);
  const currentBalance = totalIncome - totalExpenditure;

  const totalPayroll = payrollRecords.reduce((sum, p) => sum + Number(p.net_salary), 0);
  const pendingPayroll = payrollRecords
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.net_salary), 0);
  const totalAllowances = allowanceRecords.reduce((sum, a) => sum + Number(a.amount), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Finance & Accounts</h1>
            <p className="text-muted-foreground mt-1">
              Complete financial management, payroll and transaction tracking
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Financial Report
            </Button>
            {canModify && (
              <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Record Transaction
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Transaction</DialogTitle>
                    <DialogDescription>Record income or expenditure into the system.</DialogDescription>
                  </DialogHeader>
                  <TransactionForm onSuccess={() => setIsAddTransactionOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Income</p>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <ArrowUpRight className="h-3 w-3" />
                    +12% from last month
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-red-500/10 to-red-500/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Expenditure</p>
                  <p className="text-3xl font-bold text-red-600">{formatCurrency(totalExpenditure)}</p>
                  <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                    <ArrowDownRight className="h-3 w-3" />
                    +5% from last month
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
                  <p className="text-3xl font-bold text-primary">{formatCurrency(currentBalance)}</p>
                  <p className="text-xs text-primary flex items-center gap-1 mt-1">
                    <Scale className="h-3 w-3" />
                    Available funds
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <PiggyBank className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="overview">Financial Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="payroll">Payroll & Allowances</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
            <AreaChartCard
                title="Revenue vs Expenditure"
                description="Monthly financial trend"
                data={financialTrend}
                areas={[
                  { dataKey: 'income', color: 'var(--primary)', name: 'Income' },
                  { dataKey: 'expenditure', color: '#dc2626', name: 'Expenditure' }
                ]}
              />
              <BarChartCard
                title="Expense Distribution"
                description="Spending by category"
                data={[
                  { name: 'Payroll', value: 55000000 },
                  { name: 'Ops', value: 12000000 },
                  { name: 'ICT', value: 8500000 },
                  { name: 'Others', value: 5000000 },
                ]}
                bars={[{ dataKey: 'value', color: 'var(--primary)', name: 'Amount' }]}
              />
            </div>
            
            <Card className="border backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest income and expenditure entries</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Source/Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 5).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{t.source}</TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell>
                          <Badge variant={t.type === 'income' ? 'secondary' : 'outline'} className={t.type === 'income' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
                            {t.type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("text-right font-bold", t.type === 'income' ? "text-green-600" : "text-red-600")}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card className="border backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>Detailed record of all financial movements</CardDescription>
                  </div>
                  {canModify && (
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download Statement
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      {canModify && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-xs font-mono">TXN-{t.id.slice(0, 8)}</TableCell>
                        <TableCell className="font-medium">{t.source}</TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell>
                          <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", t.type === 'income' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                            {t.type}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(t.amount)}</TableCell>
                        <TableCell>{getStatusBadge(t.status)}</TableCell>
                        {canModify && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="cursor-pointer">View Receipt</DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">Edit Details</DropdownMenuItem>
                                {canDelete && <DropdownMenuItem className="cursor-pointer text-destructive">Delete Transaction</DropdownMenuItem>}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payroll" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
               <div className="flex flex-wrap items-center gap-2">
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                      <SelectTrigger className="w-[150px]">
                        <Calendar className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                   {canModify && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setIsAddAllowanceOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Allowance
                      </Button>
                      <Button size="sm" onClick={() => setIsAddPayrollOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Process Payroll
                      </Button>
                    </>
                   )}
                </div>
            </div>

            <Card className="border backdrop-blur-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Basic Salary</TableHead>
                      <TableHead>Allowances</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                      {canModify && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayroll.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs">
                              {(p.staff?.full_name || 'U').charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{p.staff?.full_name}</p>
                              <p className="text-[10px] text-muted-foreground">{p.staff?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{p.staff?.department?.name || 'N/A'}</TableCell>
                        <TableCell className="text-sm">{formatCurrency(p.basic_salary)}</TableCell>
                        <TableCell className="text-sm text-green-600">+{formatCurrency(p.allowances)}</TableCell>
                        <TableCell className="text-sm text-red-600">-{formatCurrency(p.deductions)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(p.net_salary)}</TableCell>
                        <TableCell>{getStatusBadge(p.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="cursor-pointer">View Payslip</DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer">Download PDF</DropdownMenuItem>
                              {canModify && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="cursor-pointer">Edit Salary</DropdownMenuItem>
                                  <DropdownMenuItem className="cursor-pointer text-red-600">Mark as Failed</DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Forms remain similar but with updated handlers */}
      <Dialog open={isAddPayrollOpen} onOpenChange={setIsAddPayrollOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Process Payroll</DialogTitle></DialogHeader>
          <PayrollForm onSuccess={() => setIsAddPayrollOpen(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={isAddAllowanceOpen} onOpenChange={setIsAddAllowanceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Allowance</DialogTitle></DialogHeader>
          <AllowanceForm onSuccess={() => setIsAddAllowanceOpen(false)} />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function TransactionForm({ onSuccess }: { onSuccess: () => void }) {
  return (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label>Transaction Type</Label>
        <Select defaultValue="income">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="income">Income (Inflow)</SelectItem>
            <SelectItem value="expenditure">Expenditure (Outflow)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Source / Description</Label>
        <Input placeholder="e.g. State Allocation, Office Supplies" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="allocation">Allocation</SelectItem>
              <SelectItem value="payroll">Payroll</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
              <SelectItem value="ict">ICT</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Amount</Label>
          <Input type="number" placeholder="0.00" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Date</Label>
        <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onSuccess}>Cancel</Button>
        <Button onClick={onSuccess}>Save Transaction</Button>
      </div>
    </div>
  );
}

function PayrollForm({ onSuccess }: { onSuccess: () => void }) {
  return (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label>Select Month</Label>
        <Select defaultValue="5">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onSuccess}>Cancel</Button>
        <Button onClick={onSuccess}>Process</Button>
      </div>
    </div>
  );
}

function AllowanceForm({ onSuccess }: { onSuccess: () => void }) {
  return (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label>Select Staff</Label>
        <Input placeholder="Search staff name..." />
      </div>
      <div className="space-y-2">
        <Label>Allowance Type</Label>
        <Select>
          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Housing">Housing</SelectItem>
            <SelectItem value="Transport">Transport</SelectItem>
            <SelectItem value="Medical">Medical</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Amount</Label>
        <Input type="number" placeholder="0.00" />
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onSuccess}>Cancel</Button>
        <Button onClick={onSuccess}>Add Allowance</Button>
      </div>
    </div>
  );
}