import { useAuth, useUser } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { ChatMessage as ChatMessageBubble } from "@/features/chat/components/ChatMessage";
import { ChatInput } from "@/features/chat/components/ChatInput";
import { ThinkingIndicator } from "@/features/chat/components/ThinkingIndicator";
import { useToast } from "@/hooks/use-toast";
import type {
  BudgetLineItem,
  BudgetSpreadsheet,
  ChatMessage,
  DesignImage,
  DesignImageGallery,
} from "@/features/chat/types";

const WORKFLOW_ID = "renovation-workflow";
const DEFAULT_SERVER_URL = "http://localhost:5001";
const API_BASE_URL = (import.meta.env.VITE_SERVER_URL ?? DEFAULT_SERVER_URL).replace(/\/$/, "");
const WORKFLOW_ENDPOINT = `${API_BASE_URL}/api/workflows/${WORKFLOW_ID}/run`;
const WORKFLOW_REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_WORKFLOW_TIMEOUT_MS ?? 60_000);
const WORKFLOW_TROUBLESHOOTING = `Verify the Ren API server is running locally (run "pnpm api") and reachable at ${API_BASE_URL}. If requests keep timing out, check the server logs for workflow errors or raise WORKFLOW_TIMEOUT_MS in server/.env.`;

const initialAssistantMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I'm Ren, your renovation assistant. Tell me about the space you're working on and what you'd like to achieve.",
  createdAt: new Date().toISOString(),
  source: "assistant",
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildConversationHistory(messages: ChatMessage[]) {
  return messages
    .map((message) => {
      const speaker = message.role === "user" ? "Customer" : "Ren";
      return `${speaker}: ${message.content}`;
    })
    .join("\n\n");
}

function isBudgetLineItem(value: unknown): value is BudgetLineItem {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.category === "string" &&
    typeof record.description === "string" &&
    typeof record.cost === "number" &&
    (record.note === undefined || record.note === null || typeof record.note === "string")
  );
}

function isBudgetSpreadsheet(value: unknown): value is BudgetSpreadsheet {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.projectName === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.totalBudget === "number" &&
    typeof record.contingencyAmount === "number" &&
    typeof record.total === "number" &&
    Array.isArray(record.lineItems) &&
    record.lineItems.every(isBudgetLineItem)
  );
}

function isDesignImage(value: unknown): value is DesignImage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.imageUrl === "string" &&
    typeof record.sourceUrl === "string" &&
    (record.description === undefined ||
      record.description === null ||
      typeof record.description === "string")
  );
}

function isDesignImageGallery(value: unknown): value is DesignImageGallery {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.query === "string" &&
    (record.summary === undefined ||
      record.summary === null ||
      typeof record.summary === "string") &&
    Array.isArray(record.images) &&
    record.images.every(isDesignImage)
  );
}

function extractJsonPayload(text: string) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim();
  }

  return undefined;
}

function extractErrorMessage(body: string | undefined) {
  if (!body) {
    return undefined;
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") {
      return parsed;
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      for (const key of ["error", "message", "detail"]) {
        const value = record[key];
        if (typeof value === "string") {
          return value;
        }
      }
    }
  } catch {
    return trimmed;
  }

  return undefined;
}

function tryParseImageGallery(text: string): DesignImageGallery | undefined {
  const candidate = extractJsonPayload(text);
  if (!candidate) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(candidate);
    if (isDesignImageGallery(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === "object" && "imageGallery" in parsed) {
      const nestedGallery = (parsed as Record<string, unknown>)["imageGallery"];
      if (isDesignImageGallery(nestedGallery)) {
        return nestedGallery;
      }
    }
  } catch (error) {
    console.warn("Failed to parse image gallery JSON", error);
  }
  return undefined;
}

function tryParseBudgetSpreadsheet(text: string): BudgetSpreadsheet | undefined {
  const candidate = extractJsonPayload(text);
  if (!candidate) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(candidate);
    if (isBudgetSpreadsheet(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.warn("Failed to parse budget spreadsheet JSON", error);
  }
  return undefined;
}

function buildFriendlyErrorMessage(error: unknown) {
  const defaultMessage = `Something went wrong while contacting the renovation workflow. ${WORKFLOW_TROUBLESHOOTING}`;

  if (error instanceof Error) {
    const trimmedMessage = error.message.trim();
    if (!trimmedMessage) {
      return defaultMessage;
    }

    if (trimmedMessage.includes(WORKFLOW_TROUBLESHOOTING)) {
      return trimmedMessage;
    }

    if (
      /Failed to fetch/i.test(trimmedMessage) ||
      /Unable to reach Ren/i.test(trimmedMessage) ||
      /timed out/i.test(trimmedMessage)
    ) {
      return `${trimmedMessage} ${WORKFLOW_TROUBLESHOOTING}`;
    }

    return trimmedMessage;
  }

  return defaultMessage;
}

type WorkflowUserContext = {
  id?: string;
  email?: string;
};

async function runRenovationWorkflow(
  latestCustomerMessage: string,
  conversationHistory: string,
  options: { token?: string; userContext?: WorkflowUserContext } = {}
) {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const userMetadata: Record<string, string> = {};
  if (options.userContext?.id) {
    userMetadata.userId = options.userContext.id;
  }
  if (options.userContext?.email) {
    userMetadata.userEmail = options.userContext.email;
  }

  let response: Response;
  const supportsAbort = typeof AbortController !== "undefined";
  const abortController = supportsAbort ? new AbortController() : undefined;
  let timeoutId: number | undefined;

  if (supportsAbort) {
    timeoutId = window.setTimeout(() => {
      abortController?.abort();
    }, WORKFLOW_REQUEST_TIMEOUT_MS);
  }

  try {
    response = await fetch(WORKFLOW_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({
        inputData: {
          latestCustomerMessage,
          conversationHistory,
          ...userMetadata,
        },
      }),
      signal: abortController?.signal,
    });
  } catch (networkError) {
    if (networkError instanceof DOMException && networkError.name === "AbortError") {
      throw new Error(
        `Workflow request timed out after ${Math.round(
          WORKFLOW_REQUEST_TIMEOUT_MS / 1000
        )} seconds. ${WORKFLOW_TROUBLESHOOTING}`
      );
    }

    const networkMessage =
      networkError instanceof Error ? networkError.message : "The browser blocked the request.";
    throw new Error(
      `Unable to reach Ren's workflow server at ${API_BASE_URL}. ${WORKFLOW_TROUBLESHOOTING} (details: ${networkMessage})`
    );
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }

  const responseText = await response.text().catch(() => "");

  if (!response.ok) {
    const errorDetail =
      extractErrorMessage(responseText) ?? response.statusText ?? "The server returned an error.";
    throw new Error(`Workflow request failed (${response.status}). ${errorDetail}`);
  }

  if (!responseText) {
    throw new Error("Workflow returned an empty response.");
  }

  let data: unknown;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error("Workflow returned an invalid JSON response.");
  }

  const record = data as Record<string, unknown>;
  const result = record?.result as Record<string, unknown> | undefined;
  const finalResponse = result?.finalResponse;
  if (typeof finalResponse !== "string" || !finalResponse.trim()) {
    throw new Error("Workflow did not return a usable response.");
  }

  return finalResponse;
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialAssistantMessage]);
  const [isSending, setIsSending] = useState(false);
  const { getToken } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const conversationHistory = buildConversationHistory([...messages, userMessage]);
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      const token = await getToken().catch((error) => {
        console.error("Failed to fetch Clerk token", error);
        return null;
      });

      if (!token) {
        throw new Error("Unable to authenticate your request. Please try signing in again.");
      }

      const userMetadata = user
        ? {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress ?? undefined,
          }
        : undefined;

      const assistantText = await runRenovationWorkflow(trimmed, conversationHistory, {
        token,
        userContext: userMetadata,
      });
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: assistantText,
        createdAt: new Date().toISOString(),
        source: "assistant",
        budgetSpreadsheet: tryParseBudgetSpreadsheet(assistantText),
        imageGallery: tryParseImageGallery(assistantText),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
      const friendlyMessage = buildFriendlyErrorMessage(error);
      const assistantErrorContent = friendlyMessage.startsWith("I ")
        ? friendlyMessage
        : `I ran into a problem with that request. ${friendlyMessage}`;
      toast({
        title: "Ren hit a snag",
        description: friendlyMessage,
        variant: "destructive",
      });
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          content: assistantErrorContent,
          createdAt: new Date().toISOString(),
          source: "assistant",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col h-screen">
        <div className="flex-shrink-0 pt-8 pb-6 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Talk to Ren</h1>
          <p className="text-sm text-muted-foreground mt-2">Powered by the renovation workflow</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-32">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}

            {isSending && <ThinkingIndicator />}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <ChatInput onSendMessage={handleSendMessage} disabled={isSending} />
    </div>
  );
}
