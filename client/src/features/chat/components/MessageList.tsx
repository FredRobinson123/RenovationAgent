import type { RefObject } from "react";
import type { ChatMessage } from "@features/chat/types";
import { ChatMessage as ChatMessageBubble } from "@features/chat/components/ChatMessage";
import { ThinkingIndicator } from "@features/chat/components/ThinkingIndicator";

type MessageListProps = {
  messages: ChatMessage[];
  isSending: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
};

export function MessageList({ messages, isSending, messagesEndRef }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-32">
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

