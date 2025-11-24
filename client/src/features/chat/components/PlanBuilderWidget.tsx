type PlanBuilderWidgetProps = {
  onOpen: () => void;
  hasUpdates?: boolean;
};

export function PlanBuilderWidget({ onOpen, hasUpdates }: PlanBuilderWidgetProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed z-30 right-4 bottom-28 sm:bottom-32 md:right-8 md:bottom-auto md:top-1/2 inline-flex w-[15.5rem] md:w-auto flex-col md:flex-row items-start md:items-center gap-3 rounded-2xl border border-border/70 bg-background/95 px-5 py-4 text-left shadow-2xl shadow-primary/10 backdrop-blur-md transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 translate-y-0 md:-translate-y-1/2"
      aria-label="Open your renovation plan"
      data-testid="plan-builder-widget"
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

