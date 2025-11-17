import { describe, expect, it } from "vitest";
import {
  extractJsonPayload,
  tryParseBudgetSpreadsheet,
  tryParseImageGallery,
} from "../parsers";

describe("extractJsonPayload", () => {
  it("returns fenced json content", () => {
    const payload = extractJsonPayload("```json\n{\"hello\": \"world\"}\n```");
    expect(payload).toBe('{"hello": "world"}');
  });

  it("falls back to braces", () => {
    const payload = extractJsonPayload('prefix {"foo": "bar"} suffix');
    expect(payload).toBe('{"foo": "bar"}');
  });
});

describe("tryParseBudgetSpreadsheet", () => {
  it("parses a valid spreadsheet", () => {
    const json = JSON.stringify({
      projectName: "Kitchen",
      createdAt: new Date().toISOString(),
      totalBudget: 1000,
      contingencyAmount: 100,
      total: 1100,
      lineItems: [{ category: "Cabinets", description: "Refinish", cost: 500 }],
    });
    const result = tryParseBudgetSpreadsheet(json);
    expect(result?.projectName).toBe("Kitchen");
  });

  it("returns undefined for invalid data", () => {
    expect(tryParseBudgetSpreadsheet("{}")).toBeUndefined();
  });
});

describe("tryParseImageGallery", () => {
  it("parses gallery data", () => {
    const json = JSON.stringify({
      query: "modern kitchen",
      summary: "Inspiration",
      images: [
        { id: "1", title: "Example", imageUrl: "https://example.com/a.jpg", sourceUrl: "https://example.com" },
      ],
    });
    const result = tryParseImageGallery(json);
    expect(result?.images).toHaveLength(1);
  });
});

