import { Button } from "@/components/button";
import { cn } from "@shared/lib/utils";

type PlanBuilderWidgetProps = {
  onOpen: () => void;
  hasUpdates?: boolean;
  className?: string;
};

export function PlanBuilderWidget({ onOpen, hasUpdates, className }: PlanBuilderWidgetProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border bg-background px-5 py-4 shadow-sm flex flex-col gap-3",
        className
      )}
      data-testid="plan-builder-widget"
    >
      <div className="text-sm space-y-1">
        <p className="font-medium text-foreground">Your renovation plan</p>
        <p className="text-muted-foreground text-xs">Tap to review the assets Wren saved for you.</p>
      </div>
      <Button size="sm" variant="secondary" onClick={onOpen} className="self-start">
        View plan
        {hasUpdates && <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />}
      </Button>
    </div>
  );
}

type PlanBuilderFloatingButtonProps = {
  onOpen: () => void;
  hasUpdates?: boolean;
  className?: string;
};

export function PlanBuilderFloatingButton({ onOpen, hasUpdates, className }: PlanBuilderFloatingButtonProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open your renovation plan"
      className={cn(
        "md:hidden fixed z-30 right-4 bottom-28 sm:bottom-32 inline-flex w-[15.5rem] flex-col items-start gap-3 rounded-2xl border border-border/70 bg-background/95 px-5 py-4 text-left shadow-2xl shadow-primary/10 backdrop-blur-md transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className
      )}
    >
      <div>
        <p className="text-sm font-semibold text-foreground">Your renovation plan</p>
        <p className="text-muted-foreground text-xs">Tap to review the assets Wren saved for you.</p>
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        View plan
        {hasUpdates && <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />}
      </div>
    </button>
  );
}

