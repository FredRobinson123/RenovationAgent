import type { ChatMessage } from "@features/chat/types";

export function createMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildConversationHistory(messages: ChatMessage[]): string {
  return messages
    .map((message) => {
      const speaker = message.role === "user" ? "Customer" : "Ren";
      return `${speaker}: ${message.content}`;
    })
    .join("\n\n");
}

