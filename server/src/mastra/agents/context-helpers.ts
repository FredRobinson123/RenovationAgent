import type { MessageListInput } from '@mastra/core/agent/message-list';
import type { ChatImageUploadWithUrl } from '../../services/chat-upload-service.js';
import { getUploadsWithSignedUrls } from '../../services/chat-upload-service.js';

type ConversationContext = {
  latestCustomerMessage: string;
  conversationHistory?: string;
};

type MultimodalContext = ConversationContext & {
  uploads: ChatImageUploadWithUrl[];
};

export async function loadUploadsForTurn(
  uploadedImageIds: string[] | undefined,
  userId: string | undefined,
  logLabel: string
): Promise<ChatImageUploadWithUrl[]> {
  if (!uploadedImageIds?.length || !userId) {
    return [];
  }

  try {
    return await getUploadsWithSignedUrls(uploadedImageIds, userId);
  } catch (error) {
    console.warn(`Failed to load uploads for ${logLabel}`, error);
    return [];
  }
}

export function buildConversationAwareMessage({
  latestCustomerMessage,
  conversationHistory,
}: ConversationContext): MessageListInput {
  const baseText = conversationHistory
    ? `Previous conversation context: ${conversationHistory}\n\nUser message: ${latestCustomerMessage}`
    : latestCustomerMessage;

  return [
    {
      role: 'user',
      content: baseText,
    },
  ];
}

type MultiModalTextPart = { type: 'text'; text: string };
type MultiModalImagePart = { type: 'image'; image: string; mediaType?: string };

export function buildDesignGuideUserMessage({
  latestCustomerMessage,
  conversationHistory,
  uploads,
}: MultimodalContext): MessageListInput {
  const summarySections: string[] = [];
  if (conversationHistory?.trim()) {
    summarySections.push(`Previous conversation context:\n${conversationHistory.trim()}`);
  }
  summarySections.push(`Latest customer message:\n${latestCustomerMessage}`);

  if (uploads.length) {
    summarySections.push(
      `Customer included ${uploads.length} inspiration image${uploads.length === 1 ? '' : 's'}. Analyze them alongside the message to tailor your guidance.`
    );
  }

  const textBlock = summarySections.join('\n\n').trim();
  const contentParts: (MultiModalTextPart | MultiModalImagePart)[] = [
    {
      type: 'text',
      text: textBlock,
    },
  ];

  for (const upload of uploads) {
    contentParts.push({
      type: 'image',
      image: upload.signedUrl,
      mediaType: upload.mimeType,
    });
  }

  return [
    {
      role: 'user',
      content: contentParts,
    },
  ];
}

