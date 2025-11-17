import { ChatComposer } from "@features/chat/components/ChatComposer";
import { ChatHeader } from "@features/chat/components/ChatHeader";
import { MessageList } from "@features/chat/components/MessageList";
import { useChatSession } from "@features/chat/hooks/useChatSession";

export default function HomePage() {
  const { messages, isSending, sendMessage, messagesEndRef } = useChatSession();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col h-screen">
        <ChatHeader />
        <MessageList messages={messages} isSending={isSending} messagesEndRef={messagesEndRef} />
      </div>
      <ChatComposer onSendMessage={sendMessage} disabled={isSending} />
    </div>
  );
}
