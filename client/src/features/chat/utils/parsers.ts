import type {
  BudgetSpreadsheet,
  ContractorSpreadsheet,
  DesignImageGallery,
  DesignGuide,
  DesignInspirationGuidePayload,
  GanttChart,
  MaterialsSpreadsheet,
} from "@features/chat/types";
import {
  isBudgetSpreadsheet,
  isContractorSpreadsheet,
  isDesignImageGallery,
  isDesignInspirationGuidePayload,
  isDesignGuide,
  isGanttChart,
  isMaterialsSpreadsheet,
} from "./guards";

export type BudgetAgentPayload = {
  messageForCustomer: string;
  spreadsheet?: BudgetSpreadsheet;
};

export type ContractorAgentPayload = {
  messageForCustomer: string;
  spreadsheet?: ContractorSpreadsheet;
};

export type MaterialsAgentPayload = {
  messageForCustomer: string;
  spreadsheet?: MaterialsSpreadsheet;
};

export type TimelineAgentPayload = {
  messageForCustomer: string;
  ganttChart?: GanttChart;
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
  contractorSpreadsheet?: ContractorSpreadsheet;
  materialsSpreadsheet?: MaterialsSpreadsheet;
  ganttChart?: GanttChart;
  imageGallery?: DesignImageGallery;
  designGuide?: DesignGuide;
};

type JsonRecord = Record<string, unknown>;

type AgentPayloadParserConfig<TPayload extends { messageForCustomer: string }> = {
  label: string;
  pickStructured?: (record: JsonRecord) => Partial<TPayload>;
};

function createAgentPayloadParser<TPayload extends { messageForCustomer: string }>(
  config: AgentPayloadParserConfig<TPayload>
) {
  return (text: string): TPayload | undefined => {
    const candidate = extractJsonPayload(text);
    if (!candidate) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(candidate);
      if (!parsed || typeof parsed !== "object") {
        return undefined;
      }

      const record = parsed as JsonRecord;
      const message =
        typeof record.messageForCustomer === "string" ? record.messageForCustomer.trim() : "";
      if (!message) {
        return undefined;
      }

      const structured = config.pickStructured?.(record) ?? {};
      return {
        messageForCustomer: message,
        ...structured,
      } as TPayload;
    } catch (error) {
      console.warn(`Failed to parse ${config.label} JSON`, error);
      return undefined;
    }
  };
}

type StructuredParserConfig<T> = {
  label: string;
  guard: (value: unknown) => value is T;
  nestedKeys?: string[];
};

function createStructuredObjectParser<T>(config: StructuredParserConfig<T>) {
  return (text: string): T | undefined => {
    const candidate = extractJsonPayload(text);
    if (!candidate) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(candidate);
      if (config.guard(parsed)) {
        return parsed;
      }

      if (parsed && typeof parsed === "object" && config.nestedKeys?.length) {
        const record = parsed as JsonRecord;
        for (const key of config.nestedKeys) {
          const value = record[key];
          if (config.guard(value)) {
            return value;
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to parse ${config.label} JSON`, error);
    }

    return undefined;
  };
}

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

export function tryParseDesignInspirationGuidePayload(
  text: string
): DesignInspirationGuidePayload | undefined {
  const candidate = extractJsonPayload(text);
  if (!candidate) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(candidate);
    if (isDesignInspirationGuidePayload(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === "object" && "designGuide" in parsed) {
      const record = parsed as Record<string, unknown>;
      const payload: DesignInspirationGuidePayload | undefined = isDesignGuide(record.designGuide)
        ? {
            designGuide: record.designGuide,
            imageGallery: isDesignImageGallery(record.imageGallery)
              ? (record.imageGallery as DesignImageGallery)
              : undefined,
          }
        : undefined;
      if (payload) {
        return payload;
      }
    }
  } catch (error) {
    console.warn("Failed to parse design inspiration guide payload JSON", error);
  }
  return undefined;
}

const parseBudgetSpreadsheetJson = createStructuredObjectParser<BudgetSpreadsheet>({
  label: "budget spreadsheet",
  guard: isBudgetSpreadsheet,
  nestedKeys: ["spreadsheet"],
});

const parseContractorSpreadsheetJson = createStructuredObjectParser<ContractorSpreadsheet>({
  label: "contractor spreadsheet",
  guard: isContractorSpreadsheet,
  nestedKeys: ["spreadsheet"],
});

const parseMaterialsSpreadsheetJson = createStructuredObjectParser<MaterialsSpreadsheet>({
  label: "materials spreadsheet",
  guard: isMaterialsSpreadsheet,
  nestedKeys: ["spreadsheet"],
});

const parseGanttChartJson = createStructuredObjectParser<GanttChart>({
  label: "gantt chart",
  guard: isGanttChart,
  nestedKeys: ["ganttChart"],
});

export const tryParseBudgetSpreadsheet = (text: string): BudgetSpreadsheet | undefined =>
  parseBudgetSpreadsheetJson(text);

export const tryParseContractorSpreadsheet = (text: string): ContractorSpreadsheet | undefined =>
  parseContractorSpreadsheetJson(text);

export const tryParseMaterialsSpreadsheet = (text: string): MaterialsSpreadsheet | undefined =>
  parseMaterialsSpreadsheetJson(text);

export const tryParseGanttChart = (text: string): GanttChart | undefined => parseGanttChartJson(text);

export const tryParseBudgetAgentPayload = createAgentPayloadParser<BudgetAgentPayload>({
  label: "budget agent payload",
  pickStructured: (record) =>
    isBudgetSpreadsheet(record.spreadsheet) ? { spreadsheet: record.spreadsheet } : {},
});

export const tryParseContractorAgentPayload = createAgentPayloadParser<ContractorAgentPayload>({
  label: "contractor agent payload",
  pickStructured: (record) =>
    isContractorSpreadsheet(record.spreadsheet) ? { spreadsheet: record.spreadsheet } : {},
});

export const tryParseMaterialsAgentPayload = createAgentPayloadParser<MaterialsAgentPayload>({
  label: "materials agent payload",
  pickStructured: (record) =>
    isMaterialsSpreadsheet(record.spreadsheet) ? { spreadsheet: record.spreadsheet } : {},
});

export const tryParseTimelineAgentPayload = createAgentPayloadParser<TimelineAgentPayload>({
  label: "timeline agent payload",
  pickStructured: (record) =>
    isGanttChart(record.ganttChart) ? { ganttChart: record.ganttChart } : {},
});

export function parseAssistantMessageContent(text: string): ParsedAssistantMessageContent {
  const normalizedInput = typeof text === "string" ? text : "";
  if (!normalizedInput.trim()) {
    return { content: "" };
  }

  const jsonMatch = extractJsonPayloadMatch(normalizedInput);
  const budgetPayload = tryParseBudgetAgentPayload(normalizedInput);
  const contractorPayload = tryParseContractorAgentPayload(normalizedInput);
  const materialsPayload = tryParseMaterialsAgentPayload(normalizedInput);
  const timelinePayload = tryParseTimelineAgentPayload(normalizedInput);
  const designInspirationPayload = tryParseDesignInspirationGuidePayload(normalizedInput);

  const budgetSpreadsheet =
    budgetPayload?.spreadsheet ?? tryParseBudgetSpreadsheet(normalizedInput);
  const contractorSpreadsheet =
    contractorPayload?.spreadsheet ?? tryParseContractorSpreadsheet(normalizedInput);
  const materialsSpreadsheet =
    materialsPayload?.spreadsheet ?? tryParseMaterialsSpreadsheet(normalizedInput);
  const ganttChart = timelinePayload?.ganttChart ?? tryParseGanttChart(normalizedInput);
  const imageGallery =
    designInspirationPayload?.imageGallery ?? tryParseImageGallery(normalizedInput);
  const designGuide = designInspirationPayload?.designGuide;

  const hasStructuredContent = Boolean(
    budgetPayload ||
      contractorPayload ||
      materialsPayload ||
      timelinePayload ||
      budgetSpreadsheet ||
      contractorSpreadsheet ||
      materialsSpreadsheet ||
      ganttChart ||
      imageGallery ||
      designGuide
  );

  let content =
    budgetPayload?.messageForCustomer ??
    contractorPayload?.messageForCustomer ??
    materialsPayload?.messageForCustomer ??
    timelinePayload?.messageForCustomer ??
    normalizedInput;

  if (designGuide) {
    content = buildDesignGuideMessage(designGuide);
  }

  if (
    !budgetPayload &&
    !contractorPayload &&
    !materialsPayload &&
    !timelinePayload &&
    !designGuide &&
    hasStructuredContent &&
    jsonMatch
  ) {
    content = stripJsonPayloadFromText(normalizedInput, jsonMatch);
  }

  return {
    content: content.trim(),
    budgetSpreadsheet,
    contractorSpreadsheet,
    materialsSpreadsheet,
    ganttChart,
    imageGallery,
    designGuide,
  };
}

function buildDesignGuideMessage(designGuide: DesignGuide): string {
  const sections: string[] = [];

  if (designGuide.longFormGuidance?.trim()) {
    sections.push(designGuide.longFormGuidance.trim());
  }

  const metadataLines: string[] = [];
  if (designGuide.condensedKeywords && designGuide.condensedKeywords.length > 0) {
    metadataLines.push(
      `**Pinterest keywords:** ${designGuide.condensedKeywords.join(", ")}`
    );
  }
  if (designGuide.styleLabel) {
    metadataLines.push(`**Style label:** ${designGuide.styleLabel}`);
  }
  if (designGuide.pinterestSearchQuery) {
    metadataLines.push(`**Pinterest search:** ${designGuide.pinterestSearchQuery}`);
  }
  if (metadataLines.length) {
    sections.push(metadataLines.join("\n"));
  }

  if (designGuide.clarifyingQuestions && designGuide.clarifyingQuestions.length > 0) {
    sections.push(
      ["**Still need:**", ...designGuide.clarifyingQuestions.map((question) => `- ${question}`)].join(
        "\n"
      )
    );
  }

  return sections.filter(Boolean).join("\n\n").trim() || "Here’s how I’d evolve your space.";
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

