import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PlanBuilderPanel } from "../PlanBuilderPanel";
import type { PlanAsset } from "@features/chat/types";

const now = new Date().toISOString();

const mockAssets: PlanAsset[] = [
  {
    id: "budget_asset",
    sessionId: "session_1",
    userId: "user_123",
    assetType: "budget",
    title: "Kitchen Budget",
    summary: "Keep demo + cabinetry within £45k.",
    sourceAgent: "budget-agent",
    createdAt: now,
    data: {
      projectName: "Kitchen Refresh",
      createdAt: now,
      totalBudget: 45000,
      contingencyAmount: 5000,
      total: 40000,
      lineItems: [
        { category: "Demo", description: "Strip existing cabinets", cost: 5000 },
        { category: "Cabinetry", description: "Custom oak fronts", cost: 18000 },
      ],
    },
  },
  {
    id: "contractor_asset",
    sessionId: "session_1",
    userId: "user_123",
    assetType: "contractor",
    title: "Recommended Contractors",
    summary: "Shortlist vetted by Wren.",
    sourceAgent: "contractor-agent",
    createdAt: now,
    data: {
      projectName: "Austin Built-ins",
      createdAt: now,
      contractors: [{ name: "BK Millworks", specialty: "Custom cabinetry", url: "https://example.com" }],
    },
  },
  {
    id: "materials_asset",
    sessionId: "session_1",
    userId: "user_123",
    assetType: "materials",
    title: "Materials Sourcing",
    summary: "Quartz + brass package.",
    sourceAgent: "materials-agent",
    createdAt: now,
    data: {
      projectName: "Primary bath finishes",
      createdAt: now,
      materials: [
        { material: "Quartz slabs", supplier: "Surface Lab", price: "$95/sq ft", url: "https://example.com" },
      ],
    },
  },
  {
    id: "timeline_asset",
    sessionId: "session_1",
    userId: "user_123",
    assetType: "timeline",
    title: "8-week timeline",
    summary: "Demo → handover with buffer for inspections.",
    sourceAgent: "timeline-agent",
    createdAt: now,
    data: {
      projectName: "Kitchen timeline",
      startingWeek: 1,
      createdAt: now,
      tasks: [
        { id: "demo", name: "Demo", startWeek: 1, endWeek: 1, durationWeeks: 1 },
        { id: "rough", name: "MEP rough-in", startWeek: 2, endWeek: 3, durationWeeks: 2 },
      ],
    },
  },
  {
    id: "design_asset",
    sessionId: "session_1",
    userId: "user_123",
    assetType: "design-guide",
    title: "Japandi Inspiration",
    summary: "Blend light oak with limewash plaster.",
    sourceAgent: "design-inspiration-guide-agent",
    createdAt: now,
    data: {
      condensedKeywords: ["Japandi", "Light oak", "Limewash"],
      pinterestSearchQuery: "Japandi plaster cabinet pulls",
      styleLabel: "Warm Japandi",
      longFormGuidance: "Keep palette tonal with matte brass + split-face travertine.",
      clarifyingQuestions: ["Do you want ribbed details on the island?"],
    },
  },
  {
    id: "gallery_asset",
    sessionId: "session_1",
    userId: "user_123",
    assetType: "image-gallery",
    title: "Mood board",
    summary: "Gallery curated from Pinterest queries.",
    sourceAgent: "design-inspiration-guide-agent",
    createdAt: now,
    data: {
      query: "Modern organic kitchen",
      summary: "Earthy plaster with statement stone veining.",
      images: [
        {
          id: "img_1",
          title: "Warm plaster",
          imageUrl: "https://example.com/plaster.jpg",
          sourceUrl: "https://example.com",
        },
      ],
    },
  },
];

describe("PlanBuilderPanel", () => {
  it("renders a section for each plan asset type", () => {
    const markup = renderToStaticMarkup(<PlanBuilderPanel planAssets={mockAssets} />);
    expect(markup).toContain("Plan builder");
    expect(markup).toContain("Budget");
    expect(markup).toContain("Contractor Sourcing");
    expect(markup).toContain("Materials &amp; Finishes");
    expect(markup).toContain("Project Timeline");
    expect(markup).toContain("Design Direction");
    expect(markup).toContain("Inspiration Gallery");
  });

  it("includes asset titles inside their respective sections", () => {
    const markup = renderToStaticMarkup(<PlanBuilderPanel planAssets={mockAssets} />);
    expect(markup).toContain("Kitchen Budget");
    expect(markup).toContain("Recommended Contractors");
    expect(markup).toContain("Materials Sourcing");
    expect(markup).toContain("8-week timeline");
    expect(markup).toContain("Japandi Inspiration");
    expect(markup).toContain("Mood board");
  });
});

