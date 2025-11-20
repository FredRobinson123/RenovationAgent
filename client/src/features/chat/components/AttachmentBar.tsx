import { useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@shared/lib/utils";
import type { CustomerImageUpload, PendingAttachment } from "@features/chat/types";

type AttachmentBarProps = {
  pendingAttachments: PendingAttachment[];
  uploadedAttachments: CustomerImageUpload[];
  isUploading: boolean;
  disabled?: boolean;
  onAddFiles: (files: FileList | File[]) => Promise<void> | void;
  onRemovePending: (pendingId: string) => Promise<void> | void;
  onRemoveUploaded: (uploadId: string) => Promise<void> | void;
};

export function AttachmentBar({
  pendingAttachments,
  uploadedAttachments,
  isUploading,
  disabled = false,
  onAddFiles,
  onRemovePending,
  onRemoveUploaded,
}: AttachmentBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleBrowseClick = () => {
    if (disabled) {
      return;
    }
    inputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) {
      return;
    }
    void onAddFiles(event.target.files);
    event.target.value = "";
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) {
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
    if (disabled || !event.dataTransfer.files?.length) {
      return;
    }
    void onAddFiles(event.dataTransfer.files);
  };

  const handleRemovePending = (pendingId: string) => {
    if (disabled) {
      return;
    }
    void onRemovePending(pendingId);
  };

  const handleRemoveUploaded = (uploadId: string) => {
    if (disabled) {
      return;
    }
    void onRemoveUploaded(uploadId);
  };

  const hasAttachments = pendingAttachments.length > 0 || uploadedAttachments.length > 0;

  return (
    <div className="mt-4 space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <div
        className={cn(
          "rounded-2xl border-2 border-dashed px-4 py-3 text-sm transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border/60 bg-muted/20",
          disabled && "opacity-60"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">Attach inspiration images</p>
            <p className="text-xs text-muted-foreground">
              Drag & drop or{" "}
              <button
                type="button"
                onClick={handleBrowseClick}
                className="underline underline-offset-4"
                disabled={disabled}
              >
                browse files
              </button>
            </p>
          </div>
          {isUploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
        </div>
      </div>

      {hasAttachments && (
        <div className="flex flex-wrap gap-3">
          {pendingAttachments.map((attachment) => (
            <AttachmentPreviewCard
              key={attachment.id}
              fileName={attachment.fileName}
              imageUrl={attachment.previewUrl}
              statusLabel="Pending upload"
              onRemove={() => handleRemovePending(attachment.id)}
            />
          ))}
          {uploadedAttachments.map((attachment) => (
            <AttachmentPreviewCard
              key={attachment.id}
              fileName={attachment.fileName}
              imageUrl={attachment.signedUrl}
              statusLabel="Ready"
              onRemove={() => handleRemoveUploaded(attachment.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type AttachmentPreviewCardProps = {
  fileName: string;
  imageUrl: string;
  statusLabel: string;
  onRemove: () => void;
};

function AttachmentPreviewCard({ fileName, imageUrl, statusLabel, onRemove }: AttachmentPreviewCardProps) {
  return (
    <div className="relative w-28 overflow-hidden rounded-xl border border-border/60 bg-muted/40">
      <img src={imageUrl} alt={fileName} className="h-24 w-full object-cover" loading="lazy" />
      <button
        type="button"
        className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 text-muted-foreground transition hover:bg-background"
        onClick={onRemove}
        aria-label="Remove attachment"
      >
        <X className="h-3 w-3" />
      </button>
      <div className="px-2 py-2 space-y-1">
        <p className="truncate text-xs font-medium text-foreground">{fileName}</p>
        <p className="text-[10px] text-muted-foreground">{statusLabel}</p>
      </div>
    </div>
  );
}

