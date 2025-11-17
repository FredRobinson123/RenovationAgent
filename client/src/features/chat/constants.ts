import type { ChatMessage } from "@features/chat/types";

export const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "I'm Wren, I help with renovation budgets and design insipiration. What do you need help with today?",
  createdAt: new Date().toISOString(),
  source: "assistant",
};

