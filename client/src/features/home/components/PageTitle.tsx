import { cn } from "@shared/lib/utils";

type PageTitleProps = {
  title: string;
  tagline?: string;
  description?: string;
  className?: string;
};

export function PageTitle({ title, tagline, description, className }: PageTitleProps) {
  return (
    <div className={cn("text-center space-y-4", className)}>
      {tagline && (
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground font-semibold">
          {tagline}
        </p>
      )}
      <h1 className="text-[3.375rem] font-semibold text-foreground font-ren tracking-[0.15em]">
        {title}
      </h1>
      {description && <p className="text-lg max-w-3xl mx-auto text-muted-foreground">{description}</p>}
    </div>
  );
}

