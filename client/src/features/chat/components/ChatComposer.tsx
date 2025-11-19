import { ChatInput } from "@features/chat/components/ChatInput";
import type { CustomerImageUpload } from "@features/chat/types";

type ChatComposerProps = {
  onSendMessage: (content: string) => Promise<void>;
  disabled?: boolean;
  attachments: CustomerImageUpload[];
  isUploading: boolean;
  onUploadAttachments: (files: FileList | File[]) => Promise<void>;
  onRemoveAttachment: (uploadId: string) => Promise<void>;
};

export function ChatComposer({
  onSendMessage,
  disabled,
  attachments,
  isUploading,
  onUploadAttachments,
  onRemoveAttachment,
}: ChatComposerProps) {
  return (
    <ChatInput
      onSendMessage={onSendMessage}
      disabled={disabled}
      attachments={attachments}
      isUploadingAttachments={isUploading}
      onUploadAttachments={onUploadAttachments}
      onRemoveAttachment={onRemoveAttachment}
    />
  );
}

