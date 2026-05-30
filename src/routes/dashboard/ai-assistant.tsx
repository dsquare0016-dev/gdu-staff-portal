import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  Send,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  Clock,
  User,
  FileText,
  Users,
  Calendar,
  DollarSign,
  HelpCircle,
  Lightbulb,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/dashboard/ai-assistant')({
  head: () => ({
    meta: [{ title: 'AI Assistant — GDU Portal' }],
  }),
  component: AIAssistantPage,
});

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const quickActions = [
  { icon: Users, label: 'Staff Directory', query: 'Show me the staff directory' },
  { icon: Calendar, label: 'Attendance', query: 'Show attendance summary' },
  { icon: DollarSign, label: 'Payroll', query: 'What is the payroll status?' },
  { icon: FileText, label: 'Documents', query: 'Help me with documents' },
  { icon: BarChart3, label: 'Reports', query: 'Generate a report' },
  { icon: HelpCircle, label: 'Help', query: 'How do I use this portal?' },
];

const initialMessages: AIMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: `Hello! I'm your GDU Portal AI Assistant. I can help you with:

• **Staff Information** — Search and view staff records
• **Attendance Tracking** — Get attendance summaries and reports
• **Payroll & Allowances** — View payment status and history
• **Document Management** — Help with uploading and organizing files
• **Portal Navigation** — Guide you through the system features

How can I assist you today?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

const suggestedQueries = [
  'How many staff are present today?',
  'Show me pending approvals',
  'What is the monthly payroll?',
  'Help me find a staff member',
  'Generate attendance report',
];

function AIAssistantPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<AIMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (query?: string) => {
    const messageText = query || input;
    if (!messageText.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const responses: Record<string, string> = {
        'How many staff are present today?': `Based on today's attendance records:

• **Present:** 142 staff (90.2%)
• **Absent:** 8 staff
• **Late:** 6 staff
• **On Leave:** 4 staff

The attendance rate has increased by 2.3% compared to yesterday.`,
        'Show me pending approvals': `You have 3 pending approvals:

1. **Leave Request** — Chidi Okafor (Annual Leave)
   Submitted: 2 hours ago

2. **Document Upload** — Amina Ibrahim (Certificate)
   Submitted: Yesterday

3. **Payroll Update** — Multiple Staff
   Submitted: 3 days ago

Would you like me to help process these?`,
        'What is the monthly payroll?': `**May 2026 Payroll Summary:**

• **Total Staff:** 156
• **Total Payroll:** ₦55,000,000
• **Basic Salary:** ₦38,500,000
• **Allowances:** ₦21,500,000
• **Deductions:** ₦5,000,000

**Status:** Payments processing for 142 staff completed on May 25th.`,
        'default': `I understand you're asking about "${messageText}". 

As your GDU Portal assistant, I can help you with:
• Staff records and management
• Attendance tracking and reports
• Payroll and allowance information
• Document management
• General portal navigation

Could you please rephrase your question or select from the quick actions below?`,
      };

      const responseText = responses[messageText] || responses['default'];

      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <DashboardLayout>
      <div className="grid gap-6 lg:grid-cols-3 h-[calc(100vh-12rem)]">
        <div className="lg:col-span-2 flex flex-col">
          <Card className="flex-1 border backdrop-blur-sm flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                    <Bot className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">GDU AI Assistant</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      Online • Ready to help
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-primary/5">
                  <Sparkles className="h-3 w-3 mr-1 text-primary" />
                  AI-Powered
                </Badge>
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3',
                      msg.role === 'user' && 'flex-row-reverse'
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-3',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-muted rounded-tl-sm'
                      )}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-primary">AI Assistant</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {msg.timestamp}
                          </span>
                        </div>
                      )}
                      <div className="text-sm space-y-2">
                        {msg.content.split('•').map((line, i) => {
                          if (i === 0) return <p key={i}>{line}</p>;
                          return (
                            <p key={i} className="flex items-start gap-2">
                              <span className={msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}>
                                •
                              </span>
                              <span>{line}</span>
                            </p>
                          );
                        })}
                      </div>
                      {msg.role === 'user' && (
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] opacity-70">{msg.timestamp}</span>
                        </div>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-muted-foreground to-muted flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Ask me anything about GDU Portal..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1"
                />
                <Button size="icon" onClick={() => handleSend()} disabled={!input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                  onClick={() => handleSend(action.query)}
                >
                  <action.icon className="h-4 w-4 mr-3 text-primary" />
                  <span className="text-sm">{action.label}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="border backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Suggested Queries
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestedQueries.map((query) => (
                <button
                  key={query}
                  onClick={() => handleSend(query)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm text-muted-foreground"
                >
                  {query}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border backdrop-blur-sm bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">AI Capabilities</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    I can help navigate the portal, answer HR questions, generate reports, and provide
                    insights from your organization's data.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}