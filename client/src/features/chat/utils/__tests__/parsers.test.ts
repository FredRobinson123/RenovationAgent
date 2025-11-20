import { describe, expect, it } from "vitest";
import {
  extractJsonPayload,
  parseAssistantMessageContent,
  tryParseBudgetAgentPayload,
  tryParseBudgetSpreadsheet,
  tryParseContractorAgentPayload,
  tryParseContractorSpreadsheet,
  tryParseDesignInspirationGuidePayload,
  tryParseGanttChart,
  tryParseImageGallery,
  tryParseMaterialsAgentPayload,
  tryParseMaterialsSpreadsheet,
  tryParseTimelineAgentPayload,
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

describe("tryParseContractorSpreadsheet", () => {
  it("parses contractor spreadsheets from payloads", () => {
    const json = JSON.stringify({
      messageForCustomer: "Here are some potential contractors to help with your tiling.",
      spreadsheet: {
        projectName: "Austin Guest Bath",
        createdAt: new Date().toISOString(),
        contractors: [
          {
            name: "Tile Pros ATX",
            specialty: "Tiling",
            url: "https://example.com/tilers",
          },
        ],
      },
    });
    const result = tryParseContractorSpreadsheet(json);
    expect(result?.projectName).toBe("Austin Guest Bath");
    expect(result?.contractors[0]?.name).toBe("Tile Pros ATX");
  });
});

describe("tryParseMaterialsSpreadsheet", () => {
  it("parses materials spreadsheets", () => {
    const json = JSON.stringify({
      spreadsheet: {
        projectName: "Kitchen Countertops",
        createdAt: new Date().toISOString(),
        materials: [
          {
            material: "Quartz slabs",
            supplier: "Stone Collective",
            price: "$95/sq ft",
            url: "https://example.com/quartz",
          },
        ],
      },
    });
    const result = tryParseMaterialsSpreadsheet(json);
    expect(result?.materials[0]?.vendor).toBe("Stone Collective");
  });
});

describe("tryParseGanttChart", () => {
  it("parses gantt chart payloads", () => {
    const json = JSON.stringify({
      messageForCustomer: "Here’s how the next six weeks stack up.",
      ganttChart: {
        projectName: "Kitchen Refresh",
        startingWeek: 1,
        createdAt: new Date().toISOString(),
        tasks: [
          { id: "demo", name: "Demo", startWeek: 1, endWeek: 1, durationWeeks: 1 },
          { id: "rough", name: "MEP Rough-In", startWeek: 2, endWeek: 3, durationWeeks: 2 },
        ],
      },
    });
    const result = tryParseGanttChart(json);
    expect(result?.tasks).toHaveLength(2);
    expect(result?.startingWeek).toBe(1);
  });
});

describe("tryParseContractorAgentPayload", () => {
  it("returns the contractor message and spreadsheet", () => {
    const json = JSON.stringify({
      messageForCustomer: "Here are some potential contractors to help with the built-ins.",
      spreadsheet: {
        projectName: "Built-in shelving",
        createdAt: new Date().toISOString(),
        contractors: [
          {
            name: "BK Millworks",
            specialty: "Carpentry",
          },
        ],
      },
    });
    const result = tryParseContractorAgentPayload(json);
    expect(result?.messageForCustomer).toMatch(/built-ins/);
    expect(result?.spreadsheet?.contractors[0]?.name).toBe("BK Millworks");
  });
});

describe("tryParseMaterialsAgentPayload", () => {
  it("parses the materials agent payload", () => {
    const json = JSON.stringify({
      messageForCustomer: "Here are some potential suppliers to help with the terrazzo look.",
      spreadsheet: {
        projectName: "Terrazzo sourcing",
        createdAt: new Date().toISOString(),
        materials: [
          {
            material: "Terrazzo-look porcelain",
            supplier: "Surface Lab",
          },
        ],
      },
    });
    const result = tryParseMaterialsAgentPayload(json);
    expect(result?.messageForCustomer).toMatch(/suppliers/);
    expect(result?.spreadsheet?.materials[0]?.material).toContain("Terrazzo");
  });
});

describe("tryParseTimelineAgentPayload", () => {
  it("parses gantt chart payloads", () => {
    const json = JSON.stringify({
      messageForCustomer: "Demo + MEP rough-in spans weeks 1–3.",
      ganttChart: {
        projectName: "Primary Bath",
        startingWeek: 1,
        createdAt: new Date().toISOString(),
        tasks: [{ id: "demo", name: "Demo", startWeek: 1, endWeek: 1, durationWeeks: 1 }],
      },
    });
    const result = tryParseTimelineAgentPayload(json);
    expect(result?.messageForCustomer).toMatch(/Demo/);
    expect(result?.ganttChart?.tasks).toHaveLength(1);
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

  it("preserves the gallery variant flag", () => {
    const json = JSON.stringify({
      variant: "customer",
      query: "customer uploads",
      summary: "Moodboard inputs",
      images: [
        { id: "1", title: "Upload A", imageUrl: "https://example.com/a.jpg", sourceUrl: "https://example.com/a" },
      ],
    });
    const result = tryParseImageGallery(json);
    expect(result?.variant).toBe("customer");
  });
});

describe("tryParseDesignInspirationGuidePayload", () => {
  it("parses the design guide and gallery", () => {
    const json = JSON.stringify({
      designGuide: {
        condensedKeywords: ["organic modern living room", "boucle sofa"],
        pinterestSearchQuery: "organic modern living room boucle sofa",
        styleLabel: "Organic Modern",
        longFormGuidance: "Lean into curved seating and a clay plaster palette.",
        clarifyingQuestions: ["Any heirloom pieces to keep?"],
      },
      imageGallery: {
        query: "organic modern living room boucle sofa",
        summary: "Warm sculptural neutrals",
        images: [
          {
            id: "a",
            title: "Curved sofa",
            imageUrl: "https://example.com/inspo.jpg",
            sourceUrl: "https://pinterest.com/pin/123",
          },
        ],
      },
    });

    const result = tryParseDesignInspirationGuidePayload(json);
    expect(result?.designGuide.styleLabel).toBe("Organic Modern");
    expect(result?.imageGallery?.images).toHaveLength(1);
  });
});

describe("parseAssistantMessageContent", () => {
  it("removes image gallery json from the assistant text", () => {
    const message = [
      "Here are a few ideas that blend Victorian charm with modern silhouettes.",
      "```json",
      JSON.stringify({
        imageGallery: {
          query: "modern victorian sofas",
          images: [
            { id: "1", title: "Modern", imageUrl: "https://example.com/1.jpg", sourceUrl: "https://example.com" },
          ],
        },
      }),
      "```",
    ].join("\n");

    const parsed = parseAssistantMessageContent(message);
    expect(parsed.content).toBe("Here are a few ideas that blend Victorian charm with modern silhouettes.");
    expect(parsed.imageGallery?.images).toHaveLength(1);
  });

  it("returns plain text when there is no structured data", () => {
    const message = "I can price that project at roughly $45k depending on finishes.";
    const parsed = parseAssistantMessageContent(message);
    expect(parsed.content).toBe(message);
    expect(parsed.budgetSpreadsheet).toBeUndefined();
    expect(parsed.imageGallery).toBeUndefined();
  });

  it("extracts contractor spreadsheets and surfaces the message", () => {
    const payload = JSON.stringify({
      messageForCustomer: "Here are some potential contractors to help with your kitchen flooring.",
      spreadsheet: {
        projectName: "Kitchen Flooring",
        createdAt: new Date().toISOString(),
        contractors: [
          {
            name: "Denver Flooring Co",
            specialty: "Flooring",
          },
        ],
      },
    });
    const parsed = parseAssistantMessageContent(payload);
    expect(parsed.content).toMatch(/potential contractors/);
    expect(parsed.contractorSpreadsheet?.contractors[0]?.specialty).toBe("Flooring");
  });

  it("extracts gantt chart data from timeline agent messages", () => {
    const payload = JSON.stringify({
      messageForCustomer: "Here’s the six-week plan.",
      ganttChart: {
        projectName: "Laundry Room",
        startingWeek: 1,
        createdAt: new Date().toISOString(),
        tasks: [
          { id: "demo", name: "Demo", startWeek: 1, endWeek: 1, durationWeeks: 1 },
          { id: "tile", name: "Tile install", startWeek: 2, endWeek: 3, durationWeeks: 2 },
        ],
      },
    });
    const parsed = parseAssistantMessageContent(payload);
    expect(parsed.content).toMatch(/six-week plan/);
    expect(parsed.ganttChart?.tasks).toHaveLength(2);
  });

  it("formats design inspiration guide payloads", () => {
    const payload = JSON.stringify({
      designGuide: {
        condensedKeywords: ["organic modern living room", "travertine coffee table"],
        pinterestSearchQuery: "organic modern living room travertine coffee table",
        styleLabel: "Organic Modern",
        longFormGuidance: "Layer boucle seating with sculptural travertine and matte black lighting.",
        clarifyingQuestions: ["What's your budget ceiling?"],
      },
      imageGallery: {
        query: "organic modern living room travertine coffee table",
        images: [
          {
            id: "pin-1",
            title: "Travertine + boucle",
            imageUrl: "https://pinterest.com/pin/1.jpg",
            sourceUrl: "https://pinterest.com/pin/1",
          },
        ],
      },
    });

    const parsed = parseAssistantMessageContent(payload);
    expect(parsed.designGuide?.styleLabel).toBe("Organic Modern");
    expect(parsed.imageGallery?.query).toMatch(/travertine/);
    expect(parsed.content).toMatch(/Layer boucle seating/i);
    expect(parsed.content).toMatch(/Pinterest search:/i);
    expect(parsed.content).toMatch(/Still need/i);
  });
});

