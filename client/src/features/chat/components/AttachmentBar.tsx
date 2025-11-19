import { useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@shared/lib/utils";
import type { CustomerImageUpload } from "@features/chat/types";

type AttachmentBarProps = {
  attachments: CustomerImageUpload[];
  isUploading: boolean;
  disabled?: boolean;
  onUpload: (files: FileList | File[]) => Promise<void> | void;
  onRemove: (uploadId: string) => Promise<void> | void;
};

export function AttachmentBar({
  attachments,
  isUploading,
  disabled = false,
  onUpload,
  onRemove,
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
    void onUpload(event.target.files);
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
    void onUpload(event.dataTransfer.files);
  };

  const handleRemove = (uploadId: string) => {
    if (disabled) {
      return;
    }
    void onRemove(uploadId);
  };

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

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative w-28 overflow-hidden rounded-xl border border-border/60 bg-muted/40"
            >
              <img
                src={attachment.signedUrl}
                alt={attachment.fileName}
                className="h-24 w-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 text-muted-foreground transition hover:bg-background"
                onClick={() => handleRemove(attachment.id)}
                aria-label="Remove attachment"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="px-2 py-2">
                <p className="truncate text-xs font-medium text-foreground">{attachment.fileName}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

