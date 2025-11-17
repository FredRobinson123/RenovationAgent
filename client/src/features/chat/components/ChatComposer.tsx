import { ChatInput } from "@features/chat/components/ChatInput";

type ChatComposerProps = {
  onSendMessage: (content: string) => Promise<void>;
  disabled?: boolean;
};

export function ChatComposer({ onSendMessage, disabled }: ChatComposerProps) {
  return <ChatInput onSendMessage={onSendMessage} disabled={disabled} />;
}

