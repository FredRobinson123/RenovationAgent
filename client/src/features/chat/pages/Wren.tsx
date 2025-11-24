import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react";
import { ChatInput } from "@features/chat/components/ChatInput";
import { ChatHeader } from "@features/chat/components/ChatHeader";
import { MessageList } from "@features/chat/components/MessageList";
import { useChatSession } from "@features/chat/hooks/useChatSession";
import { PlanBuilderPanel } from "@features/chat/components/PlanBuilderPanel";

function WrenChatShell() {
  const {
    messages,
    isSending,
    sendMessage,
    messagesEndRef,
    uploadedAttachments,
    pendingAttachments,
    isUploadingAttachments,
    addPendingAttachments,
    removePendingAttachment,
    removeUploadedAttachment,
    planAssets,
  } = useChatSession();

  return (
    <>
      <div className="flex flex-col h-screen">
        <ChatHeader />
        <PlanBuilderPanel planAssets={planAssets} />
        <MessageList messages={messages} isSending={isSending} messagesEndRef={messagesEndRef} />
      </div>
      <ChatInput
        onSendMessage={sendMessage}
        disabled={isSending}
        uploadedAttachments={uploadedAttachments}
        pendingAttachments={pendingAttachments}
        isUploadingAttachments={isUploadingAttachments}
        onAddAttachments={addPendingAttachments}
        onRemovePendingAttachment={removePendingAttachment}
        onRemoveUploadedAttachment={removeUploadedAttachment}
      />
    </>
  );
}

export default function WrenPage() {
  return (
    <div className="min-h-screen bg-background">
      <SignedIn>
        <WrenChatShell />
      </SignedIn>

      <SignedOut>
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-[3.375rem] font-semibold text-foreground font-ren tracking-[0.15em]">
              Hey, I'm Wren 👋
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Sign in to continue your renovation planning with Wren.
            </p>
          </div>
          <SignIn
            appearance={{ elements: { formButtonPrimary: "bg-primary" } }}
            afterSignInUrl="/wren"
            afterSignUpUrl="/wren"
          />
        </div>
      </SignedOut>
    </div>
  );
}
