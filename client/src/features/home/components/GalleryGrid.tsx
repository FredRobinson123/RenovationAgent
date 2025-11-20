import { featuredGallery, galleryImages, type GalleryImage } from "../data/gallery";

function GalleryTile({ image }: { image: GalleryImage }) {
  return (
    <div className="group overflow-hidden">
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
  const heroImage = featuredGallery[0];
  const renovationRow = featuredGallery.slice(1);
  const finishedRow = galleryImages;

  return (
    <section className="w-full" data-testid="home-gallery">
      <div className="mt-8 space-y-[4px]">
        {heroImage && (
          <div>
            <GalleryTile image={heroImage} />
          </div>
        )}

        {renovationRow.length > 0 && (
          <div className="grid gap-[4px] md:grid-cols-2">
            {renovationRow.map((image) => (
              <GalleryTile key={image.id} image={image} />
            ))}
          </div>
        )}

        {finishedRow.length > 0 && (
          <div className="grid gap-[4px] md:grid-cols-3">
            {finishedRow.map((image) => (
              <GalleryTile key={image.id} image={image} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

