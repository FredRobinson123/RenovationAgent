import { Button } from "@/components/button";

type PlanBuilderWidgetProps = {
  assetCount: number;
  onOpen: () => void;
  compact?: boolean;
};

export function PlanBuilderWidget({ assetCount, onOpen, compact }: PlanBuilderWidgetProps) {
  return (
    <div
      className="mt-4 rounded-2xl border border-dashed border-border bg-background px-4 py-3 shadow-sm flex items-center justify-between gap-3"
      data-testid="plan-builder-widget"
    >
      <div className="text-sm">
        <p className="font-medium text-foreground">Your renovation plan</p>
        {!compact && (
          <p className="text-muted-foreground text-xs">
            {assetCount === 1 ? "1 asset saved" : `${assetCount} assets saved`} · Tap to review.
          </p>
        )}
      </div>
      <Button size="sm" variant="secondary" onClick={onOpen}>
        View plan
      </Button>
    </div>
  );
}

