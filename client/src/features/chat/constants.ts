import type { ChatMessage } from "@features/chat/types";

export const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi I'm Wren, I can help you with renovating budgets and creating moodboards. What do you need help with today?",
  createdAt: new Date().toISOString(),
  source: "assistant",
};

