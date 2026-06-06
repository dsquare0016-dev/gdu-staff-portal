import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  FolderOpen,
  Upload,
  Search,
  Filter,
  MoreVertical,
  FileText,
  Image,
  File,
  Download,
  Eye,
  Trash2,
  Share2,
  CheckCircle,
  XCircle,
  Clock,
  FileSpreadsheet,
  Download as DownloadIcon,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handleDatabaseError, handlePortalNotification } from '@/lib/error-handler';
import { format } from 'date-fns';
import { uploadToCloudinary } from '@/lib/cloudinary';

export const Route = createFileRoute('/dashboard/documents')({
  head: () => ({
    meta: [{ title: 'Documents — GDU Portal' }],
  }),
  component: DocumentsPage,
});

const fileTypes = ['All Types', 'pdf', 'docx', 'xlsx', 'jpg', 'png'];
const statuses = ['All Status', 'approved', 'pending', 'rejected'];

function DocumentsPage() {
  const { canAccess, profile, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Fetch documents from database
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      if (!profile?.id) {
        console.warn('[Documents] No profile ID available for query');
        return [];
      }

      let query = supabase
        .from('documents')
        .select(`
          *,
          staff:staff_records(full_name),
          category:document_categories(name)
        `)
        .order('created_at', { ascending: false });

      // Non-privileged users only see their own docs
      if (!isSuperAdmin && !canAccess('documents', 'view_all')) {
        if (!profile.staff_id) {
          console.warn('[Documents] No staff ID for personal query');
          return [];
        }
        query = query.eq('staff_id', profile.staff_id);
      }

      const { data, error } = await query;
      if (error) {
        handleDatabaseError(error, 'fetch documents');
        return [];
      }
      return data;
    },
    enabled: !!profile,
  });

  // Fetch categories
  const { data: dbCategories = [] } = useQuery({
    queryKey: ['document-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('document_categories').select('name');
      if (error) return [];
      return data.map(c => c.name);
    }
  });

  const categories = ['All Categories', ...dbCategories];

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      handlePortalNotification('Document deleted successfully', { severity: 'success' });
    },
    onError: (error: any) => handleDatabaseError(error, 'delete document')
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase
        .from('documents')
        .update({ status, reviewed_by: profile?.id, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      handlePortalNotification('Document status updated', { severity: 'success' });
    },
    onError: (error: any) => handleDatabaseError(error, 'update document status')
  });

  const canManageDocuments = canAccess('documents', 'create') || canAccess('documents', 'edit');

  const filteredDocuments = documents.filter((doc) => {
    const docName = doc.name || '';
    const staffName = doc.staff?.full_name || 'System';
    const docCategory = doc.category?.name || 'Other';
    const docType = doc.file_type || '';

    const matchesSearch = docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staffName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All Categories' || docCategory === categoryFilter;
    const matchesType = typeFilter === 'All Types' || docType.includes(typeFilter.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || doc.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesType && matchesStatus;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <Image className="h-5 w-5 text-blue-500" />;
      default:
        return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      approved: 'bg-green-500/10 text-green-600 border-green-500/20',
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
    };
    const icons: Record<string, React.ReactNode> = {
      approved: <CheckCircle className="h-3 w-3 mr-1" />,
      pending: <Clock className="h-3 w-3 mr-1" />,
      rejected: <XCircle className="h-3 w-3 mr-1" />,
    };
    return (
      <Badge className={cn('capitalize', variants[status] || '')}>
        {icons[status]}
        {status}
      </Badge>
    );
  };

  const stats = {
    total: documents.length,
    pending: documents.filter((d: any) => d.status === 'pending').length,
    approved: documents.filter((d: any) => d.status === 'approved').length,
    totalSize: documents.reduce((sum: number, d: any) => sum + (d.file_size || 0), 0),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Document Management</h1>
            <p className="text-muted-foreground mt-1">
              Upload, manage, and organize staff documents
            </p>
          </div>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Upload a new document to the system.
                </DialogDescription>
              </DialogHeader>
              <DocumentUploadForm onSuccess={() => {
                 setIsUploadOpen(false);
                 queryClient.invalidateQueries({ queryKey: ['documents'] });
              }} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Documents</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
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
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border backdrop-blur-sm bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Size</p>
                  <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <DownloadIcon className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Documents</TabsTrigger>
            <TabsTrigger value="pending">Pending Review</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card className="border backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[160px]">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fileTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type === 'All Types' ? type : type.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status === 'All Status' ? status : status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                    <p className="text-muted-foreground">Loading documents...</p>
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No documents found</h3>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or upload a new document.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Staff</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.map((doc: any) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {getFileIcon(doc.file_type)}
                              <div>
                                <p className="font-medium truncate max-w-[200px]">{doc.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {doc.file_type} file
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{doc.category?.name || 'Other'}</Badge>
                          </TableCell>
                          <TableCell>{doc.staff?.full_name || 'System'}</TableCell>
                          <TableCell>{formatFileSize(doc.file_size || 0)}</TableCell>
                          <TableCell>{getStatusBadge(doc.status)}</TableCell>
                          <TableCell>{format(new Date(doc.created_at), 'MMM d, yyyy')}</TableCell>
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
                                <DropdownMenuItem className="cursor-pointer" onClick={() => window.open(doc.file_url, '_blank')}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer" onClick={() => window.open(doc.file_url, '_blank')}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                  <Share2 className="mr-2 h-4 w-4" />
                                  Share
                                </DropdownMenuItem>
                                {canManageDocuments && (
                                  <>
                                    <DropdownMenuSeparator />
                                    {doc.status === 'pending' && (
                                      <>
                                        <DropdownMenuItem className="cursor-pointer text-green-600" onClick={() => updateStatusMutation.mutate({ id: doc.id, status: 'approved' })}>
                                          <CheckCircle className="mr-2 h-4 w-4" />
                                          Approve
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="cursor-pointer text-red-600" onClick={() => updateStatusMutation.mutate({ id: doc.id, status: 'rejected' })}>
                                          <XCircle className="mr-2 h-4 w-4" />
                                          Reject
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => {
                                      if (confirm('Are you sure you want to delete this document?')) {
                                        deleteDocumentMutation.mutate(doc.id);
                                      }
                                    }}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card className="border backdrop-blur-sm p-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Pending Documents</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.pending} documents awaiting review
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="approved">
            <Card className="border backdrop-blur-sm p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Approved Documents</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.approved} documents approved
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function DocumentUploadForm({ onSuccess }: { onSuccess: () => void }) {
  const { profile, isSuperAdmin } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [staffId, setStaffId] = useState(profile?.staff_id || '');

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['document-categories-form'],
    queryFn: async () => {
      const { data, error } = await supabase.from('document_categories').select('*').order('name');
      if (error) return [];
      return data;
    }
  });

  // Fetch staff for admin selection
  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-list-simple'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_records').select('id, full_name').eq('status', 'active').order('full_name');
      if (error) return [];
      return data;
    },
    enabled: isSuperAdmin
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!name) setName(selectedFile.name);

      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      handlePortalNotification('Please select a file first', { severity: 'warning' });
      return;
    }

    if (!categoryId) {
      handlePortalNotification('Please select a category', { severity: 'warning' });
      return;
    }

    setIsUploading(true);
    try {
      if (!profile?.id) {
        throw new Error('User profile not loaded. Please refresh and try again.');
      }

      // 1. Upload to Cloudinary
      const res = await uploadToCloudinary(file, 'documents');

      // 2. Save record to Supabase
      const { error } = await supabase
        .from('documents')
        .insert({
          staff_id: staffId || null,
          uploaded_by: profile?.id,
          category_id: categoryId,
          name: name || file.name,
          file_url: res.secure_url,
          file_type: file.type.split('/')[1] || 'unknown',
          file_size: file.size,
          status: 'pending'
        });

      if (error) throw error;

      handlePortalNotification('Document uploaded successfully and awaiting review', { severity: 'success' });
      onSuccess();
    } catch (error: any) {
      handleDatabaseError(error, 'upload document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="grid gap-4 py-4">
      <div 
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer relative overflow-hidden min-h-[160px] flex flex-col items-center justify-center",
          file ? "border-primary bg-primary/5" : "hover:border-primary/50"
        )}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input 
          id="file-input"
          type="file" 
          className="hidden" 
          onChange={handleFileChange}
        />
        
        {previewUrl ? (
          <div className="absolute inset-0 w-full h-full">
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40">
              <Image className="h-8 w-8 text-primary mb-2" />
              <p className="text-sm font-medium text-foreground">{file?.name}</p>
              <p className="text-xs text-muted-foreground">Click to change</p>
            </div>
          </div>
        ) : (
          <>
            <Upload className={cn("h-8 w-8 mx-auto mb-2", file ? "text-primary" : "text-muted-foreground")} />
            <p className="text-sm font-medium">
              {file ? file.name : "Click or drag to upload files"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF, DOCX, XLSX, JPG, PNG (Max 10MB)"}
            </p>
          </>
        )}
        
        {isUploading && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-bold text-primary animate-pulse">UPLOADING TO SERVER...</p>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Document Name</label>
        <Input 
          placeholder="Enter document name" 
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Related Staff</label>
          {isSuperAdmin ? (
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {staffList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input 
              value={profile?.full_name || ''} 
              disabled 
              className="bg-muted"
            />
          )}
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onSuccess} disabled={isUploading}>
          Cancel
        </Button>
        <Button onClick={handleUpload} disabled={isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload Document'
          )}
        </Button>
      </div>
    </div>
  );
}