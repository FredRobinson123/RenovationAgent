import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/button";
import { Textarea } from "@/components/textarea";
import { Send } from "lucide-react";
import { cn } from "@shared/lib/utils";

interface ChatInputProps {
  onSendMessage: (content: string) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "Tell me about your renovation project",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || disabled || sending) {
      return;
    }

    setSending(true);
    try {
      await onSendMessage(trimmed);
      setMessage("");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-background/80 border-t border-border">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="bg-card border border-card-border rounded-full shadow-2xl flex items-end gap-2 px-4 py-2">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "resize-none border-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent min-h-[40px] max-h-[200px]",
              "placeholder:text-muted-foreground flex-1"
            )}
            rows={1}
            data-testid="input-chat-message"
          />

          <Button
            size="icon"
            className="shrink-0 h-9 w-9 rounded-full"
            onClick={handleSend}
            disabled={disabled || sending || !message.trim()}
            data-testid="button-send-message"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
