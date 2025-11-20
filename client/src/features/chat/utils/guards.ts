import type {
  BudgetLineItem,
  BudgetSpreadsheet,
  ContractorRow,
  ContractorSpreadsheet,
  DesignImage,
  DesignImageGallery,
  DesignGuide,
  DesignInspirationGuidePayload,
  GanttChart,
  GanttTask,
  GanttTaskStatus,
  MaterialRow,
  MaterialsSpreadsheet,
} from "@features/chat/types";

export function isBudgetLineItem(value: unknown): value is BudgetLineItem {
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

export function isBudgetSpreadsheet(value: unknown): value is BudgetSpreadsheet {
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

export function isContractorRow(value: unknown): value is ContractorRow {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.name === "string" &&
    typeof record.serviceType === "string" &&
    typeof record.areaServed === "string" &&
    (record.website === undefined || record.website === null || typeof record.website === "string") &&
    (record.contact === undefined || record.contact === null || typeof record.contact === "string") &&
    (record.rating === undefined || record.rating === null || typeof record.rating === "string") &&
    (record.notes === undefined || record.notes === null || typeof record.notes === "string")
  );
}

export function isContractorSpreadsheet(value: unknown): value is ContractorSpreadsheet {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.projectName === "string" &&
    typeof record.location === "string" &&
    typeof record.createdAt === "string" &&
    Array.isArray(record.contractors) &&
    record.contractors.every(isContractorRow)
  );
}

export function isMaterialRow(value: unknown): value is MaterialRow {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.material === "string" &&
    typeof record.vendor === "string" &&
    typeof record.location === "string" &&
    (record.website === undefined || record.website === null || typeof record.website === "string") &&
    (record.indicativePrice === undefined ||
      record.indicativePrice === null ||
      typeof record.indicativePrice === "string") &&
    (record.leadTime === undefined || record.leadTime === null || typeof record.leadTime === "string") &&
    (record.notes === undefined || record.notes === null || typeof record.notes === "string")
  );
}

export function isMaterialsSpreadsheet(value: unknown): value is MaterialsSpreadsheet {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.projectName === "string" &&
    typeof record.location === "string" &&
    typeof record.createdAt === "string" &&
    Array.isArray(record.materials) &&
    record.materials.every(isMaterialRow)
  );
}

const ganttStatuses: GanttTaskStatus[] = ["planned", "in-progress", "blocked", "complete"];

export function isGanttTask(value: unknown): value is GanttTask {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const isValidStatus =
    record.status === undefined || record.status === null || ganttStatuses.includes(record.status as GanttTaskStatus);

  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    (record.phase === undefined || record.phase === null || typeof record.phase === "string") &&
    typeof record.startWeek === "number" &&
    typeof record.endWeek === "number" &&
    typeof record.durationWeeks === "number" &&
    isValidStatus &&
    (record.dependencies === undefined ||
      record.dependencies === null ||
      (Array.isArray(record.dependencies) && record.dependencies.every((dep) => typeof dep === "string"))) &&
    (record.notes === undefined || record.notes === null || typeof record.notes === "string")
  );
}

export function isGanttChart(value: unknown): value is GanttChart {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.projectName === "string" &&
    typeof record.startingWeek === "number" &&
    typeof record.createdAt === "string" &&
    Array.isArray(record.tasks) &&
    record.tasks.every(isGanttTask)
  );
}

export function isDesignImage(value: unknown): value is DesignImage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.imageUrl === "string" &&
    typeof record.sourceUrl === "string" &&
    (record.description === undefined || record.description === null || typeof record.description === "string")
  );
}

export function isDesignImageGallery(value: unknown): value is DesignImageGallery {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  const variant = record.variant;
  const hasValidVariant =
    variant === undefined ||
    variant === null ||
    (typeof variant === "string" && ["search", "customer"].includes(variant));
  return (
    typeof record.query === "string" &&
    (record.summary === undefined || record.summary === null || typeof record.summary === "string") &&
    hasValidVariant &&
    Array.isArray(record.images) &&
    record.images.every(isDesignImage)
  );
}

export function isDesignGuide(value: unknown): value is DesignGuide {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.condensedKeywords) &&
    record.condensedKeywords.every((keyword) => typeof keyword === "string") &&
    typeof record.pinterestSearchQuery === "string" &&
    typeof record.styleLabel === "string" &&
    typeof record.longFormGuidance === "string" &&
    (record.clarifyingQuestions === undefined ||
      record.clarifyingQuestions === null ||
      (Array.isArray(record.clarifyingQuestions) &&
        record.clarifyingQuestions.every((question) => typeof question === "string")))
  );
}

export function isDesignInspirationGuidePayload(
  value: unknown
): value is DesignInspirationGuidePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const gallery = record.imageGallery;

  return (
    isDesignGuide(record.designGuide) &&
    (gallery === undefined || gallery === null || isDesignImageGallery(gallery))
  );
}

