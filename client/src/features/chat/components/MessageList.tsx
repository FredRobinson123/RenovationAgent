import type { RefObject } from "react";
import type { ChatMessage } from "@features/chat/types";
import { ChatMessage as ChatMessageBubble } from "@features/chat/components/ChatMessage";
import { ThinkingIndicator } from "@features/chat/components/ThinkingIndicator";
import { cn } from "@shared/lib/utils";

type MessageListProps = {
  messages: ChatMessage[];
  isSending: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
};

export function MessageList({ messages, isSending, messagesEndRef }: MessageListProps) {
  const bottomPaddingClass = isSending ? "pb-40 sm:pb-48" : "pb-32";

  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto px-4",
        // Give extra space at the bottom while Wren is thinking so the loading
        // indicator isn't obscured by the fixed input.
        bottomPaddingClass
      )}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}

        {isSending && <ThinkingIndicator />}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

