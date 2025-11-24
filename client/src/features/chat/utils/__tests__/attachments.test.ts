import { describe, expect, it } from "vitest";
import { selectImageIdsForAgentRun } from "../attachments";
import type { ChatMessage, CustomerImageUpload } from "../../types";

const now = Date.now();

const mockAttachment = (id: string, offsetMs = 0): CustomerImageUpload => ({
  id,
  sessionId: "session-1",
  fileName: `${id}.jpg`,
  mimeType: "image/jpeg",
  sizeBytes: 1024,
  createdAt: new Date(now - offsetMs).toISOString(),
  signedUrl: `https://example.com/${id}.jpg`,
});

const mockUserMessage = (
  id: string,
  attachments: CustomerImageUpload[],
  offsetMs = 0
): ChatMessage => ({
  id,
  role: "user",
  content: `message-${id}`,
  createdAt: new Date(now - offsetMs).toISOString(),
  attachments,
});

describe("selectImageIdsForAgentRun", () => {
  it("prioritizes the latest attachments before recalling older uploads", () => {
    const latest = [mockAttachment("latest-a"), mockAttachment("latest-b")];
    const history: ChatMessage[] = [
      mockUserMessage("older", [mockAttachment("old-a", 1_000), mockAttachment("old-b", 2_000)], 2_000),
    ];

    const ids = selectImageIdsForAgentRun([...history], latest, { maxImageIds: 4 });

    expect(ids).toEqual(["latest-a", "latest-b", "old-a", "old-b"]);
  });

  it("deduplicates attachments that were already recalled", () => {
    const latest = [mockAttachment("shared-a")];
    const history: ChatMessage[] = [
      mockUserMessage("first", [mockAttachment("shared-a", 5_000), mockAttachment("unique-b", 4_000)], 5_000),
    ];

    const ids = selectImageIdsForAgentRun(history, latest, { maxImageIds: 3 });

    expect(ids).toEqual(["shared-a", "unique-b"]);
  });

  it("recalls previous uploads when no new attachments are sent", () => {
    const history: ChatMessage[] = [
      mockUserMessage("with-images", [mockAttachment("gallery-1", 3_000), mockAttachment("gallery-2", 2_000)], 3_000),
    ];

    const ids = selectImageIdsForAgentRun(history, [], { maxImageIds: 2 });

    expect(ids).toEqual(["gallery-1", "gallery-2"]);
  });

  it("respects the maximum image count", () => {
    const latest = [mockAttachment("latest")];
    const history: ChatMessage[] = [
      mockUserMessage("older", [mockAttachment("old-a", 3_000), mockAttachment("old-b", 2_000)], 3_000),
    ];

    const ids = selectImageIdsForAgentRun(history, latest, { maxImageIds: 2 });

    expect(ids).toEqual(["latest", "old-a"]);
  });
});


