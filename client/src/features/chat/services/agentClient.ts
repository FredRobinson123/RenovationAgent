import { extractErrorMessage, parseAssistantMessageContent } from "@features/chat/utils/parsers";
import type {
  AgentSource,
  BudgetSpreadsheet,
  ContractorSpreadsheet,
  CustomerImageUpload,
  DesignGuide,
  DesignImageGallery,
  GanttChart,
  MaterialsSpreadsheet,
  PlanAsset,
} from "@features/chat/types";
import {
  isBudgetSpreadsheet,
  isContractorSpreadsheet,
  isDesignGuide,
  isDesignImageGallery,
  isGanttChart,
  isMaterialsSpreadsheet,
  isAgentSource,
} from "@features/chat/utils/guards";
import { normalizePlanAssets } from "@features/chat/utils/planAssets";

const LEAD_AGENT_SLUG = "lead-renovation-agent";
const LOCALHOST_SERVER_URL = "http://localhost:5001";
const RUNTIME_ORIGIN =
  typeof window !== "undefined" && window.location?.origin ? window.location.origin : undefined;

const isLocalOrigin = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }

  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return /localhost|127\.0\.0\.1/i.test(value);
  }
};

const normalizeBaseUrl = (rawUrl: unknown): string => {
  const fallback = LOCALHOST_SERVER_URL;
  if (typeof rawUrl !== "string") {
    return fallback;
  }

  const trimmed = rawUrl.trim().replace(/\/$/, "");
  if (!trimmed) {
    return fallback;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (/^(localhost|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?/i.test(trimmed)) {
    return `http://${trimmed}`;
  }

  return `https://${trimmed}`;
};

const PREFERRED_API_BASE_URL =
  RUNTIME_ORIGIN && !isLocalOrigin(RUNTIME_ORIGIN)
    ? RUNTIME_ORIGIN
    : import.meta.env.VITE_SERVER_URL ?? RUNTIME_ORIGIN ?? LOCALHOST_SERVER_URL;

export const API_BASE_URL = normalizeBaseUrl(PREFERRED_API_BASE_URL);
const ASSISTANT_ENDPOINT = `${API_BASE_URL}/api/agents/${LEAD_AGENT_SLUG}/run`;
const ASSISTANT_REQUEST_TIMEOUT_MS = Number(
  import.meta.env.VITE_ASSISTANT_TIMEOUT_MS ?? import.meta.env.VITE_WORKFLOW_TIMEOUT_MS ?? 60_000
);

export const ASSISTANT_TROUBLESHOOTING = `Verify Ren's API server is reachable at ${API_BASE_URL}. Production deployments use the current site origin by default; only set VITE_SERVER_URL for local development or an intentionally split frontend/backend deployment. Locally, run "pnpm api". If requests keep timing out, check the server logs for agent errors or raise ASSISTANT_REQUEST_TIMEOUT_MS in server/.env.`;

export type AssistantUserContext = {
  id?: string;
  email?: string;
};

export type AgentRunOptions = {
  token?: string;
  userContext?: AssistantUserContext;
  sessionId?: string;
  uploadedImageIds?: string[];
  uploadedImages?: CustomerImageUpload[];
};

export type AgentRunResult = {
  finalResponse: string;
  budgetSpreadsheet?: BudgetSpreadsheet;
  contractorSpreadsheet?: ContractorSpreadsheet;
  materialsSpreadsheet?: MaterialsSpreadsheet;
  ganttChart?: GanttChart;
  imageGallery?: DesignImageGallery;
  designGuide?: DesignGuide;
  selectedAgent?: AgentSource;
  planAssets?: PlanAsset[];
};

export async function runLeadAgentConversation(
  latestCustomerMessage: string,
  conversationHistory: string,
  options: AgentRunOptions = {}
): Promise<AgentRunResult> {
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

  const sessionId = options.sessionId ?? createFallbackSessionId();
  const uploadIds = Array.isArray(options.uploadedImageIds)
    ? options.uploadedImageIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];
  const inlineUploads = Array.isArray(options.uploadedImages)
    ? options.uploadedImages.filter(
        (upload): upload is CustomerImageUpload =>
          typeof upload?.id === "string" &&
          upload.id.trim().length > 0 &&
          typeof upload.signedUrl === "string" &&
          upload.signedUrl.trim().length > 0
      )
    : [];

  let response: Response;
  const supportsAbort = typeof AbortController !== "undefined";
  const abortController = supportsAbort ? new AbortController() : undefined;
  let timeoutId: number | undefined;

  if (supportsAbort) {
    timeoutId = window.setTimeout(() => {
      abortController?.abort();
    }, ASSISTANT_REQUEST_TIMEOUT_MS);
  }

  try {
    response = await fetch(ASSISTANT_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({
        inputData: {
          latestCustomerMessage,
          conversationHistory,
          sessionId,
          uploadedImageIds: uploadIds,
          uploadedImages: inlineUploads.length ? inlineUploads : undefined,
          ...userMetadata,
        },
      }),
      signal: abortController?.signal,
    });
  } catch (networkError) {
    if (networkError instanceof DOMException && networkError.name === "AbortError") {
      throw new Error(
        `Assistant request timed out after ${Math.round(ASSISTANT_REQUEST_TIMEOUT_MS / 1000)} seconds. ${ASSISTANT_TROUBLESHOOTING}`
      );
    }

    const networkMessage =
      networkError instanceof Error ? networkError.message : "The browser blocked the request.";
    throw new Error(
      `Unable to reach Ren's agent server at ${API_BASE_URL}. ${ASSISTANT_TROUBLESHOOTING} (details: ${networkMessage})`
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
    throw new Error(`Assistant request failed (${response.status}). ${errorDetail}`);
  }

  if (!responseText) {
    throw new Error("Assistant returned an empty response.");
  }

  let data: unknown;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error("Assistant returned an invalid JSON response.");
  }

  const record = data as Record<string, unknown>;
  const finalResponse = pickString(record.finalResponse);

  if (!finalResponse) {
    throw new Error("Assistant did not return a usable response.");
  }

  const rawFinalResponse = finalResponse;
  const parsedAssistantMessage = parseAssistantMessageContent(rawFinalResponse);

  const serverSpreadsheet = pickBudgetSpreadsheet(record);
  const serverContractorSpreadsheet = pickContractorSpreadsheet(record);
  const serverMaterialsSpreadsheet = pickMaterialsSpreadsheet(record);
  const serverGanttChart = pickGanttChart(record);
  const serverImageGallery = pickImageGallery(record);
  const serverDesignGuide = pickDesignGuide(record);

  const selectedAgent = pickSelectedAgent(record) ?? ("lead-renovation-agent" as AgentSource);

  return {
    finalResponse: parsedAssistantMessage.content,
    budgetSpreadsheet: serverSpreadsheet ?? parsedAssistantMessage.budgetSpreadsheet,
    contractorSpreadsheet:
      serverContractorSpreadsheet ?? parsedAssistantMessage.contractorSpreadsheet,
    materialsSpreadsheet:
      serverMaterialsSpreadsheet ?? parsedAssistantMessage.materialsSpreadsheet,
    ganttChart: serverGanttChart ?? parsedAssistantMessage.ganttChart,
    imageGallery: serverImageGallery ?? parsedAssistantMessage.imageGallery,
    designGuide: serverDesignGuide ?? parsedAssistantMessage.designGuide,
    selectedAgent,
    planAssets: normalizePlanAssets(record.planAssets),
  };
}

export function buildFriendlyErrorMessage(error: unknown): string {
  const defaultMessage = `Something went wrong while contacting the renovation assistant. ${ASSISTANT_TROUBLESHOOTING}`;

  if (error instanceof Error) {
    const trimmedMessage = error.message.trim();
    if (!trimmedMessage) {
      return defaultMessage;
    }

    if (trimmedMessage.includes(ASSISTANT_TROUBLESHOOTING)) {
      return trimmedMessage;
    }

    if (
      /Failed to fetch/i.test(trimmedMessage) ||
      /Unable to reach Ren/i.test(trimmedMessage) ||
      /timed out/i.test(trimmedMessage)
    ) {
      return `${trimmedMessage} ${ASSISTANT_TROUBLESHOOTING}`;
    }

    return trimmedMessage;
  }

  return defaultMessage;
}

function pickString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickBudgetSpreadsheet(container: Record<string, unknown> | undefined): BudgetSpreadsheet | undefined {
  if (!container) {
    return undefined;
  }

  const candidate = container.budgetSpreadsheet ?? container.spreadsheet;
  if (isBudgetSpreadsheet(candidate)) {
    return candidate;
  }

  return undefined;
}

function pickContractorSpreadsheet(
  container: Record<string, unknown> | undefined
): ContractorSpreadsheet | undefined {
  if (!container) {
    return undefined;
  }

  const candidate = container.contractorSpreadsheet;
  if (isContractorSpreadsheet(candidate)) {
    return candidate;
  }

  return undefined;
}

function pickMaterialsSpreadsheet(
  container: Record<string, unknown> | undefined
): MaterialsSpreadsheet | undefined {
  if (!container) {
    return undefined;
  }

  const candidate = container.materialsSpreadsheet;
  if (isMaterialsSpreadsheet(candidate)) {
    return candidate;
  }

  return undefined;
}

function pickGanttChart(container: Record<string, unknown> | undefined): GanttChart | undefined {
  if (!container) {
    return undefined;
  }

  const candidate = container.ganttChart;
  if (isGanttChart(candidate)) {
    return candidate;
  }

  return undefined;
}

function pickImageGallery(container: Record<string, unknown> | undefined): DesignImageGallery | undefined {
  if (!container) {
    return undefined;
  }

  const candidate = container.imageGallery ?? container.gallery;
  if (isDesignImageGallery(candidate)) {
    return candidate;
  }

  return undefined;
}

function pickDesignGuide(container: Record<string, unknown> | undefined): DesignGuide | undefined {
  if (!container) {
    return undefined;
  }

  const candidate = container.designGuide;
  if (isDesignGuide(candidate)) {
    return candidate;
  }

  return undefined;
}

function pickSelectedAgent(container: Record<string, unknown> | undefined): AgentSource | undefined {
  if (!container) {
    return undefined;
  }
  const candidate = container.selectedAgent;
  return isAgentSource(candidate) ? candidate : undefined;
}

function createFallbackSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
