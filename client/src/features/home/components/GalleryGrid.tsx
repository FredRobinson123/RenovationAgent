import { featuredGallery, galleryImages, type GalleryImage } from "../data/gallery";
import { cn } from "@shared/lib/utils";

function GalleryTile({ image, variant }: { image: GalleryImage; variant?: "featured" | "standard" }) {
  const emphasisClass =
    image.emphasis === "tall"
      ? "md:row-span-2"
      : image.emphasis === "wide"
      ? "md:col-span-2"
      : undefined;

  return (
    <figure
      className={cn(
        "group overflow-hidden rounded-3xl border border-widget-border/70 bg-soft-linen shadow-inner",
        variant === "featured" ? "min-h-[260px]" : "min-h-[220px]",
        emphasisClass
      )}
    >
      <div className="relative overflow-hidden">
        <img
          src={image.src}
          alt={image.caption}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <figcaption className="p-4 text-sm text-charcoal-taupe bg-white/70">
        {image.caption}
      </figcaption>
    </figure>
  );
}

export function GalleryGrid() {
  return (
    <section className="space-y-6" data-testid="home-gallery">
      <div className="space-y-2 text-center">
        <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">Project moments</p>
        <p className="text-xl text-muted-foreground/80">
          A peek at the messy middle and the rooms that made it worthwhile.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {featuredGallery.map((image) => (
          <GalleryTile key={image.id} image={image} variant="featured" />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3 md:auto-rows-[220px]">
        {galleryImages.map((image) => (
          <GalleryTile key={image.id} image={image} />
        ))}
      </div>
    </section>
  );
}

