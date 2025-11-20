import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/button";
import { Textarea } from "@/components/textarea";
import { ArrowUp, X } from "lucide-react";
import { cn } from "@shared/lib/utils";
import type { CustomerImageUpload, PendingAttachment } from "@features/chat/types";

interface ChatInputProps {
  onSendMessage: (content: string) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
  uploadedAttachments: CustomerImageUpload[];
  pendingAttachments: PendingAttachment[];
  onAddAttachments: (files: FileList | File[]) => Promise<void> | void;
  onRemovePendingAttachment: (pendingId: string) => Promise<void> | void;
  onRemoveUploadedAttachment: (uploadId: string) => Promise<void> | void;
  isUploadingAttachments?: boolean;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "Tell me about your renovation project",
  uploadedAttachments,
  pendingAttachments,
  onAddAttachments,
  onRemovePendingAttachment,
  onRemoveUploadedAttachment,
  isUploadingAttachments = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || disabled || sending || isUploadingAttachments) {
      return;
    }

    setSending(true);
    try {
      await onSendMessage(trimmed);
      setMessage("");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleBrowseClick = () => {
    if (disabled || sending || isUploadingAttachments) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) {
      return;
    }
    void onAddAttachments(event.target.files);
    event.target.value = "";
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled || sending || isUploadingAttachments) {
      return;
    }
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled || sending || isUploadingAttachments || !event.dataTransfer.files?.length) {
      return;
    }
    void onAddAttachments(event.dataTransfer.files);
  };

  const hasAttachments = pendingAttachments.length > 0 || uploadedAttachments.length > 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-background/80 border-t border-border">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div
          className={cn(
            "bg-card border border-card-border rounded-3xl shadow-2xl px-4 py-3 sm:px-5 sm:py-4",
            "flex flex-col gap-3 sm:gap-4",
            isDragging && "border-primary bg-primary/5"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || sending || isUploadingAttachments}
          />

          {hasAttachments && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {pendingAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/40"
                >
                  <img
                    src={attachment.previewUrl}
                    alt={attachment.fileName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 text-muted-foreground transition hover:bg-background"
                    onClick={() => onRemovePendingAttachment(attachment.id)}
                    aria-label="Remove attachment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {uploadedAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/40"
                >
                  <img
                    src={attachment.signedUrl}
                    alt={attachment.fileName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 text-muted-foreground transition hover:bg-background"
                    onClick={() => onRemoveUploadedAttachment(attachment.id)}
                    aria-label="Remove attachment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "resize-none border-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent min-h-[40px] max-h-[200px]",
              "placeholder:text-muted-foreground flex-1 px-0"
            )}
            rows={1}
            data-testid="input-chat-message"
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="rounded-full px-3 text-sm font-medium"
                onClick={handleBrowseClick}
                disabled={disabled || sending || isUploadingAttachments}
              >
                <span className="mr-1">📎</span>
                Attach
              </Button>
              {isUploadingAttachments && (
                <span className="text-xs text-muted-foreground">Uploading images…</span>
              )}
            </div>

            <Button
              size="icon"
              className="shrink-0 h-9 w-9 rounded-full"
              onClick={handleSend}
              disabled={disabled || sending || isUploadingAttachments || !message.trim()}
              data-testid="button-send-message"
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
