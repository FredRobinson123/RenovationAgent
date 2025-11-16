import { cn } from "@/lib/utils";
import { Badge } from "@/components/badge";
import { Palette, PoundSterling, Sparkles } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/features/chat/types";
import { SpreadsheetViewer } from "@/features/chat/widgets/SpreadsheetViewer";
import { ImageGallery } from "@/features/chat/widgets/ImageGallery";

interface ChatMessageProps {
  message: ChatMessageType;
}

const agentConfig = {
  orchestrator: {
    label: "Conversation Guide",
    icon: Sparkles,
    color: "bg-primary text-primary-foreground",
  },
  "design-agent": {
    label: "Design Expert",
    icon: Palette,
    color: "bg-chart-3 text-white",
  },
  "budget-agent": {
    label: "Budget Planner",
    icon: PoundSterling,
    color: "bg-chart-4 text-white",
  },
  assistant: {
    label: "Ren",
    icon: Sparkles,
    color: "bg-muted text-muted-foreground",
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
          "max-w-[85%] rounded-2xl p-4 shadow-sm",
          isUser
            ? "bg-primary/10 dark:bg-primary/20 border border-primary/20"
            : "bg-card border border-card-border"
        )}
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
          className={cn(
            "text-base leading-relaxed whitespace-pre-wrap",
            isUser ? "text-foreground" : "text-card-foreground"
          )}
          data-testid="text-message-content"
        >
          {message.content}
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
