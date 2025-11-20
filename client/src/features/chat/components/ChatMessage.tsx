import { cn } from "@shared/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/features/chat/types";
import { BudgetSpreadsheetViewer } from "@/features/chat/widgets/BudgetSpreadsheetViewer";
import { ImageGallery } from "@/features/chat/widgets/ImageGallery";
import { ContractorSpreadsheetViewer } from "@/features/chat/widgets/ContractorSpreadsheetViewer";
import { MaterialsSpreadsheetViewer } from "@/features/chat/widgets/MaterialsSpreadsheetViewer";
import { GanttChartViewer } from "@/features/chat/widgets/GanttChartViewer";
import { designSystem } from "@/theme/designSystem";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

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
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="h-20 w-20 overflow-hidden rounded-lg border border-border/60 bg-muted/40"
              >
                <img
                  src={attachment.signedUrl}
                  alt={attachment.fileName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
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
            <BudgetSpreadsheetViewer spreadsheet={message.budgetSpreadsheet} />
          </div>
        )}

        {message.contractorSpreadsheet && !isUser && (
          <div className="mt-4">
            <ContractorSpreadsheetViewer spreadsheet={message.contractorSpreadsheet} />
          </div>
        )}

        {message.materialsSpreadsheet && !isUser && (
          <div className="mt-4">
            <MaterialsSpreadsheetViewer spreadsheet={message.materialsSpreadsheet} />
          </div>
        )}

        {message.ganttChart && !isUser && (
          <div className="mt-4">
            <GanttChartViewer chart={message.ganttChart} />
          </div>
        )}
      </div>
    </div>
  );
}
