import { extractErrorMessage, tryParseBudgetSpreadsheet, tryParseImageGallery } from "@features/chat/utils/parsers";
import type { ChatMessage } from "@features/chat/types";
import type { BudgetSpreadsheet, DesignImageGallery } from "@features/chat/types";

const WORKFLOW_ID = "renovation-workflow";
const LOCALHOST_SERVER_URL = "http://localhost:5001";
const RUNTIME_ORIGIN =
  typeof window !== "undefined" && window.location?.origin ? window.location.origin : undefined;
const API_BASE_URL = (import.meta.env.VITE_SERVER_URL ?? RUNTIME_ORIGIN ?? LOCALHOST_SERVER_URL).replace(
  /\/$/,
  ""
);
const WORKFLOW_ENDPOINT = `${API_BASE_URL}/api/workflows/${WORKFLOW_ID}/run`;
const WORKFLOW_REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_WORKFLOW_TIMEOUT_MS ?? 60_000);

export const WORKFLOW_TROUBLESHOOTING = `Verify Ren's API server is reachable at ${API_BASE_URL}. In production, set VITE_SERVER_URL in the client environment (Vercel → Settings → Environment Variables); locally, run "pnpm api". If requests keep timing out, check the server logs for workflow errors or raise WORKFLOW_TIMEOUT_MS in server/.env.`;

export type WorkflowUserContext = {
  id?: string;
  email?: string;
};

export type WorkflowRunResult = {
  finalResponse: string;
  budgetSpreadsheet?: BudgetSpreadsheet;
  imageGallery?: DesignImageGallery;
};

export async function runRenovationWorkflow(
  latestCustomerMessage: string,
  conversationHistory: string,
  options: { token?: string; userContext?: WorkflowUserContext } = {}
): Promise<WorkflowRunResult> {
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
        `Workflow request timed out after ${Math.round(WORKFLOW_REQUEST_TIMEOUT_MS / 1000)} seconds. ${WORKFLOW_TROUBLESHOOTING}`
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

  return {
    finalResponse,
    budgetSpreadsheet: tryParseBudgetSpreadsheet(finalResponse),
    imageGallery: tryParseImageGallery(finalResponse),
  };
}

export function buildFriendlyErrorMessage(error: unknown): string {
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

