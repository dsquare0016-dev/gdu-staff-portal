import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard/payroll')({
  head: () => ({
    meta: [{ title: 'Payroll & Allowances — GDU Portal' }],
  }),
  component: PayrollPage,
});

const mockPayroll = [
  {
    id: '1',
    staff_id: '1',
    staff_name: 'Adebayo Johnson',
    staff_email: 'adebayo.johnson@gdu.gov.ng',
    department: 'Administration',
    basic_salary: 350000,
    allowances: 150000,
    deductions: 45000,
    net_salary: 455000,
    month: 5,
    year: 2026,
    status: 'paid',
    payment_date: '2026-05-25',
  },
  {
    id: '2',
    staff_id: '2',
    staff_name: 'Grace Okonkwo',
    staff_email: 'grace.okonkwo@gdu.gov.ng',
    department: 'Finance',
    basic_salary: 550000,
    allowances: 250000,
    deductions: 80000,
    net_salary: 720000,
    month: 5,
    year: 2026,
    status: 'paid',
    payment_date: '2026-05-25',
  },
  {
    id: '3',
    staff_id: '3',
    staff_name: 'Emmanuel Obi',
    staff_email: 'emmanuel.obi@gdu.gov.ng',
    department: 'ICT',
    basic_salary: 700000,
    allowances: 300000,
    deductions: 100000,
    net_salary: 900000,
    month: 5,
    year: 2026,
    status: 'pending',
    payment_date: null,
  },
  {
    id: '4',
    staff_id: '4',
    staff_name: 'Fatima Bello',
    staff_email: 'fatima.bello@gdu.gov.ng',
    department: 'Operations',
    basic_salary: 280000,
    allowances: 120000,
    deductions: 35000,
    net_salary: 365000,
    month: 5,
    year: 2026,
    status: 'paid',
    payment_date: '2026-05-25',
  },
  {
    id: '5',
    staff_id: '5',
    staff_name: 'Chidi Okafor',
    staff_email: 'chidi.okafor@gdu.gov.ng',
    department: 'HR',
    basic_salary: 320000,
    allowances: 140000,
    deductions: 42000,
    net_salary: 418000,
    month: 5,
    year: 2026,
    status: 'failed',
    payment_date: null,
  },
];

const mockAllowances = [
  {
    id: '1',
    staff_id: '1',
    staff_name: 'Adebayo Johnson',
    type: 'Housing',
    amount: 50000,
    month: 5,
    year: 2026,
    status: 'paid',
  },
  {
    id: '2',
    staff_id: '1',
    staff_name: 'Adebayo Johnson',
    type: 'Transport',
    amount: 30000,
    month: 5,
    year: 2026,
    status: 'paid',
  },
  {
    id: '3',
    staff_id: '1',
    staff_name: 'Adebayo Johnson',
    type: 'Medical',
    amount: 25000,
    month: 5,
    year: 2026,
    status: 'paid',
  },
  {
    id: '4',
    staff_id: '2',
    staff_name: 'Grace Okonkwo',
    type: 'Housing',
    amount: 75000,
    month: 5,
    year: 2026,
    status: 'paid',
  },
  {
    id: '5',
    staff_id: '2',
    staff_name: 'Grace Okonkwo',
    type: 'Transport',
    amount: 45000,
    month: 5,
    year: 2026,
    status: 'paid',
  },
];

const departments = ['All Departments', 'Administration', 'Finance', 'ICT', 'Operations', 'HR'];
const months = [
  { value: '5', label: 'May 2026' },
  { value: '4', label: 'April 2026' },
  { value: '3', label: 'March 2026' },
];

function PayrollPage() {
  const { canAccess } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [monthFilter, setMonthFilter] = useState('5');
  const [isAddPayrollOpen, setIsAddPayrollOpen] = useState(false);
  const [isAddAllowanceOpen, setIsAddAllowanceOpen] = useState(false);

  const canManagePayroll = canAccess('payroll', 'create') || canAccess('payroll', 'edit');

  const filteredPayroll = mockPayroll.filter((record) => {
    const matchesSearch =
      record.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.staff_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment =
      departmentFilter === 'All Departments' || record.department === departmentFilter;
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
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      failed: 'bg-red-500/10 text-red-600 border-red-500/20',
      cancelled: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    };
    return (
      <Badge className={cn('capitalize', variants[status] || '')}>
        {status === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
        {status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
        {status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
        {status}
      </Badge>
    );
  };

  const totalPayroll = mockPayroll.reduce((sum, p) => sum + p.net_salary, 0);
  const pendingPayroll = mockPayroll
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.net_salary, 0);
  const totalAllowances = mockAllowances.reduce((sum, a) => sum + a.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payroll & Allowances</h1>
            <p className="text-muted-foreground mt-1">
              Manage staff salaries, wages, and allowances
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            {canManagePayroll && (
              <>
                <Dialog open={isAddAllowanceOpen} onOpenChange={setIsAddAllowanceOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Allowance
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Allowance</DialogTitle>
                      <DialogDescription>Record a new allowance for a staff member.</DialogDescription>
                    </DialogHeader>
                    <AllowanceForm onSuccess={() => setIsAddAllowanceOpen(false)} />
                  </DialogContent>
                </Dialog>
                <Dialog open={isAddPayrollOpen} onOpenChange={setIsAddPayrollOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Process Payroll
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Process Payroll</DialogTitle>
                      <DialogDescription>
                        Process payroll for the selected month.
                      </DialogDescription>
                    </DialogHeader>
                    <PayrollForm onSuccess={() => setIsAddPayrollOpen(false)} />
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Payroll (May)</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalPayroll)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Payments</p>
                  <p className="text-2xl font-bold">{formatCurrency(pendingPayroll)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Allowances</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalAllowances)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Staff Count</p>
                  <p className="text-2xl font-bold">{mockPayroll.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="payroll" className="space-y-4">
          <TabsList>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="allowances">Allowances</TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="payroll" className="space-y-4">
            <Card className="border backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search staff..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
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
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayroll.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.staff_name}</p>
                            <p className="text-xs text-muted-foreground">{record.staff_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{record.department}</TableCell>
                        <TableCell>{formatCurrency(record.basic_salary)}</TableCell>
                        <TableCell className="text-green-600">
                          +{formatCurrency(record.allowances)}
                        </TableCell>
                        <TableCell className="text-red-600">
                          -{formatCurrency(record.deductions)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(record.net_salary)}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="cursor-pointer">
                                <FileText className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {canManagePayroll && (
                                <>
                                  <DropdownMenuItem className="cursor-pointer">
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    Edit Payment
                                  </DropdownMenuItem>
                                  {record.status === 'failed' && (
                                    <DropdownMenuItem className="cursor-pointer">
                                      <AlertCircle className="mr-2 h-4 w-4" />
                                      Retry Payment
                                    </DropdownMenuItem>
                                  )}
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

          <TabsContent value="allowances">
            <Card className="border backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Staff Allowances</CardTitle>
                <CardDescription>
                  View and manage staff allowances and benefits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Allowance Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockAllowances.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.staff_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.type}</Badge>
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {formatCurrency(record.amount)}
                        </TableCell>
                        <TableCell>
                          {new Date(record.year, record.month - 1).toLocaleString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="border backdrop-blur-sm p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Payment History</h3>
              <p className="text-sm text-muted-foreground mt-1">
                View historical payment records and receipts
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function PayrollForm({ onSuccess }: { onSuccess: () => void }) {
  return (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Month</label>
        <Select defaultValue="5">
          <SelectTrigger>
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
      <div className="space-y-2">
        <label className="text-sm font-medium">Department (Optional)</label>
        <Select defaultValue="all">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="Administration">Administration</SelectItem>
            <SelectItem value="Finance">Finance</SelectItem>
            <SelectItem value="ICT">ICT</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button>Process</Button>
      </div>
    </div>
  );
}

function AllowanceForm({ onSuccess }: { onSuccess: () => void }) {
  return (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Staff</label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Choose staff member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Adebayo Johnson</SelectItem>
            <SelectItem value="2">Grace Okonkwo</SelectItem>
            <SelectItem value="3">Emmanuel Obi</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Allowance Type</label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Housing">Housing</SelectItem>
            <SelectItem value="Transport">Transport</SelectItem>
            <SelectItem value="Medical">Medical</SelectItem>
            <SelectItem value="Education">Education</SelectItem>
            <SelectItem value="Utility">Utility</SelectItem>
            <SelectItem value="Meal">Meal</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Amount</label>
        <Input type="number" placeholder="Enter amount" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Month</label>
          <Select defaultValue="5">
            <SelectTrigger>
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
        <div className="space-y-2">
          <label className="text-sm font-medium">Year</label>
          <Input type="number" defaultValue="2026" />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button>Add Allowance</Button>
      </div>
    </div>
  );
}