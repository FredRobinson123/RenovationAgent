import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import type { ChatMessage, CustomerImageUpload } from "@features/chat/types";
import { INITIAL_ASSISTANT_MESSAGE } from "@features/chat/constants";
import { buildConversationHistory, createMessageId } from "@features/chat/utils/messages";
import {
  buildFriendlyErrorMessage,
  runRenovationWorkflow,
  type WorkflowUserContext,
} from "@features/chat/services/workflowClient";
import { uploadImages, deleteUpload } from "@features/chat/services/uploadClient";
import { useToast } from "@shared/hooks/use-toast";

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export type UseChatSessionResult = {
  messages: ChatMessage[];
  isSending: boolean;
  sendMessage: (content: string) => Promise<void>;
  messagesEndRef: RefObject<HTMLDivElement>;
  attachments: CustomerImageUpload[];
  isUploadingAttachments: boolean;
  uploadAttachments: (files: FileList | File[]) => Promise<void>;
  removeAttachment: (uploadId: string) => Promise<void>;
};

export function useChatSession(): UseChatSessionResult {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<CustomerImageUpload[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [sessionId] = useState(() => createMessageId());
  const { getToken } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const uploadAttachments = useCallback(
    async (fileInput: FileList | File[]) => {
      if (isUploadingAttachments) {
        return;
      }

      const files = normalizeFiles(fileInput);
      if (!files.length) {
        return;
      }

      const filteredBySize = files.filter((file) => file.size <= MAX_FILE_SIZE_BYTES);
      const oversizedCount = files.length - filteredBySize.length;
      if (oversizedCount > 0) {
        toast({
          title: "Some files are too large",
          description: `Each image must be ${Math.floor(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB or smaller.`,
          variant: "destructive",
        });
      }

      if (!filteredBySize.length) {
        return;
      }

      const availableSlots = MAX_ATTACHMENTS - attachments.length;
      if (availableSlots <= 0) {
        toast({
          title: "Attachment limit reached",
          description: `You can add up to ${MAX_ATTACHMENTS} images per message.`,
        });
        return;
      }

      const filesToUpload = filteredBySize.slice(0, availableSlots);
      if (filteredBySize.length > availableSlots) {
        toast({
          title: "Only the first few images were added",
          description: `You can only attach ${MAX_ATTACHMENTS} images at a time.`,
        });
      }

      setIsUploadingAttachments(true);
      try {
        const token = await getToken().catch((error) => {
          console.error("Failed to fetch Clerk token for uploads", error);
          return null;
        });

        if (!token) {
          throw new Error("Unable to authenticate uploads. Please sign in again.");
        }

        const uploaded = await uploadImages(filesToUpload, { sessionId, token });
        setAttachments((prev) => [...prev, ...uploaded]);
      } catch (error) {
        console.error(error);
        toast({
          title: "Upload failed",
          description: buildFriendlyErrorMessage(error),
          variant: "destructive",
        });
      } finally {
        setIsUploadingAttachments(false);
      }
    },
    [attachments.length, getToken, isUploadingAttachments, sessionId, toast]
  );

  const removeAttachment = useCallback(
    async (uploadId: string) => {
      const removedAttachment = attachments.find((attachment) => attachment.id === uploadId);
      setAttachments((prev) => prev.filter((attachment) => attachment.id !== uploadId));

      try {
        const token = await getToken().catch((error) => {
          console.error("Failed to fetch Clerk token for deleting uploads", error);
          return null;
        });

        if (!token) {
          return;
        }

        await deleteUpload(uploadId, { token });
      } catch (error) {
        console.error(error);
        if (removedAttachment) {
          setAttachments((prev) => [...prev, removedAttachment]);
        }
        toast({
          title: "Could not remove image",
          description: buildFriendlyErrorMessage(error),
          variant: "destructive",
        });
      }
    },
    [attachments, getToken, toast]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isSending || isUploadingAttachments) {
        return;
      }

      const attachmentSnapshot = attachments;
      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
        attachments: attachmentSnapshot,
      };

      const conversationHistory = buildConversationHistory([...messages, userMessage]);
      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);

      try {
        const token = await getToken().catch((error) => {
          console.error("Failed to fetch Clerk token", error);
          return null;
        });

        if (!token) {
          throw new Error("Unable to authenticate your request. Please try signing in again.");
        }

        const userMetadata: WorkflowUserContext | undefined = user
          ? {
              id: user.id,
              email: user.primaryEmailAddress?.emailAddress ?? undefined,
            }
          : undefined;

        const uploadedImageIds = attachmentSnapshot.map((attachment) => attachment.id);

        const { finalResponse, budgetSpreadsheet, imageGallery, selectedAgent } = await runRenovationWorkflow(
          trimmed,
          conversationHistory,
          {
            token,
            userContext: userMetadata,
            sessionId,
            uploadedImageIds,
          }
        );

        const assistantMessage: ChatMessage = {
          id: createMessageId(),
          role: "assistant",
          content: finalResponse,
          createdAt: new Date().toISOString(),
          source: selectedAgent ?? "assistant",
          budgetSpreadsheet,
          imageGallery,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setAttachments([]);
      } catch (error) {
        console.error(error);
        const friendlyMessage = buildFriendlyErrorMessage(error);
        const assistantErrorContent = friendlyMessage.startsWith("I ")
          ? friendlyMessage
          : `I ran into a problem with that request. ${friendlyMessage}`;
        toast({
          title: "Ren hit a snag",
          description: friendlyMessage,
          variant: "destructive",
        });
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId(),
            role: "assistant",
            content: assistantErrorContent,
            createdAt: new Date().toISOString(),
            source: "assistant",
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [attachments, getToken, isSending, isUploadingAttachments, messages, sessionId, toast, user]
  );

  return {
    messages,
    isSending,
    sendMessage,
    messagesEndRef,
    attachments,
    isUploadingAttachments,
    uploadAttachments,
    removeAttachment,
  };
}

function normalizeFiles(fileList: FileList | File[]): File[] {
  if (Array.isArray(fileList)) {
    return fileList;
  }
  return Array.from(fileList);
}
