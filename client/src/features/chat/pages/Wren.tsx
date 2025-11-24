import { useEffect, useRef, useState } from "react";
import { SignedIn, SignedOut, SignIn } from "@clerk/clerk-react";
import { SquarePen } from "lucide-react";
import { ChatInput } from "@features/chat/components/ChatInput";
import { ChatHeader } from "@features/chat/components/ChatHeader";
import { MessageList } from "@features/chat/components/MessageList";
import { useChatSession } from "@features/chat/hooks/useChatSession";
import { PlanBuilderPanel } from "@features/chat/components/PlanBuilderPanel";
import { PlanBuilderWidget } from "@features/chat/components/PlanBuilderWidget";
import { useIsMobile } from "@shared/hooks/use-mobile";
import { FloatingNavButtons } from "@/components/FloatingNavButtons";
import { resetChatSession } from "@features/chat/utils/session";

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
  const isMobile = useIsMobile();
  const hasPlanAssets = planAssets.length > 0;
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [hasPendingPlanUpdate, setHasPendingPlanUpdate] = useState(false);
  const planAssetIdsRef = useRef<Set<string>>(new Set());
  const planPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasPlanAssets) {
      setIsPlanOpen(false);
      setHasPendingPlanUpdate(false);
      planAssetIdsRef.current = new Set();
    }
  }, [hasPlanAssets]);

  const showDesktopPanel = hasPlanAssets && !isMobile && isPlanOpen;

  useEffect(() => {
    const previousIds = planAssetIdsRef.current;
    const nextIds = new Set(planAssets.map((asset) => asset.id));
    const gainedNewAssets = planAssets.some((asset) => !previousIds.has(asset.id));

    if (gainedNewAssets && planAssets.length) {
      setHasPendingPlanUpdate(true);
    }

    planAssetIdsRef.current = nextIds;
  }, [planAssets]);

  useEffect(() => {
    if (isPlanOpen) {
      planPanelRef.current?.scrollTo({ top: 0 });
      setHasPendingPlanUpdate(false);
    }
  }, [isPlanOpen]);

  const handleOpenPlan = () => {
    setIsPlanOpen(true);
  };

  const handleClosePlan = () => {
    setIsPlanOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ChatHeader />
      <div className="flex flex-1 overflow-hidden">
        <div className={`flex flex-col h-full ${showDesktopPanel ? "md:w-1/2" : "w-full"}`}>
          <div className="flex-1 overflow-hidden">
            <MessageList
              messages={messages}
              isSending={isSending}
              messagesEndRef={messagesEndRef}
              footerSlot={
                hasPlanAssets ? (
                  <PlanBuilderWidget onOpen={handleOpenPlan} hasUpdates={hasPendingPlanUpdate && !isPlanOpen} />
                ) : undefined
              }
            />
          </div>
        </div>

        {showDesktopPanel && (
          <div className="hidden md:flex md:w-1/2 border-l border-border bg-muted/10 h-full overflow-hidden">
            <PlanBuilderPanel planAssets={planAssets} onClose={handleClosePlan} ref={planPanelRef} />
          </div>
        )}
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

      {isMobile && hasPlanAssets && isPlanOpen && (
        <div className="fixed inset-0 z-50 bg-background">
          <PlanBuilderPanel planAssets={planAssets} onClose={handleClosePlan} ref={planPanelRef} />
        </div>
      )}
    </div>
  );
}

export default function WrenPage() {
  const handleStartNewChat = () => {
    resetChatSession();
    if (typeof window !== "undefined") {
      window.location.replace("/wren");
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <FloatingNavButtons
        primaryLabel="Home"
        primaryHref="/"
        actions={[
          {
            icon: SquarePen,
            label: "Start a new chat with Wren",
            onClick: handleStartNewChat,
          },
        ]}
      />

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
