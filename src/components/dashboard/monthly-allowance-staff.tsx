import { useMonthlyAllowance } from '@/lib/hooks/use-monthly-allowance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Calendar, Percent, Send, CheckCircle2, XCircle, Clock, CreditCard, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export function MonthlyAllowanceStaff() {
  const { 
    settings, 
    attendanceStats, 
    myRequest, 
    isEligible: eligibility,
    isLoading, 
    submitRequest, 
    currentMonthName, 
    currentYear 
  } = useMonthlyAllowance();

  if (isLoading) {
    return (
      <Card className="border shadow-sm">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const attendancePercentage = attendanceStats?.percentage || 0;
  const isEligible = eligibility.status;
  const allowanceAmount = settings?.amount || 0;
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 gap-1"><Clock className="h-3 w-3" /> Processing</Badge>;
      case 'Approved':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>;
      case 'Paid':
        return <Badge variant="outline" className="bg-green-500 text-white border-green-600 gap-1"><CreditCard className="h-3 w-3" /> Paid</Badge>;
      case 'Rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 gap-1"><XCircle className="h-3 w-3" /> Not Approved</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">Not Requested</Badge>;
    }
  };

  return (
    <Card className="border shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Monthly Allowance
            </CardTitle>
            <CardDescription>
              {currentMonthName} {currentYear}
            </CardDescription>
          </div>
          {myRequest ? getStatusBadge(myRequest.status) : getStatusBadge('Not Requested')}
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-muted/30 border border-muted/50 space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              Allowance Amount
            </p>
            <p className="text-2xl font-black text-slate-900">
              ₦{allowanceAmount.toLocaleString()}
            </p>
          </div>
          
          <div className={cn(
            "p-4 rounded-xl border space-y-1",
            isEligible ? "bg-green-50/50 border-green-100" : "bg-red-50/50 border-red-100"
          )}>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Percent className="h-3 w-3" />
              Attendance Status
            </p>
            <div className="flex items-center justify-between">
              <p className={cn("text-2xl font-black", isEligible ? "text-green-700" : "text-red-700")}>
                {attendancePercentage}%
              </p>
              <Badge className={isEligible ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                {isEligible ? "Eligible" : "Ineligible"}
              </Badge>
            </div>
          </div>
        </div>

        {!myRequest && (
          <div className="space-y-4">
            {!isEligible && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex gap-3 items-start">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 leading-relaxed font-medium">
                  {eligibility.reason}
                </p>
              </div>
            )}
            
            <Button 
              className="w-full h-12 rounded-xl text-lg font-bold gap-2 shadow-lg shadow-primary/20"
              disabled={!isEligible || submitRequest.isPending}
              onClick={() => submitRequest.mutate()}
            >
              {submitRequest.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              Request Monthly Allowance
            </Button>
          </div>
        )}

        {myRequest && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex gap-3 items-center justify-center text-center">
            <div>
              <p className="text-sm font-bold text-slate-900">Request Submitted</p>
              <p className="text-xs text-muted-foreground">
                Your request was submitted on {new Date(myRequest.requested_at).toLocaleDateString()}
              </p>
              {myRequest.rejection_reason && (
                <div className="mt-2 p-2 rounded bg-red-50 border border-red-100 text-red-700 text-xs">
                  <span className="font-bold">Reason:</span> {myRequest.rejection_reason}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
