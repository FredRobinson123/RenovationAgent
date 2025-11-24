import type { ChatMessage, CustomerImageUpload } from "@features/chat/types";

export const DEFAULT_MAX_IMAGE_IDS_PER_AGENT_RUN = 12;

type AttachmentSelectionOptions = {
  maxImageIds?: number;
};

type AttachmentCandidate = {
  attachment: CustomerImageUpload;
  sortKey: number;
};

const FALLBACK_SORT_KEY = 0;

export function selectImageIdsForAgentRun(
  conversationMessages: ChatMessage[],
  latestAttachments: CustomerImageUpload[],
  options: AttachmentSelectionOptions = {}
): string[] {
  const maxImageIds = options.maxImageIds ?? DEFAULT_MAX_IMAGE_IDS_PER_AGENT_RUN;
  if (maxImageIds <= 0) {
    return [];
  }

  const selectedIds: string[] = [];
  const seen = new Set<string>();

  const pushId = (rawId: string | undefined) => {
    const id = rawId?.trim();
    if (!id || seen.has(id) || selectedIds.length >= maxImageIds) {
      return;
    }
    seen.add(id);
    selectedIds.push(id);
  };

  latestAttachments.forEach((attachment) => pushId(attachment.id));

  const candidates = collectAttachmentCandidates(conversationMessages);
  candidates.forEach(({ attachment }) => pushId(attachment.id));

  return selectedIds;
}

function collectAttachmentCandidates(messages: ChatMessage[]): AttachmentCandidate[] {
  const candidates: AttachmentCandidate[] = [];

  for (const message of messages) {
    if (message.role !== "user" || !message.attachments?.length) {
      continue;
    }

    const messageTimestamp = toTimestamp(message.createdAt);

    for (const attachment of message.attachments) {
      const attachmentTimestamp = toTimestamp(attachment.createdAt);
      candidates.push({
        attachment,
        sortKey: Math.max(attachmentTimestamp, messageTimestamp, FALLBACK_SORT_KEY),
      });
    }
  }

  return candidates.sort((a, b) => b.sortKey - a.sortKey);
}

function toTimestamp(value: string | undefined): number {
  if (!value) {
    return FALLBACK_SORT_KEY;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : FALLBACK_SORT_KEY;
}


