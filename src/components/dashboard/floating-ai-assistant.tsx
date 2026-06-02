import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Sparkles, X, Minimize2, Maximize2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/use-auth';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();

  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello ${profile?.full_name || 'there'}! I'm your GDU AI Assistant. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isOpen, isTyping]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // AI Knowledge Base
    const knowledgeBase: Record<string, string> = {
      'staff': 'You can manage staff in the "Staff Management" section. Admins can register new staff, update records, and view profiles.',
      'attendance': 'The "Attendance" section allows you to track daily check-ins, view history, and generate monthly reports.',
      'payroll': 'Payroll & Allowances are managed by the Accounts department. You can view payment history and processed net salaries there.',
      'nominal roll': 'The Nominal Roll is an official staff register that can be filtered by department and exported as CSV or PDF.',
      'branding': 'Super Admins can change logos, background images, and portal names in Settings > Branding.',
      'organogram': 'The Organogram shows the organizational hierarchy of GDU, starting from the Director General.',
      'hello': 'Hello! I am the GDU AI Assistant. I can help you navigate the portal and answer questions about staff management.',
      'help': 'I can help with: \n1. Navigation\n2. Staff records\n3. Attendance tracking\n4. Payroll information\n5. System settings',
    };

    // Simulate AI Response
    setTimeout(() => {
      let response = "I'm sorry, I don't have specific information about that. You can find more details in the respective dashboard modules.";
      
      const lowerInput = userMessage.content.toLowerCase();
      for (const key in knowledgeBase) {
        if (lowerInput.includes(key)) {
          response = knowledgeBase[key];
          break;
        }
      }

      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 800);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 transition-all duration-300 z-50 group"
      >
        <Sparkles className="h-6 w-6 text-primary-foreground group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white" />
      </Button>
    );
  }

  return (
    <Card 
      className={cn(
        "fixed right-6 shadow-2xl border transition-all duration-300 z-50 flex flex-col overflow-hidden",
        isMinimized ? "bottom-6 w-72 h-14" : "bottom-6 w-96 h-[500px]"
      )}
    >
      <CardHeader className="p-3 border-b bg-primary text-primary-foreground flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold">GDU AI Assistant</CardTitle>
            {!isMinimized && (
              <CardDescription className="text-[10px] text-primary-foreground/70">
                Online • Powered by GDU Intelligence
              </CardDescription>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-white hover:bg-white/10"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-white hover:bg-white/10"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2 max-w-[85%]",
                      msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted rounded-tl-sm"
                      )}
                    >
                      {msg.content}
                      <p className="text-[9px] mt-1 opacity-50 text-right">{msg.timestamp}</p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-2 mr-auto">
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2">
                      <div className="flex gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce delay-75" />
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce delay-150" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="p-3 border-t bg-muted/20">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="h-9 text-sm rounded-full"
                />
                <Button size="icon" className="h-9 w-9 rounded-full" onClick={handleSend} disabled={!input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}
