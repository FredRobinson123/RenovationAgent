import type { ReactNode, RefObject } from "react";
import type { ChatMessage } from "@features/chat/types";
import { ChatMessage as ChatMessageBubble } from "@features/chat/components/ChatMessage";
import { ThinkingIndicator } from "@features/chat/components/ThinkingIndicator";
import { cn } from "@shared/lib/utils";

type MessageListProps = {
  messages: ChatMessage[];
  isSending: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
  footerSlot?: ReactNode;
};

export function MessageList({ messages, isSending, messagesEndRef, footerSlot }: MessageListProps) {
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto px-4",
        // Give extra space at the bottom while Wren is thinking so the
        // loading indicator isn't obscured by the fixed chat input.
        isSending ? "pb-40 sm:pb-48" : "pb-32"
      )}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}

        {footerSlot}

        {isSending && <ThinkingIndicator />}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

