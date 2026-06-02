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
import { toast } from 'sonner';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
  receiver_id?: string;
  group_id?: string;
  content: string;
  attachment_url?: string;
  attachment_type?: string;
  created_at: string;
  is_read: boolean;
}

function ChatPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [chatType, setChatType] = useState<'chats' | 'groups' | 'announcements'>('chats');
  const [isUploading, setIsUploading] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; type: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch users for direct chats
  const { data: users = [] } = useQuery({
    queryKey: ['chat-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_records')
        .select('*')
        .neq('id', profile?.id)
        .eq('status', 'active')
        .order('full_name');
      if (error) throw error;
      return data as ChatUser[];
    },
    enabled: !!profile?.id,
  });

  // Fetch announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch messages for selected chat
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', selectedChat],
    queryFn: async () => {
      if (!selectedChat) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${profile?.id},receiver_id.eq.${selectedChat}),and(sender_id.eq.${selectedChat},receiver_id.eq.${profile?.id})`)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedChat && chatType === 'chats',
  });

  // Real-time subscription
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${profile.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['messages'] });
          toast.info('New message received');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChat]);

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChat || (!message.trim() && !attachment)) return;

      const newMessage = {
        sender_id: profile?.id,
        receiver_id: chatType === 'chats' ? selectedChat : null,
        group_id: chatType === 'groups' ? selectedChat : null,
        content: message.trim(),
        attachment_url: attachment?.url,
        attachment_type: attachment?.type,
      };

      const { error } = await supabase.from('messages').insert([newMessage]);
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage('');
      setAttachment(null);
      queryClient.invalidateQueries({ queryKey: ['messages', selectedChat] });
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + error.message);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadToCloudinary(file, 'chat_attachments');
      setAttachment({
        url: res.secure_url,
        type: res.resource_type,
        name: file.name,
      });
      toast.success('File uploaded successfully');
    } catch (error: any) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-500' : 'bg-gray-400';
  };

  const selectedUser = users.find(u => u.id === selectedChat);

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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-10 h-9" />
            </div>
          </CardHeader>
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
                users.map((user) => (
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
                        <AvatarImage src={user.passport_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">
                          {user.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background',
                          getStatusColor(user.status)
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

              {chatType === 'announcements' &&
                announcements.map((ann) => (
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
                      <AvatarImage src={selectedUser?.passport_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">
                        {selectedUser?.full_name.charAt(0) || 'U'}
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
                              <AvatarImage src={selectedUser?.passport_url} />
                              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs">
                                {selectedUser?.full_name.charAt(0) || 'U'}
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
                            {msg.attachment_url && (
                              <div className="mt-2">
                                {msg.attachment_type === 'image' ? (
                                  <img 
                                    src={msg.attachment_url} 
                                    alt="Attachment" 
                                    className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                                    onClick={() => window.open(msg.attachment_url, '_blank')}
                                  />
                                ) : (
                                  <a 
                                    href={msg.attachment_url} 
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
                  <div className="flex items-center justify-between p-2 bg-muted rounded-lg border">
                    <div className="flex items-center gap-2">
                      <FileIcon className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium truncate max-w-[200px]">{attachment.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachment(null)}>
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
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && sendMessageMutation.mutate()}
                  />
                  <Button 
                    size="icon" 
                    disabled={(!message.trim() && !attachment) || sendMessageMutation.isPending}
                    onClick={() => sendMessageMutation.mutate()}
                  >
                    {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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