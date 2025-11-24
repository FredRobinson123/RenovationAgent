import type { PlanAsset, PlanAssetType } from "@features/chat/types";
import {
  isAgentSource,
  isBudgetSpreadsheet,
  isContractorSpreadsheet,
  isDesignImageGallery,
  isGanttChart,
  isMaterialsSpreadsheet,
} from "@features/chat/utils/guards";

type RawPlanAssetRecord = {
  id?: unknown;
  sessionId?: unknown;
  userId?: unknown;
  assetType?: unknown;
  title?: unknown;
  summary?: unknown;
  data?: unknown;
  sourceAgent?: unknown;
  createdAt?: unknown;
};

export function normalizePlanAssets(payload: unknown): PlanAsset[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((entry) => normalizePlanAssetRecord(entry))
    .filter((asset): asset is PlanAsset => Boolean(asset));
}

function normalizePlanAssetRecord(record: unknown): PlanAsset | undefined {
  if (!record || typeof record !== "object") {
    return undefined;
  }

  const raw = record as RawPlanAssetRecord;
  if (
    typeof raw.id !== "string" ||
    typeof raw.sessionId !== "string" ||
    typeof raw.userId !== "string" ||
    typeof raw.assetType !== "string" ||
    typeof raw.title !== "string" ||
    typeof raw.createdAt !== "string" ||
    !isAgentSource(raw.sourceAgent)
  ) {
    return undefined;
  }

  const summary = typeof raw.summary === "string" ? raw.summary : undefined;
  const base = {
    id: raw.id,
    sessionId: raw.sessionId,
    userId: raw.userId,
    title: raw.title,
    summary,
    sourceAgent: raw.sourceAgent,
    createdAt: raw.createdAt,
  };

  switch (raw.assetType as PlanAssetType) {
    case "budget":
      if (isBudgetSpreadsheet(raw.data)) {
        return { ...base, assetType: "budget", data: raw.data };
      }
      break;
    case "contractor":
      if (isContractorSpreadsheet(raw.data)) {
        return { ...base, assetType: "contractor", data: raw.data };
      }
      break;
    case "materials":
      if (isMaterialsSpreadsheet(raw.data)) {
        return { ...base, assetType: "materials", data: raw.data };
      }
      break;
    case "timeline":
      if (isGanttChart(raw.data)) {
        return { ...base, assetType: "timeline", data: raw.data };
      }
      break;
    case "image-gallery":
      if (isDesignImageGallery(raw.data)) {
        return { ...base, assetType: "image-gallery", data: raw.data };
      }
      break;
    default:
      return undefined;
  }

  return undefined;
}

