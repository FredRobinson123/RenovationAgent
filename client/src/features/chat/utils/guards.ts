import type {
  BudgetLineItem,
  BudgetSpreadsheet,
  DesignImage,
  DesignImageGallery,
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

