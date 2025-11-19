import type { DesignImageGallery } from "@/features/chat/types";
import { cn } from "@shared/lib/utils";
import { designSystem } from "@/theme/designSystem";

interface ImageGalleryProps {
  gallery: DesignImageGallery;
  className?: string;
}

export function ImageGallery({ gallery, className }: ImageGalleryProps) {
  const images = (gallery.images ?? []).filter((image) => Boolean(image.imageUrl));

  if (images.length === 0) return null;

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-widget-border bg-widget/10 shadow-inner",
        className
      )}
      style={{ padding: designSystem.spacing.widgetPadding }}
      data-testid="image-gallery"
    >
      <div>
        <p className="text-sm font-semibold text-bubble-agent-foreground">Design inspiration</p>
        <p className="text-xs text-bubble-agent-foreground/70">
          Search: <span className="font-medium">{gallery.query}</span>
        </p>
        {gallery.summary && (
          <p className="text-sm text-bubble-agent-foreground/80 mt-1">{gallery.summary}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image) => (
          <a
            key={image.id}
            href={image.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="group relative block overflow-hidden rounded-xl border border-widget-border/70 bg-soft-linen"
            data-testid={`image-item-${image.id}`}
          >
            <img
              src={image.imageUrl}
              alt={image.title || "Design inspiration image"}
              className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-sm font-medium text-white truncate">
                {image.title || "Inspiration"}
              </p>
              {image.description && (
                <p className="text-xs text-white/80 mt-1 truncate">{image.description}</p>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
