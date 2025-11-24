type PlanBuilderNavButtonProps = {
  onOpen: () => void;
  hasUpdates?: boolean;
};

export function PlanBuilderNavButton({ onOpen, hasUpdates }: PlanBuilderNavButtonProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="View your renovation plan"
      className="rounded-full bg-[#E9DFD2]/95 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.25em] text-foreground/80 shadow-sm transition hover:bg-[#E3D5C4] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background flex items-center gap-3"
      data-testid="plan-builder-nav-button"
    >
      <span>View plan</span>
      {hasUpdates && <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />}
    </button>
  );
}


