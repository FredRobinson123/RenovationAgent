import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import type { ChatMessage } from "@features/chat/types";
import { INITIAL_ASSISTANT_MESSAGE } from "@features/chat/constants";
import { buildConversationHistory, createMessageId } from "@features/chat/utils/messages";
import {
  buildFriendlyErrorMessage,
  runRenovationWorkflow,
  type WorkflowUserContext,
} from "@features/chat/services/workflowClient";
import { useToast } from "@shared/hooks/use-toast";

export type UseChatSessionResult = {
  messages: ChatMessage[];
  isSending: boolean;
  sendMessage: (content: string) => Promise<void>;
  messagesEndRef: RefObject<HTMLDivElement>;
};

export function useChatSession(): UseChatSessionResult {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [isSending, setIsSending] = useState(false);
  const { getToken } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isSending) {
        return;
      }

      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
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

        const { finalResponse, budgetSpreadsheet, imageGallery } = await runRenovationWorkflow(
          trimmed,
          conversationHistory,
          {
            token,
            userContext: userMetadata,
          }
        );

        const assistantMessage: ChatMessage = {
          id: createMessageId(),
          role: "assistant",
          content: finalResponse,
          createdAt: new Date().toISOString(),
          source: "assistant",
          budgetSpreadsheet,
          imageGallery,
        };
        setMessages((prev) => [...prev, assistantMessage]);
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
    [getToken, isSending, messages, toast, user]
  );

  return {
    messages,
    isSending,
    sendMessage,
    messagesEndRef,
  };
}

