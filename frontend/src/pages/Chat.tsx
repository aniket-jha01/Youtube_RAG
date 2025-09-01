import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Send, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "@/components/ChatMessage";
import { SourceCard } from "@/components/SourceCard";
import { sendChatMessage, type ChatResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ChatHistory {
  id: string;
  message: string;
  isUser: boolean;
  sources?: ChatResponse['sources'];
}

export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<ChatHistory[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get thread_id from location state or localStorage
    const state = location.state as { thread_id?: string; video_id?: string } | null;
    const storedThreadId = localStorage.getItem('youtube_thread_id');
    
    if (state?.thread_id) {
      setThreadId(state.thread_id);
      localStorage.setItem('youtube_thread_id', state.thread_id);
    } else if (storedThreadId) {
      setThreadId(storedThreadId);
    } else {
      // No thread_id available, redirect to home
      navigate('/');
      return;
    }

    // Load chat history from localStorage
    const storedMessages = localStorage.getItem('youtube_chat_history');
    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch (error) {
        console.error('Failed to parse stored messages:', error);
      }
    }
  }, [location.state, navigate]);

  useEffect(() => {
    // Save chat history to localStorage
    if (messages.length > 0) {
      localStorage.setItem('youtube_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !threadId || isLoading) return;

    const userMessage = newMessage.trim();
    setNewMessage("");
    
    // Add user message immediately
    const userMessageObj: ChatHistory = {
      id: Date.now().toString(),
      message: userMessage,
      isUser: true,
    };
    
    setMessages(prev => [...prev, userMessageObj]);
    setIsLoading(true);

    try {
      const response = await sendChatMessage({
        thread_id: threadId,
        message: userMessage,
      });

      // Add assistant response
      const assistantMessageObj: ChatHistory = {
        id: (Date.now() + 1).toString(),
        message: response.message,
        isUser: false,
        sources: response.sources,
      };
      
      setMessages(prev => [...prev, assistantMessageObj]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      
      // Remove the user message if the request failed
      setMessages(prev => prev.filter(msg => msg.id !== userMessageObj.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    localStorage.removeItem('youtube_thread_id');
    localStorage.removeItem('youtube_chat_history');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              YouTube Q&A Bot
            </h1>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-card rounded-2xl p-8 shadow-soft max-w-md mx-auto">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Ready to chat!
                </h2>
                <p className="text-muted-foreground">
                  Ask any question about the YouTube video you just analyzed.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="animate-fade-in">
                  <ChatMessage
                    message={msg.message}
                    isUser={msg.isUser}
                  />
                  {!msg.isUser && msg.sources && (
                    <div className="ml-0 mr-auto max-w-[85%] md:max-w-[70%]">
                      <SourceCard sources={msg.sources} />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-chat-assistant text-chat-assistant-foreground rounded-2xl px-4 py-3 shadow-soft flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask a question about the video..."
              disabled={isLoading}
              className="flex-1 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm focus:border-primary/50 focus:ring-primary/20"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || isLoading}
              className="rounded-xl px-6 bg-primary hover:bg-primary-hover text-primary-foreground shadow-soft transition-all duration-300 hover:shadow-medium"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </footer>
    </div>
  );
}