import { ChatInput } from "@features/chat/components/ChatInput";
import type { CustomerImageUpload, PendingAttachment } from "@features/chat/types";

type ChatComposerProps = {
  onSendMessage: (content: string) => Promise<void>;
  disabled?: boolean;
  uploadedAttachments: CustomerImageUpload[];
  pendingAttachments: PendingAttachment[];
  isUploading: boolean;
  onAddAttachments: (files: FileList | File[]) => Promise<void> | void;
  onRemovePendingAttachment: (pendingId: string) => Promise<void> | void;
  onRemoveUploadedAttachment: (uploadId: string) => Promise<void> | void;
};

export function ChatComposer({
  onSendMessage,
  disabled,
  uploadedAttachments,
  pendingAttachments,
  isUploading,
  onAddAttachments,
  onRemovePendingAttachment,
  onRemoveUploadedAttachment,
}: ChatComposerProps) {
  return (
    <ChatInput
      onSendMessage={onSendMessage}
      disabled={disabled}
      uploadedAttachments={uploadedAttachments}
      pendingAttachments={pendingAttachments}
      isUploadingAttachments={isUploading}
      onAddAttachments={onAddAttachments}
      onRemovePendingAttachment={onRemovePendingAttachment}
      onRemoveUploadedAttachment={onRemoveUploadedAttachment}
    />
  );
}

