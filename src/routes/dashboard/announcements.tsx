import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  Plus,
  Search,
  Pin,
  MoreVertical,
  Edit,
  Trash2,
  Megaphone,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard/announcements')({
  head: () => ({
    meta: [{ title: 'Announcements — GDU Portal' }],
  }),
  component: AnnouncementsPage,
});

const mockAnnouncements = [
  {
    id: '1',
    title: 'Public Holiday Notice - Democracy Day',
    body: 'The office will be closed on Monday, June 12th, 2026 to commemorate Democracy Day. All staff are advised to plan accordingly.',
    audience: 'all',
    posted_by: 'David Adeyemi',
    posted_at: '2026-05-28 09:00 AM',
    is_pinned: true,
    expires_at: '2026-06-12',
    views: 156,
  },
  {
    id: '2',
    title: 'New Attendance Policy Implementation',
    body: 'Starting from June 1st, 2026, all staff must use the digital attendance system. Manual sign-in sheets will no longer be accepted. Please ensure your biometrics are registered with ICT.',
    audience: 'all',
    posted_by: 'Chidi Okafor',
    posted_at: '2026-05-25 10:30 AM',
    is_pinned: false,
    expires_at: '2026-06-01',
    views: 142,
  },
  {
    id: '3',
    title: 'May 2026 Payroll Processing Complete',
    body: 'Salary payments for May 2026 have been processed. Staff who have not received their payments should contact the Finance department.',
    audience: 'all',
    posted_by: 'Grace Okonkwo',
    posted_at: '2026-05-26 02:00 PM',
    is_pinned: false,
    expires_at: null,
    views: 156,
  },
  {
    id: '4',
    title: 'Training Workshop on Digital Skills',
    body: 'A mandatory training workshop on digital skills will hold from June 15-17, 2026. All staff are required to attend. Registration closes June 10th.',
    audience: 'admin',
    posted_by: 'Emmanuel Obi',
    posted_at: '2026-05-24 11:00 AM',
    is_pinned: false,
    expires_at: '2026-06-10',
    views: 35,
  },
  {
    id: '5',
    title: 'Quarterly Performance Review Schedule',
    body: 'The Q2 2026 performance review will commence on July 1st. Heads of Department should submit their staff evaluation reports by June 25th.',
    audience: 'admin',
    posted_by: 'David Adeyemi',
    posted_at: '2026-05-22 09:00 AM',
    is_pinned: false,
    expires_at: '2026-06-25',
    views: 28,
  },
];

function AnnouncementsPage() {
  const { canAccess } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const canManageAnnouncements = canAccess('announcements', 'create') || canAccess('announcements', 'edit');

  const filteredAnnouncements = mockAnnouncements.filter(
    (ann) =>
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedCount = mockAnnouncements.filter((a) => a.is_pinned).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
            <p className="text-muted-foreground mt-1">
              Post and manage internal announcements
            </p>
          </div>
          {canManageAnnouncements && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Announcement</DialogTitle>
                  <DialogDescription>
                    Post a new announcement to staff
                  </DialogDescription>
                </DialogHeader>
                <AnnouncementForm onSuccess={() => setIsAddDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Announcements</p>
                  <p className="text-2xl font-bold">{mockAnnouncements.length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pinned</p>
                  <p className="text-2xl font-bold">{pinnedCount}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Pin className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-2xl font-bold">{mockAnnouncements.reduce((sum, a) => sum + a.views, 0)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>All Announcements</CardTitle>
                <CardDescription>View all posted announcements</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className={cn(
                  'p-4 rounded-lg border transition-all hover:shadow-md',
                  announcement.is_pinned
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-card'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0',
                      announcement.is_pinned ? 'bg-primary/20' : 'bg-muted'
                    )}>
                      <Megaphone className={cn(
                        'h-6 w-6',
                        announcement.is_pinned ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{announcement.title}</h3>
                        {announcement.is_pinned && (
                          <Badge variant="secondary" className="text-xs">
                            <Pin className="h-3 w-3 mr-1" />
                            Pinned
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {announcement.body}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px]">
                              {announcement.posted_by.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {announcement.posted_by}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {announcement.posted_at}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {announcement.audience === 'all' ? 'All Staff' : announcement.audience}
                        </span>
                        <span>{announcement.views} views</span>
                      </div>
                    </div>
                  </div>
                  {canManageAnnouncements && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer">
                          <Pin className="mr-2 h-4 w-4" />
                          {announcement.is_pinned ? 'Unpin' : 'Pin'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function AnnouncementForm({ onSuccess }: { onSuccess: () => void }) {
  return (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input placeholder="Enter announcement title" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Content</label>
        <Textarea placeholder="Enter announcement content" rows={4} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Audience</label>
          <Select defaultValue="all">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              <SelectItem value="admin">Administrators Only</SelectItem>
              <SelectItem value="accounts">Accounts Only</SelectItem>
              <SelectItem value="ict">ICT Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Expires On</label>
          <Input type="date" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="pin" className="rounded" />
        <label htmlFor="pin" className="text-sm font-medium">Pin this announcement</label>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button>Publish</Button>
      </div>
    </div>
  );
}