import type { ChatMessage } from "@features/chat/types";

export const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm Wren, your renovation assistant. Tell me about the space you're working on and what you'd like to achieve.",
  createdAt: new Date().toISOString(),
  source: "assistant",
};

