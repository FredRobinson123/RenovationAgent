import { createMessageId } from "@features/chat/utils/messages";

export const CHAT_SESSION_STORAGE_KEY = "wren.chat.sessionId";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function initializeChatSessionId(): string {
  if (!isBrowser()) {
    return createMessageId();
  }

  const existing = getStoredChatSessionId();
  if (existing) {
    return existing;
  }

  const nextSession = createMessageId();
  persistChatSessionId(nextSession);
  return nextSession;
}

export function getStoredChatSessionId(): string | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(CHAT_SESSION_STORAGE_KEY);
    return stored && stored.trim().length > 0 ? stored : null;
  } catch {
    return null;
  }
}

export function persistChatSessionId(sessionId: string) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(CHAT_SESSION_STORAGE_KEY, sessionId);
  } catch {
    // ignore storage write errors
  }
}

export function resetChatSession() {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(CHAT_SESSION_STORAGE_KEY);
  } catch {
    // ignore storage write errors
  }
}


