import type { BudgetSpreadsheet, DesignImageGallery } from "@features/chat/types";
import { isBudgetSpreadsheet, isDesignImageGallery } from "./guards";

export type BudgetAgentPayload = {
  messageForCustomer: string;
  spreadsheet?: BudgetSpreadsheet;
};

export function extractJsonPayload(text: string): string | undefined {
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

