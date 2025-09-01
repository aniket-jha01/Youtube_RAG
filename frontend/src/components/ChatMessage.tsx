import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  className?: string;
}

export function ChatMessage({ message, isUser, className }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex w-full animate-message-bounce",
        isUser ? "justify-end" : "justify-start",
        className
      )}
    >
      <div
        className={cn(
          "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-soft transition-all duration-300",
          isUser
            ? "bg-chat-user text-chat-user-foreground ml-auto"
            : "bg-chat-assistant text-chat-assistant-foreground mr-auto"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message}
        </p>
      </div>
    </div>
  );
}