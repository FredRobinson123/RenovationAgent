import type { ChatMessage } from "@features/chat/types";

export const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi I'm Wren, I can help you with renovation design, budgets, timelines and sourcing. What do you need help with today?",
  createdAt: new Date().toISOString(),
  source: "assistant",
};

