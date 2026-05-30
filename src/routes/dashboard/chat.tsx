import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Image,
  Smile,
  Paperclip,
  Check,
  CheckCheck,
  Hash,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard/chat')({
  head: () => ({
    meta: [{ title: 'Communication — GDU Portal' }],
  }),
  component: ChatPage,
});

interface ChatUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
  unread: number;
  role: string;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

interface ChatGroup {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'department';
  members: number;
  lastMessage?: string;
  unread: number;
  avatar_url?: string;
  is_pinned?: boolean;
}

const mockUsers: ChatUser[] = [
  { id: '1', name: 'Adebayo Johnson', email: 'adebayo@gdu.gov.ng', status: 'online', unread: 2, role: 'admin' },
  { id: '2', name: 'Grace Okonkwo', email: 'grace@gdu.gov.ng', status: 'online', unread: 0, role: 'accounts' },
  { id: '3', name: 'Emmanuel Obi', email: 'emmanuel@gdu.gov.ng', status: 'away', unread: 5, role: 'ict' },
  { id: '4', name: 'Fatima Bello', email: 'fatima@gdu.gov.ng', status: 'offline', lastSeen: '2h ago', unread: 0, role: 'staff' },
  { id: '5', name: 'Chidi Okafor', email: 'chidi@gdu.gov.ng', status: 'online', unread: 1, role: 'admin' },
];

const mockGroups: ChatGroup[] = [
  { id: 'g1', name: 'General', type: 'group', members: 156, lastMessage: 'New announcement posted', unread: 3, is_pinned: true },
  { id: 'g2', name: 'HR Department', type: 'department', members: 12, lastMessage: 'Leave request approved', unread: 0 },
  { id: 'g3', name: 'Finance Team', type: 'department', members: 8, lastMessage: 'Payroll processed', unread: 0 },
  { id: 'g4', name: 'ICT Support', type: 'department', members: 5, lastMessage: 'System maintenance tonight', unread: 1 },
  { id: 'g5', name: 'Project Updates', type: 'group', members: 45, lastMessage: 'Q2 report available', unread: 0 },
];

const mockMessages: Message[] = [
  { id: '1', sender_id: '1', content: 'Good morning everyone!', timestamp: '09:00 AM', status: 'read' },
  { id: '2', sender_id: '2', content: 'Good morning! Please remember the meeting at 10am.', timestamp: '09:05 AM', status: 'read' },
  { id: '3', sender_id: '3', content: 'I\'ll be there. Should we prepare the quarterly reports?', timestamp: '09:10 AM', status: 'read' },
  { id: '4', sender_id: '1', content: 'Yes, please bring the attendance summary as well.', timestamp: '09:12 AM', status: 'delivered' },
  { id: '5', sender_id: '5', content: 'I\'ve uploaded the files to the portal. Please review before the meeting.', timestamp: '09:15 AM', status: 'sent' },
];

const mockAnnouncements = [
  { id: '1', title: 'Public Holiday Notice', body: 'The office will be closed on Monday for Democracy Day celebrations.', date: '2026-05-28', pinned: true },
  { id: '2', title: 'New Attendance Policy', body: 'Please note the updated attendance guidelines effective from June 1st.', date: '2026-05-25', pinned: false },
];

function ChatPage() {
  const { profile } = useAuth();
  const [selectedChat, setSelectedChat] = useState<string | null>('g1');
  const [message, setMessage] = useState('');
  const [chatType, setChatType] = useState<'chats' | 'groups' | 'announcements'>('chats');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
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
                mockUsers.map((user) => (
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
                          {user.name.charAt(0)}
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
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        {user.unread > 0 && (
                          <Badge className="h-5 w-5 rounded-full p-0 text-xs justify-center bg-primary">
                            {user.unread}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                    </div>
                  </button>
                ))}

              {chatType === 'groups' &&
                mockGroups.map((group) => (
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
                      {group.type === 'department' ? (
                        <Users className="h-5 w-5 text-primary" />
                      ) : (
                        <Hash className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium flex items-center gap-1">
                          {group.is_pinned && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                          {group.name}
                        </p>
                        {group.unread > 0 && (
                          <Badge className="h-5 w-5 rounded-full p-0 text-xs justify-center bg-primary">
                            {group.unread}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {group.lastMessage}
                      </p>
                    </div>
                  </button>
                ))}

              {chatType === 'announcements' &&
                mockAnnouncements.map((ann) => (
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
                        {ann.pinned && (
                          <Badge variant="secondary" className="text-xs">
                            Pinned
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{ann.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">{ann.date}</p>
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
                      <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">
                        G
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {chatType === 'groups'
                          ? mockGroups.find((g) => g.id === selectedChat)?.name
                          : chatType === 'chats'
                            ? mockUsers.find((u) => u.id === selectedChat)?.name
                            : 'Announcements'}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {chatType === 'groups'
                          ? `${mockGroups.find((g) => g.id === selectedChat)?.members} members`
                          : mockUsers.find((u) => u.id === selectedChat)?.email}
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
                  {mockMessages.map((msg) => {
                    const isMe = msg.sender_id === '1';
                    const sender = mockUsers.find((u) => u.id === msg.sender_id);
                    return (
                      <div
                        key={msg.id}
                        className={cn('flex gap-3', isMe && 'flex-row-reverse')}
                      >
                        {!isMe && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs">
                              {sender?.name.charAt(0) || 'U'}
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
                          {!isMe && (
                            <p className="text-xs font-medium mb-1 text-primary">
                              {sender?.name}
                            </p>
                          )}
                          <p className="text-sm">{msg.content}</p>
                          <div
                            className={cn(
                              'flex items-center justify-end gap-1 mt-1',
                              isMe && 'flex-row-reverse'
                            )}
                          >
                            <span className="text-[10px] opacity-70">{msg.timestamp}</span>
                            {isMe && (
                              msg.status === 'read' ? (
                                <CheckCheck className="h-3 w-3" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck className="h-3 w-3 opacity-50" />
                              ) : (
                                <Check className="h-3 w-3 opacity-50" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="flex-shrink-0">
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="flex-shrink-0">
                    <Image className="h-5 w-5" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" className="flex-shrink-0">
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Button size="icon" disabled={!message.trim()}>
                    <Send className="h-4 w-4" />
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