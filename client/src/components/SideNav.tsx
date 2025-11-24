import { type ComponentType } from "react";
import { Link } from "wouter";
import { cn } from "@/shared/lib/utils";

type SideNavAction = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
};

type SideNavProps = {
  label: string;
  href: string;
  secondaryAction?: SideNavAction;
  className?: string;
};

export function SideNav({ label, href, secondaryAction, className }: SideNavProps) {
  return (
    <aside
      className={cn(
        "min-h-screen w-16 sm:w-20 lg:w-24 border-r border-border bg-[#E9DFD2] text-foreground/80 flex flex-col items-center py-8 px-2",
        className
      )}
    >
      <div className="flex-1 flex flex-col items-center gap-8">
        <Link
          href={href}
          className="font-ren uppercase tracking-[0.4em] text-[0.65rem] text-foreground/70 hover:text-foreground transition-colors"
        >
          {label}
        </Link>
      </div>

      {secondaryAction ? (
        <button
          type="button"
          aria-label={secondaryAction.label}
          onClick={secondaryAction.onClick}
          className="mt-auto rounded-full p-2 text-foreground/70 transition hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#E9DFD2]"
        >
          <secondaryAction.icon className="h-5 w-5" />
        </button>
      ) : null}
    </aside>
  );
}


