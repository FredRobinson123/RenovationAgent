import { extractErrorMessage, parseAssistantMessageContent } from "@features/chat/utils/parsers";
import type {
  AgentSource,
  BudgetSpreadsheet,
  ContractorSpreadsheet,
  DesignGuide,
  DesignImageGallery,
  GanttChart,
  MaterialsSpreadsheet,
} from "@features/chat/types";
import {
  isBudgetSpreadsheet,
  isContractorSpreadsheet,
  isDesignGuide,
  isDesignImageGallery,
  isGanttChart,
  isMaterialsSpreadsheet,
} from "@features/chat/utils/guards";

const WORKFLOW_ID = "renovation-workflow";
const LOCALHOST_SERVER_URL = "http://localhost:5001";
const RUNTIME_ORIGIN =
  typeof window !== "undefined" && window.location?.origin ? window.location.origin : undefined;

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

export const API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_SERVER_URL ?? RUNTIME_ORIGIN ?? LOCALHOST_SERVER_URL
);
const WORKFLOW_ENDPOINT = `${API_BASE_URL}/api/workflows/${WORKFLOW_ID}/run`;
const WORKFLOW_REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_WORKFLOW_TIMEOUT_MS ?? 60_000);

export const WORKFLOW_TROUBLESHOOTING = `Verify Ren's API server is reachable at ${API_BASE_URL}. In production, set VITE_SERVER_URL in the client environment (Vercel → Settings → Environment Variables); locally, run "pnpm api". If requests keep timing out, check the server logs for workflow errors or raise WORKFLOW_TIMEOUT_MS in server/.env.`;

export type WorkflowUserContext = {
  id?: string;
  email?: string;
};

export type WorkflowRunOptions = {
  token?: string;
  userContext?: WorkflowUserContext;
  sessionId?: string;
  uploadedImageIds?: string[];
};

export type WorkflowRunResult = {
  finalResponse: string;
  budgetSpreadsheet?: BudgetSpreadsheet;
  contractorSpreadsheet?: ContractorSpreadsheet;
  materialsSpreadsheet?: MaterialsSpreadsheet;
  ganttChart?: GanttChart;
  imageGallery?: DesignImageGallery;
  designGuide?: DesignGuide;
  selectedAgent?: AgentSource;
};

export async function runRenovationWorkflow(
  latestCustomerMessage: string,
  conversationHistory: string,
  options: WorkflowRunOptions = {}
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

  const sessionId = options.sessionId ?? createFallbackSessionId();
  const uploadIds = Array.isArray(options.uploadedImageIds)
    ? options.uploadedImageIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

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
          sessionId,
          uploadedImageIds: uploadIds,
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
  const rawResult = record?.result;
  const resultRecord = isJsonRecord(rawResult) ? rawResult : undefined;
  const outputRecord = isJsonRecord(resultRecord?.output) ? (resultRecord.output as Record<string, unknown>) : undefined;

  const finalResponse =
    pickString(record.finalResponse) ??
    pickString(resultRecord?.finalResponse) ??
    pickString(outputRecord?.finalResponse) ??
    (typeof rawResult === "string" ? pickString(rawResult) : undefined);

  if (!finalResponse) {
    throw new Error("Workflow did not return a usable response.");
  }

  const rawFinalResponse = finalResponse;
  const parsedAssistantMessage = parseAssistantMessageContent(rawFinalResponse);

  const serverSpreadsheet =
    pickBudgetSpreadsheet(record) ??
    pickBudgetSpreadsheet(resultRecord) ??
    pickBudgetSpreadsheet(outputRecord);

  const serverContractorSpreadsheet =
    pickContractorSpreadsheet(record) ??
    pickContractorSpreadsheet(resultRecord) ??
    pickContractorSpreadsheet(outputRecord);

  const serverMaterialsSpreadsheet =
    pickMaterialsSpreadsheet(record) ??
    pickMaterialsSpreadsheet(resultRecord) ??
    pickMaterialsSpreadsheet(outputRecord);

  const serverGanttChart =
    pickGanttChart(record) ?? pickGanttChart(resultRecord) ?? pickGanttChart(outputRecord);

  const serverImageGallery =
    pickImageGallery(record) ?? pickImageGallery(resultRecord) ?? pickImageGallery(outputRecord);
  const serverDesignGuide =
    pickDesignGuide(record) ?? pickDesignGuide(resultRecord) ?? pickDesignGuide(outputRecord);

  const selectedAgent =
    pickSelectedAgent(record) ?? pickSelectedAgent(resultRecord) ?? pickSelectedAgent(outputRecord);

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

function isAgentSource(value: unknown): value is AgentSource {
  if (typeof value !== "string") {
    return false;
  }
  return [
    "assistant",
    "orchestrator",
    "design-inspiration-guide-agent",
    "budget-agent",
    "contractor-agent",
    "timeline-agent",
    "materials-agent",
  ].includes(value);
}

function createFallbackSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

