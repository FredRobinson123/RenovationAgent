import { describe, expect, it } from "vitest";
import {
  extractJsonPayload,
  tryParseBudgetAgentPayload,
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

  it("parses spreadsheets embedded in the budget agent payload", () => {
    const json = JSON.stringify({
      messageForCustomer: "Here's the breakdown you asked for.",
      spreadsheet: {
        projectName: "Primary Bath",
        createdAt: new Date().toISOString(),
        totalBudget: 28000,
        contingencyAmount: 3000,
        total: 25000,
        lineItems: [{ category: "Tile", description: "Floor & shower tile", cost: 8000 }],
      },
    });
    const result = tryParseBudgetSpreadsheet(json);
    expect(result?.projectName).toBe("Primary Bath");
  });
});

describe("tryParseBudgetAgentPayload", () => {
  it("parses the message and spreadsheet", () => {
    const json = JSON.stringify({
      messageForCustomer: "A $60k envelope covers this scope in Austin.",
      spreadsheet: {
        projectName: "Austin Whole Home",
        createdAt: new Date().toISOString(),
        totalBudget: 62000,
        contingencyAmount: 5000,
        total: 57000,
        lineItems: [{ category: "Flooring", description: "Engineered oak throughout", cost: 18000 }],
      },
    });
    const result = tryParseBudgetAgentPayload(json);
    expect(result?.messageForCustomer).toMatch(/Austin/);
    expect(result?.spreadsheet?.projectName).toBe("Austin Whole Home");
  });

  it("returns undefined without a message", () => {
    const json = JSON.stringify({
      spreadsheet: {
        projectName: "No Message",
        createdAt: new Date().toISOString(),
        totalBudget: 1000,
        contingencyAmount: 100,
        total: 900,
        lineItems: [{ category: "Test", description: "Test", cost: 900 }],
      },
    });
    expect(tryParseBudgetAgentPayload(json)).toBeUndefined();
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

