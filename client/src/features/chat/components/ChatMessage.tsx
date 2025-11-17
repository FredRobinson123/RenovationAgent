import { cn } from "@shared/lib/utils";
import { Badge } from "@/components/badge";
import { Palette, PoundSterling, Sparkles } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/features/chat/types";
import { SpreadsheetViewer } from "@/features/chat/widgets/SpreadsheetViewer";
import { ImageGallery } from "@/features/chat/widgets/ImageGallery";
import { designSystem } from "@/theme/designSystem";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  message: ChatMessageType;
}

const agentConfig = {
  orchestrator: {
    label: "Conversation Guide",
    icon: Sparkles,
    color: "bg-widget text-widget-foreground",
  },
  "design-agent": {
    label: "Design Expert",
    icon: Palette,
    color: "bg-clay text-charcoal-taupe",
  },
  "budget-agent": {
    label: "Budget Planner",
    icon: PoundSterling,
    color: "bg-bubble-user text-bubble-user-foreground",
  },
  assistant: {
    label: "Ren",
    icon: Sparkles,
    color: "bg-bubble-agent text-bubble-agent-foreground",
  },
} as const;

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const agentInfo = agentConfig[message.source ?? "assistant"];
  const AgentIcon = agentInfo.icon;

  return (
    <div
      className={cn(
        "animate-fade-up",
        isUser ? "flex justify-end" : "flex justify-start"
      )}
      data-testid={`message-${message.role}`}
    >
      <div
        className={cn(
          "max-w-[85%] transition-colors",
          isUser
            ? "shadow-sm bg-bubble-user text-bubble-user-foreground border border-bubble-user-border"
            : "bg-bubble-agent text-bubble-agent-foreground border border-bubble-agent-border"
        )}
        style={{
          borderRadius: designSystem.radii.bubble,
          padding: designSystem.spacing.bubblePadding,
        }}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <Badge
              className={cn("text-xs font-playful gap-1", agentInfo.color)}
              data-testid={`badge-agent-${message.source ?? "assistant"}`}
            >
              <AgentIcon className="h-3 w-3" />
              {agentInfo.label}
            </Badge>
          </div>
        )}

        <div
          className="text-base leading-relaxed whitespace-pre-wrap"
          data-testid="text-message-content"
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {message.imageGallery && !isUser && (
          <div className="mt-4">
            <ImageGallery gallery={message.imageGallery} />
          </div>
        )}

        {message.budgetSpreadsheet && !isUser && (
          <div className="mt-4">
            <SpreadsheetViewer spreadsheet={message.budgetSpreadsheet} />
          </div>
        )}
      </div>
    </div>
  );
}
