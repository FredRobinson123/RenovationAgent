import { buildConversationHistory } from "../messages";
import type { ChatMessage, CustomerImageUpload } from "../../types";

const mockAttachment = (id: string): CustomerImageUpload => ({
  id,
  sessionId: "session-1",
  fileName: `${id}.jpg`,
  mimeType: "image/jpeg",
  sizeBytes: 1024,
  createdAt: new Date().toISOString(),
  signedUrl: `https://example.com/${id}.jpg`,
});

describe("buildConversationHistory", () => {
  it("adds an attachment note when the customer uploads images", () => {
    const messages: ChatMessage[] = [
      {
        id: "user-1",
        role: "user",
        content: "Here are my moodboard uploads.",
        createdAt: new Date().toISOString(),
        attachments: [mockAttachment("upload-a"), mockAttachment("upload-b")],
      },
      {
        id: "assistant-1",
        role: "assistant",
        content: "Great, I'll use these!",
        createdAt: new Date().toISOString(),
      },
    ];

    const history = buildConversationHistory(messages);
    expect(history).toContain("Customer uploaded 2 inspiration images.");
  });
});

