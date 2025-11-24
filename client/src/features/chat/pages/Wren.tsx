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
import { Button } from "@/components/button";

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
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [hasPendingPlanUpdate, setHasPendingPlanUpdate] = useState(false);
  const planAssetIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!hasPlanAssets) {
      setIsPlanOpen(false);
      setHasAutoOpened(false);
      setHasPendingPlanUpdate(false);
      planAssetIdsRef.current = new Set();
    }
  }, [hasPlanAssets]);

  useEffect(() => {
    if (hasPlanAssets && !hasAutoOpened) {
      setHasAutoOpened(true);
    }
  }, [hasPlanAssets, hasAutoOpened]);

  const showDesktopPanel = hasPlanAssets && !isMobile && isPlanOpen;
  const shouldSurfacePlanWidget = hasPendingPlanUpdate && !isPlanOpen;

  useEffect(() => {
    const previousIds = planAssetIdsRef.current;
    const nextIds = new Set(planAssets.map((asset) => asset.id));
    const gainedNewAssets = planAssets.some((asset) => !previousIds.has(asset.id));

    if (!planAssets.length) {
      setHasPendingPlanUpdate(false);
    } else if (gainedNewAssets && !isPlanOpen) {
      setHasPendingPlanUpdate(true);
    }

    planAssetIdsRef.current = nextIds;
  }, [planAssets, isPlanOpen]);

  const handleOpenPlan = () => {
    setIsPlanOpen(true);
    setHasPendingPlanUpdate(false);
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
                shouldSurfacePlanWidget ? (
                  <PlanBuilderWidget compact={false} onOpen={handleOpenPlan} />
                ) : undefined
              }
            />
          </div>
        </div>

        {showDesktopPanel && (
          <div className="hidden md:flex md:w-1/2 border-l border-border bg-muted/10">
            <PlanBuilderPanel planAssets={planAssets} onClose={() => setIsPlanOpen(false)} />
          </div>
        )}
      </div>
      {hasPlanAssets && (
        <Button
          type="button"
          variant="secondary"
          className="fixed right-4 bottom-[7.5rem] z-50 rounded-full shadow-lg sm:right-8"
          onClick={handleOpenPlan}
        >
          View plan
          {hasPendingPlanUpdate && <span className="ml-2 h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />}
        </Button>
      )}
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
          <PlanBuilderPanel planAssets={planAssets} onClose={() => setIsPlanOpen(false)} />
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
