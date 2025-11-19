import type { BudgetSpreadsheet, DesignImageGallery } from "@features/chat/types";
import { isBudgetSpreadsheet, isDesignImageGallery } from "./guards";

export type BudgetAgentPayload = {
  messageForCustomer: string;
  spreadsheet?: BudgetSpreadsheet;
};

type JsonPayloadMatch = {
  json: string;
  start: number;
  end: number;
  kind: "fenced" | "braces";
};

export type ParsedAssistantMessageContent = {
  content: string;
  budgetSpreadsheet?: BudgetSpreadsheet;
  imageGallery?: DesignImageGallery;
};

export function extractJsonPayload(text: string): string | undefined {
  return extractJsonPayloadMatch(text)?.json;
}

export function extractErrorMessage(body: string | undefined): string | undefined {
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

export function tryParseImageGallery(text: string): DesignImageGallery | undefined {
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

export function tryParseBudgetSpreadsheet(text: string): BudgetSpreadsheet | undefined {
  const payload = tryParseBudgetAgentPayload(text);
  if (payload?.spreadsheet) {
    return payload.spreadsheet;
  }

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

export function tryParseBudgetAgentPayload(text: string): BudgetAgentPayload | undefined {
  const candidate = extractJsonPayload(text);
  if (!candidate) {
    return undefined;
  }
 
  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }

    const record = parsed as Record<string, unknown>;
    const message = typeof record.messageForCustomer === "string" ? record.messageForCustomer.trim() : "";
    if (!message) {
      return undefined;
    }

    const payload: BudgetAgentPayload = { messageForCustomer: message };

    if (isBudgetSpreadsheet(record.spreadsheet)) {
      payload.spreadsheet = record.spreadsheet;
    }

    return payload;
  } catch (error) {
    console.warn("Failed to parse budget agent payload JSON", error);
    return undefined;
  }
}

export function parseAssistantMessageContent(text: string): ParsedAssistantMessageContent {
  const normalizedInput = typeof text === "string" ? text : "";
  if (!normalizedInput.trim()) {
    return { content: "" };
  }

  const jsonMatch = extractJsonPayloadMatch(normalizedInput);
  const budgetPayload = tryParseBudgetAgentPayload(normalizedInput);
  const budgetSpreadsheet =
    budgetPayload?.spreadsheet ?? tryParseBudgetSpreadsheet(normalizedInput);
  const imageGallery = tryParseImageGallery(normalizedInput);
  const hasStructuredContent = Boolean(budgetPayload || budgetSpreadsheet || imageGallery);

  let content = budgetPayload?.messageForCustomer ?? normalizedInput;

  if (!budgetPayload && hasStructuredContent && jsonMatch) {
    content = stripJsonPayloadFromText(normalizedInput, jsonMatch);
  }

  return {
    content: content.trim(),
    budgetSpreadsheet,
    imageGallery,
  };
}

function extractJsonPayloadMatch(text: string): JsonPayloadMatch | undefined {
  if (!text) {
    return undefined;
  }

  const fencedRegex = /```(?:json)?\s*([\s\S]*?)```/i;
  const fencedMatch = fencedRegex.exec(text);
  if (fencedMatch && typeof fencedMatch.index === "number") {
    const fullMatch = fencedMatch[0] ?? "";
    const payload = (fencedMatch[1] ?? "").trim();
    return {
      json: payload,
      start: fencedMatch.index,
      end: fencedMatch.index + fullMatch.length,
      kind: "fenced",
    };
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return {
      json: text.slice(firstBrace, lastBrace + 1).trim(),
      start: firstBrace,
      end: lastBrace + 1,
      kind: "braces",
    };
  }

  return undefined;
}

function stripJsonPayloadFromText(text: string, match: JsonPayloadMatch): string {
  if (!text) {
    return "";
  }

  if (match.kind === "fenced") {
    const withoutFences = text.replace(/```(?:json)?[\s\S]*?```/gi, "");
    return normalizeMessageWhitespace(withoutFences);
  }

  const before = text.slice(0, match.start);
  const after = text.slice(match.end);
  return normalizeMessageWhitespace(`${before}${after}`);
}

function normalizeMessageWhitespace(text: string): string {
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

