import Masonry from "react-masonry-css";
import { featuredGallery, galleryImages, type GalleryImage } from "../data/gallery";

const allImages: GalleryImage[] = [...featuredGallery, ...galleryImages];

const breakpointColumns = {
  default: 3,
  1024: 3,
  768: 2,
  640: 1,
};

function GalleryTile({ image }: { image: GalleryImage }) {
  return (
    <div className="group overflow-hidden rounded-3xl border border-widget-border/70 bg-soft-linen shadow-inner">
      <img
        src={image.src}
        alt=""
        className="block h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
    </div>
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

      <Masonry
        breakpointCols={breakpointColumns}
        className="flex -ml-4 w-auto"
        columnClassName="space-y-4 pl-4"
      >
        {allImages.map((image) => (
          <GalleryTile key={image.id} image={image} />
        ))}
      </Masonry>
    </section>
  );
}

