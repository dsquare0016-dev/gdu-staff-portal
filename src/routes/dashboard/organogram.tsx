import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Network,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  Building2,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard/organogram')({
  head: () => ({
    meta: [{ title: 'Organogram — GDU Portal' }],
  }),
  component: OrganogramPage,
});

interface OrgNode {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  avatar_url?: string;
  role: string;
  children?: OrgNode[];
}

const orgData: OrgNode = {
  id: '1',
  name: 'David Adeyemi',
  title: 'Director General',
  department: 'Administration',
  email: 'david.adeyemi@gdu.gov.ng',
  phone: '+234 801 234 5678',
  role: 'dg',
  children: [
    {
      id: '2',
      name: 'Emmanuel Obi',
      title: 'Technical Adviser',
      department: 'ICT',
      email: 'emmanuel.obi@gdu.gov.ng',
      phone: '+234 802 345 6789',
      role: 'ta',
      children: [
        {
          id: '2a',
          name: 'Emeka Nwosu',
          title: 'ICT Officer',
          department: 'ICT',
          email: 'emeka.nwosu@gdu.gov.ng',
          phone: '+234 803 456 7890',
          role: 'staff',
        },
        {
          id: '2b',
          name: 'Ngozi Adichie',
          title: 'Systems Analyst',
          department: 'ICT',
          email: 'ngozi.adichie@gdu.gov.ng',
          phone: '+234 804 567 8901',
          role: 'staff',
        },
      ],
    },
    {
      id: '3',
      name: 'Grace Okonkwo',
      title: 'Chief Financial Officer',
      department: 'Finance',
      email: 'grace.okonkwo@gdu.gov.ng',
      phone: '+234 805 678 9012',
      role: 'accounts',
      children: [
        {
          id: '3a',
          name: 'Amina Ibrahim',
          title: 'Senior Accountant',
          department: 'Finance',
          email: 'amina.ibrahim@gdu.gov.ng',
          phone: '+234 806 789 0123',
          role: 'accounts',
        },
        {
          id: '3b',
          name: 'Kunle Bakare',
          title: 'Accountant',
          department: 'Finance',
          email: 'kunle.bakare@gdu.gov.ng',
          phone: '+234 807 890 1234',
          role: 'accounts',
        },
      ],
    },
    {
      id: '4',
      name: 'Adebayo Johnson',
      title: 'Director, Admin & HR',
      department: 'Administration',
      email: 'adebayo.johnson@gdu.gov.ng',
      phone: '+234 808 901 2345',
      role: 'admin',
      children: [
        {
          id: '4a',
          name: 'Chidi Okafor',
          title: 'HR Manager',
          department: 'HR',
          email: 'chidi.okafor@gdu.gov.ng',
          phone: '+234 809 012 3456',
          role: 'admin',
        },
        {
          id: '4b',
          name: 'Blessing Eze',
          title: 'Administrative Officer',
          department: 'Administration',
          email: 'blessing.eze@gdu.gov.ng',
          phone: '+234 810 123 4567',
          role: 'staff',
        },
      ],
    },
    {
      id: '5',
      name: 'Fatima Bello',
      title: 'Director, Operations',
      department: 'Operations',
      email: 'fatima.bello@gdu.gov.ng',
      phone: '+234 811 234 5678',
      role: 'admin',
      children: [
        {
          id: '5a',
          name: 'Ibrahim Musa',
          title: 'Operations Manager',
          department: 'Operations',
          email: 'ibrahim.musa@gdu.gov.ng',
          phone: '+234 812 345 6789',
          role: 'staff',
        },
        {
          id: '5b',
          name: 'Sarah Ojo',
          title: 'Field Coordinator',
          department: 'Operations',
          email: 'sarah.ojo@gdu.gov.ng',
          phone: '+234 813 456 7890',
          role: 'staff',
        },
      ],
    },
  ],
};

function OrgCard({ node, level = 0 }: { node: OrgNode; level?: number }) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  const getRoleBadge = (role: string) => {
    const variants: Record<string, string> = {
      dg: 'bg-primary/20 text-primary border-primary/30',
      ta: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
      admin: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
      accounts: 'bg-green-500/20 text-green-600 border-green-500/30',
      staff: 'bg-muted text-muted-foreground',
    };
    return variants[role] || variants.staff;
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'relative bg-card border rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 min-w-[200px]',
          'hover:border-primary/30 cursor-pointer group'
        )}
      >
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-16 w-16 mb-3 ring-4 ring-primary/10">
            <AvatarImage src={node.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-lg font-bold">
              {node.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <h4 className="font-semibold text-sm">{node.name}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{node.title}</p>
          <Badge className={cn('mt-2 text-xs', getRoleBadge(node.role))}>
            {node.role.toUpperCase()}
          </Badge>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span>{node.department}</span>
          </div>
          <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Mail className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Phone className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors z-10"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="relative mt-8">
          <div className="absolute left-1/2 top-0 w-[2px] h-4 bg-border -translate-x-1/2" />
          <div className="flex gap-4 pt-4">
            {node.children!.map((child, index) => (
              <div key={child.id} className="relative">
                {index > 0 && (
                  <div className="absolute top-0 left-1/2 w-[calc(50%-8px)] h-[2px] bg-border -translate-y-[20px]" style={{ right: '100%' }} />
                )}
                {index < node.children!.length - 1 && (
                  <div className="absolute top-0 right-1/2 w-[calc(50%-8px)] h-[2px] bg-border -translate-y-[20px]" style={{ left: '100%' }} />
                )}
                <div className="absolute left-1/2 top-0 w-[2px] h-4 bg-border -translate-x-1/2 -translate-y-[20px]" />
                <OrgCard node={child} level={level + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OrganogramPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(100);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organogram</h1>
            <p className="text-muted-foreground mt-1">
              Organizational structure and reporting lines
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-[200px]"
              />
            </div>
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom(Math.max(50, zoom - 10))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom(Math.min(150, zoom + 10))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Card className="border backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Organizational Structure</CardTitle>
            </div>
            <CardDescription>
              Click on nodes to expand/collapse. Hover for contact options.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="overflow-auto pb-8"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
              }}
            >
              <div className="flex justify-center min-w-[800px] pt-8">
                <OrgCard node={orgData} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-bold">DG</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Director General</p>
                  <p className="text-xs text-muted-foreground">1 position</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-purple-600 font-bold">TA</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Technical Adviser</p>
                  <p className="text-xs text-muted-foreground">1 position</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-blue-600 font-bold">DIR</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Directors</p>
                  <p className="text-xs text-muted-foreground">3 positions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground font-bold">ST</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Staff</p>
                  <p className="text-xs text-muted-foreground">8 positions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}