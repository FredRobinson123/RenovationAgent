import { type ComponentType } from "react";
import { Link } from "wouter";
import { cn } from "@/shared/lib/utils";

type FloatingNavAction = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
};

type FloatingNavButtonsProps = {
  primaryLabel: string;
  primaryHref: string;
  actions?: FloatingNavAction[];
  className?: string;
};

export function FloatingNavButtons({ primaryLabel, primaryHref, actions, className }: FloatingNavButtonsProps) {
  return (
    <div className={cn("fixed top-6 left-4 z-50 flex flex-col items-start gap-3", className)}>
      <Link
        href={primaryHref}
        className="rounded-full bg-[#E9DFD2]/95 px-4 py-2 font-ren text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-foreground/80 shadow-sm transition hover:bg-[#E3D5C4] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {primaryLabel}
      </Link>

      {actions?.map((action) => (
        <button
          key={action.label}
          type="button"
          aria-label={action.label}
          onClick={action.onClick}
          className="rounded-full bg-[#E9DFD2]/95 p-2 text-foreground/80 shadow-sm transition hover:bg-[#E3D5C4] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <action.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}


