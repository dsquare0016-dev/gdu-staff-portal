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
import { toast } from 'sonner';
import { uploadToCloudinary } from '@/lib/cloudinary';

export const Route = createFileRoute('/dashboard/documents')({
  head: () => ({
    meta: [{ title: 'Documents — GDU Portal' }],
  }),
  component: DocumentsPage,
});

const mockDocuments = [
  {
    id: '1',
    name: 'Appointment Letter - Adebayo Johnson',
    type: 'pdf',
    size: 245000,
    category: 'Appointment',
    staff_name: 'Adebayo Johnson',
    uploaded_by: 'Chidi Okafor',
    status: 'approved',
    created_at: '2026-05-15',
  },
  {
    id: '2',
    name: 'Nysc Certificate',
    type: 'pdf',
    size: 180000,
    category: 'Credentials',
    staff_name: 'Grace Okonkwo',
    uploaded_by: 'Grace Okonkwo',
    status: 'approved',
    created_at: '2026-05-10',
  },
  {
    id: '3',
    name: 'Staff Photo',
    type: 'jpg',
    size: 85000,
    category: 'Personal',
    staff_name: 'Emmanuel Obi',
    uploaded_by: 'Emmanuel Obi',
    status: 'approved',
    created_at: '2026-05-08',
  },
  {
    id: '4',
    name: 'First Degree Certificate',
    type: 'pdf',
    size: 320000,
    category: 'Credentials',
    staff_name: 'Fatima Bello',
    uploaded_by: 'Fatima Bello',
    status: 'pending',
    created_at: '2026-05-25',
  },
  {
    id: '5',
    name: 'Payroll Record - May 2026',
    type: 'xlsx',
    size: 125000,
    category: 'Payroll',
    staff_name: 'Multiple',
    uploaded_by: 'Grace Okonkwo',
    status: 'approved',
    created_at: '2026-05-26',
  },
  {
    id: '6',
    name: 'Leave Application',
    type: 'pdf',
    size: 95000,
    category: 'Leave',
    staff_name: 'Amina Ibrahim',
    uploaded_by: 'Amina Ibrahim',
    status: 'pending',
    created_at: '2026-05-27',
  },
];

const categories = ['All Categories', 'Appointment', 'Credentials', 'Personal', 'Payroll', 'Leave', 'Other'];
const fileTypes = ['All Types', 'pdf', 'docx', 'xlsx', 'jpg', 'png'];
const statuses = ['All Status', 'approved', 'pending', 'rejected'];

function DocumentsPage() {
  const { canAccess } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const canManageDocuments = canAccess('documents', 'create') || canAccess('documents', 'edit');

  const filteredDocuments = mockDocuments.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.staff_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All Categories' || doc.category === categoryFilter;
    const matchesType = typeFilter === 'All Types' || doc.type === typeFilter;
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
    total: mockDocuments.length,
    pending: mockDocuments.filter((d) => d.status === 'pending').length,
    approved: mockDocuments.filter((d) => d.status === 'approved').length,
    totalSize: mockDocuments.reduce((sum, d) => sum + d.size, 0),
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
              <DocumentUploadForm onSuccess={() => setIsUploadOpen(false)} />
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
                    {filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {getFileIcon(doc.type)}
                            <div>
                              <p className="font-medium truncate max-w-[200px]">{doc.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {doc.type} file
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.category}</Badge>
                        </TableCell>
                        <TableCell>{doc.staff_name}</TableCell>
                        <TableCell>{formatFileSize(doc.size)}</TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell>{doc.created_at}</TableCell>
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
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer">
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
                                      <DropdownMenuItem className="cursor-pointer text-green-600">
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Approve
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="cursor-pointer text-red-600">
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Reject
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
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
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('other');
  const [staffName, setStaffName] = useState('');

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
      toast.error('Please select a file first');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload to Cloudinary
      const res = await uploadToCloudinary(file, 'documents');

      // 2. Save record to Supabase
      const { error } = await supabase
        .from('documents')
        .insert({
          name: name || file.name,
          file_url: res.secure_url,
          file_type: file.type.split('/')[1] || 'unknown',
          file_size: file.size,
          category_id: category, // Assuming category ID matches for now
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Document uploaded successfully and awaiting review');
      onSuccess();
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
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
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="appointment">Appointment</SelectItem>
              <SelectItem value="credentials">Credentials</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="payroll">Payroll</SelectItem>
              <SelectItem value="leave">Leave</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Related Staff</label>
          <Input 
            placeholder="Search staff" 
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
          />
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