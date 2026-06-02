import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileSpreadsheet, FileJson, FileText, ShieldAlert } from 'lucide-react';

export const Route = createFileRoute('/dashboard/settings/export')({
  component: ExportData,
});

function ExportData() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Export System Data</h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Staff Records</CardTitle>
            <CardDescription>Export complete personnel database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="staff-personal" defaultChecked />
                <Label htmlFor="staff-personal" className="text-sm">Personal Info</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="staff-employment" defaultChecked />
                <Label htmlFor="staff-employment" className="text-sm">Employment Details</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="staff-salary" defaultChecked />
                <Label htmlFor="staff-salary" className="text-sm">Salary Info</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="staff-docs" />
                <Label htmlFor="staff-docs" className="text-sm">Document Links</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 gap-2" variant="outline">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Excel
              </Button>
              <Button className="flex-1 gap-2" variant="outline">
                <FileJson className="h-4 w-4 text-orange-500" />
                JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Financial Records</CardTitle>
            <CardDescription>Export payroll and allowance history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="fin-payroll" defaultChecked />
                <Label htmlFor="fin-payroll" className="text-sm">Monthly Payroll</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="fin-allowances" defaultChecked />
                <Label htmlFor="fin-allowances" className="text-sm">Allowances</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="fin-deductions" defaultChecked />
                <Label htmlFor="fin-deductions" className="text-sm">Deductions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="fin-tax" defaultChecked />
                <Label htmlFor="fin-tax" className="text-sm">Tax Records</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 gap-2" variant="outline">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Excel
              </Button>
              <Button className="flex-1 gap-2" variant="outline">
                <FileText className="h-4 w-4 text-blue-500" />
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Critical: Full System Dump</CardTitle>
          </div>
          <CardDescription>
            Download a complete encrypted backup of all system data, including audit logs and configurations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" className="w-full gap-2">
            <Download className="h-4 w-4" />
            Generate Full System Backup (.sql.gz)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
