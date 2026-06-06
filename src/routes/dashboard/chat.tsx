import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { handleDatabaseError, handlePortalNotification } from '@/lib/error-handler';
import {
  MessageSquare,
  Send,
  Users,
  Bell,
  Search,
  Plus,
  MoreVertical,
  Phone,
  Video,
  Image as ImageIcon,
  Smile,
  Paperclip,
  Check,
  CheckCheck,
  Hash,
  Megaphone,
  Loader2,
  FileIcon,
  X,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute('/dashboard/chat')({
  head: () => ({
    meta: [{ title: 'Communication — GDU Portal' }],
  }),
  component: ChatPage,
});

interface ChatUser {
  id: string;
  full_name: string;
  email: string;
  passport_url?: string;
  status: 'active' | 'inactive';
  role: string;
  last_seen?: string;
}

interface Message {
  id: string;
  sender_id: string;
  group_id: string;
  content: string | null;
  file_url?: string | null;
  file_type?: string | null;
  created_at: string;
  is_read: boolean;
}

function ChatPage() {
  const { profile, isSuperAdmin, isAdmin, isICT, isTechnicalAssistant } = useAuth();
  const queryClient = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<string | null>(null); // This is user_id for chats, group_id for groups
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [chatType, setChatType] = useState<'chats' | 'groups' | 'announcements'>('chats');
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<any | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setAttachmentPreview(url);
      } else {
        setAttachmentPreview(null);
      }
    }
  };
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Dialog states
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  
  const [groupName, setGroupName] = useState('');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertContent, setAlertContent] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: users = [] } = useQuery({
    queryKey: ['chat-users', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', profile!.id)
        .eq('is_active', true);
      if (error) {
        handleDatabaseError(error, 'fetch chat users');
        return [];
      }
      return data;
    },
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['chat-groups', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_groups')
        .select('*');
      if (error) {
        handleDatabaseError(error, 'fetch chat groups');
        return [];
      }
      return data;
    },
  });

  // Effect to handle group selection and direct chat group creation
  useEffect(() => {
    const setupChat = async () => {
      if (!selectedChat || !profile?.id) {
        setActiveGroupId(null);
        return;
      }

      if (chatType === 'groups') {
        setActiveGroupId(selectedChat);
        return;
      }

      if (chatType === 'chats') {
        try {
          // Find if a direct group already exists between these two users
          // 1. Get all direct groups for the current user
          const { data: myDirectGroups, error: groupError } = await supabase
            .from('chat_groups')
            .select('id')
            .eq('type', 'direct');

          if (groupError) throw groupError;

          if (myDirectGroups && myDirectGroups.length > 0) {
            const groupIds = myDirectGroups.map(g => g.id);
            
            // 2. Check which of these groups has the selected user as a member
            const { data: existingMembers, error: memberError } = await supabase
              .from('chat_group_members')
              .select('group_id')
              .in('group_id', groupIds)
              .eq('user_id', selectedChat)
              .maybeSingle();

            if (memberError) throw memberError;

            if (existingMembers) {
              setActiveGroupId(existingMembers.group_id);
              return;
            }
          }

          // 3. If no group exists, create one
          const { data: newGroup, error: createGroupError } = await supabase
            .from('chat_groups')
            .insert([{
              name: `Direct: ${profile.id}-${selectedChat}`,
              type: 'direct',
              created_by: profile.id
            }])
            .select()
            .single();

          if (createGroupError) throw createGroupError;

          // 4. Add both users to the group
          const { error: memberAddError } = await supabase
            .from('chat_group_members')
            .insert([
              { group_id: newGroup.id, user_id: profile.id },
              { group_id: newGroup.id, user_id: selectedChat }
            ]);

          if (memberAddError) throw memberAddError;

          setActiveGroupId(newGroup.id);
          queryClient.invalidateQueries({ queryKey: ['chat-groups'] });
        } catch (error: any) {
          handleDatabaseError(error, 'setup direct chat');
        }
      }
    };

    setupChat();
  }, [selectedChat, chatType, profile?.id, queryClient]);

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', activeGroupId],
    enabled: !!activeGroupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('group_id', activeGroupId)
        .order('created_at', { ascending: true });

      if (error) {
        handleDatabaseError(error, 'fetch messages');
        return [];
      }
      
      // Mark as read (only messages not sent by me)
      if (data.length > 0) {
        const unread = data.filter(m => !m.is_read && m.sender_id !== profile?.id);
        if (unread.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unread.map(m => m.id));
        }
      }
      
      return data;
    },
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        handleDatabaseError(error, 'fetch announcements');
        return [];
      }
      return data;
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachment) return;
    if (!activeGroupId) {
      handlePortalNotification('Please select a chat first', { severity: 'warning' });
      return;
    }

    try {
      let attachmentUrl = null;
      let attachmentType = null;

      if (attachment) {
        setIsUploading(true);
        const res = await uploadToCloudinary(attachment, 'chat');
        attachmentUrl = res.secure_url;
        attachmentType = attachment.type.startsWith('image/') ? 'image' : 'file';
      }

      const { error } = await supabase
        .from('messages')
        .insert([{
          sender_id: profile?.id,
          group_id: activeGroupId,
          content: newMessage,
          file_url: attachmentUrl,
          file_type: attachmentType,
        }]);

      if (error) throw error;
      setNewMessage('');
      setAttachment(null);
      setAttachmentPreview(null);
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ['messages', activeGroupId] });
    } catch (error: any) {
      handleDatabaseError(error, 'send message');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    try {
      const { error } = await supabase
        .from('chat_groups')
        .insert([{ 
          name: groupName, 
          created_by: profile?.id,
          type: 'group'
        }]);
      if (error) throw error;
      handlePortalNotification('Group created successfully', { severity: 'success' });
      setGroupName('');
      setIsGroupDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['chat-groups'] });
    } catch (error: any) {
      handleDatabaseError(error, 'create group');
    }
  };

  const handleCreateAlert = async () => {
    if (!alertTitle.trim() || !alertContent.trim()) return;
    try {
      const { error } = await supabase
        .from('announcements')
        .insert([{ 
          title: alertTitle, 
          content: alertContent,
          type: 'alert',
          created_by: profile?.id
        }]);
      if (error) throw error;
      handlePortalNotification('Alert sent successfully', { severity: 'success' });
      setAlertTitle('');
      setAlertContent('');
      setIsAlertDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    } catch (error: any) {
      handleDatabaseError(error, 'send alert');
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) return;
    try {
      const { error } = await supabase
        .from('announcements')
        .insert([{ 
          title: announcementTitle, 
          content: announcementContent,
          type: 'announcement',
          created_by: profile?.id,
          is_pinned: true
        }]);
      if (error) throw error;
      handlePortalNotification('Announcement published', { severity: 'success' });
      setAnnouncementTitle('');
      setAnnouncementContent('');
      setIsAnnouncementDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    } catch (error: any) {
      handleDatabaseError(error, 'publish announcement');
    }
  };

  const startVoiceCall = () => {
    handlePortalNotification("Voice calling feature coming soon in production. Currently simulating call with " + selectedUser?.full_name, { severity: 'info' });
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(group => 
    group.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAnnouncements = announcements.filter(ann => 
    ann.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ann.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUser = users.find(u => u.id === selectedChat);

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-500' : 'bg-gray-400';
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex gap-4">
        <Card className="w-80 border backdrop-blur-sm flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Messages
              </CardTitle>
              
              {(isSuperAdmin || isAdmin || isICT) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl">
                    <DropdownMenuItem onClick={() => setIsGroupDialogOpen(true)} className="gap-2 cursor-pointer">
                      <Users className="h-4 w-4" />
                      Create Group
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsAlertDialogOpen(true)} className="gap-2 cursor-pointer text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      Send Alert
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsAnnouncementDialogOpen(true)} className="gap-2 cursor-pointer text-blue-600">
                      <Megaphone className="h-4 w-4" />
                      Post Announcement
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search staff..." 
                className="pl-10 h-9" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>

          {/* Dialogs */}
          <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>Create a collaborative space for teams.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Finance Team" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateGroup}>Create Group</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Emergency Alert</DialogTitle>
                <DialogDescription>Send a critical alert to all staff members.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Alert Title</Label>
                  <Input value={alertTitle} onChange={(e) => setAlertTitle(e.target.value)} placeholder="e.g. System Maintenance" />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea value={alertContent} onChange={(e) => setAlertContent(e.target.value)} placeholder="Describe the alert..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAlertDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleCreateAlert}>Send Alert</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Post New Announcement</DialogTitle>
                <DialogDescription>Broadcast information to the entire portal.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Announcement Title</Label>
                  <Input value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} placeholder="e.g. Monthly Staff Meeting" />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea value={announcementContent} onChange={(e) => setAnnouncementContent(e.target.value)} placeholder="Write announcement details..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAnnouncementDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateAnnouncement}>Publish Announcement</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="px-4 pb-2">
            <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
              <Button
                variant={chatType === 'chats' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setChatType('chats')}
              >
                <Users className="h-4 w-4 mr-1" />
                Chats
              </Button>
              <Button
                variant={chatType === 'groups' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setChatType('groups')}
              >
                <Hash className="h-4 w-4 mr-1" />
                Groups
              </Button>
              <Button
                variant={chatType === 'announcements' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setChatType('announcements')}
              >
                <Megaphone className="h-4 w-4 mr-1" />
                Alerts
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {chatType === 'chats' &&
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedChat(user.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-lg transition-colors',
                      selectedChat === user.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">
                          {user.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background',
                          getStatusColor(user.is_active ? 'active' : 'inactive')
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{user.full_name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                    </div>
                  </button>
                ))}

              {chatType === 'groups' &&
                filteredGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedChat(group.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-lg transition-colors',
                      selectedChat === group.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground uppercase">{group.type}</p>
                    </div>
                  </button>
                ))}

              {chatType === 'announcements' &&
                filteredAnnouncements.map((ann) => (
                  <button
                    key={ann.id}
                    className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{ann.title}</p>
                        {ann.is_pinned && (
                          <Badge variant="secondary" className="text-xs">
                            Pinned
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{ann.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(ann.created_at), 'MMM d, yyyy')}</p>
                    </div>
                  </button>
                ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="flex-1 border backdrop-blur-sm flex flex-col">
          {selectedChat ? (
            <>
              <CardHeader className="pb-2 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedUser?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">
                        {selectedUser?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {selectedUser?.full_name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {selectedUser?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === profile?.id;
                      return (
                        <div
                          key={msg.id}
                          className={cn('flex gap-3', isMe && 'flex-row-reverse')}
                        >
                          {!isMe && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={selectedUser?.avatar_url} />
                              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs">
                                {selectedUser?.full_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              'max-w-[70%] rounded-2xl px-4 py-2',
                              isMe
                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                : 'bg-muted rounded-tl-sm'
                            )}
                          >
                            {msg.content && <p className="text-sm">{msg.content}</p>}
                            {msg.file_url && (
                              <div className="mt-2">
                                {msg.file_type === 'image' || msg.file_type?.startsWith('image') ? (
                                  <img 
                                    src={msg.file_url} 
                                    alt="Attachment" 
                                    className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                                    onClick={() => window.open(msg.file_url!, '_blank')}
                                  />
                                ) : (
                                  <a 
                                    href={msg.file_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 bg-background/10 rounded border border-white/20 hover:bg-background/20 transition-colors"
                                  >
                                    <FileIcon className="h-4 w-4" />
                                    <span className="text-xs truncate max-w-[150px]">View Attachment</span>
                                  </a>
                                )}
                              </div>
                            )}
                            <div
                              className={cn(
                                'flex items-center justify-end gap-1 mt-1',
                                isMe && 'flex-row-reverse'
                              )}
                            >
                              <span className="text-[10px] opacity-70">
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </span>
                              {isMe && (
                                msg.is_read ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3 opacity-50" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t space-y-2">
                {attachment && (
                  <div className="flex items-center justify-between p-2 bg-muted rounded-lg border relative overflow-hidden">
                    {attachmentPreview && (
                      <img src={attachmentPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none" />
                    )}
                    <div className="flex items-center gap-2 relative z-10">
                      {attachmentPreview ? (
                        <ImageIcon className="h-4 w-4 text-primary" />
                      ) : (
                        <FileIcon className="h-4 w-4 text-primary" />
                      )}
                      <span className="text-xs font-medium truncate max-w-[200px]">{attachment.name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 relative z-10" 
                      onClick={() => {
                        setAttachment(null);
                        setAttachmentPreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="flex-shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="flex-shrink-0">
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(e)}
                  />
                  <Button 
                    size="icon" 
                    disabled={(!newMessage.trim() && !attachment) || isUploading}
                    onClick={handleSendMessage}
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Select a conversation</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a chat or group to start messaging
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}