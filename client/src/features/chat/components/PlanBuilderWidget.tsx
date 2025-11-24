import { Button } from "@/components/button";

type PlanBuilderWidgetProps = {
  onOpen: () => void;
  compact?: boolean;
};

export function PlanBuilderWidget({ onOpen, compact }: PlanBuilderWidgetProps) {
  return (
    <div
      className="rounded-2xl border border-dashed border-border bg-background px-4 py-3 shadow-sm flex items-center justify-between gap-3"
      data-testid="plan-builder-widget"
    >
      <div className="text-sm">
        <p className="font-medium text-foreground">Your renovation plan</p>
        {!compact && <p className="text-muted-foreground text-xs">Tap to review the assets Wren saved for you.</p>}
      </div>
      <Button size="sm" variant="secondary" onClick={onOpen}>
        View plan
      </Button>
    </div>
  );
}

