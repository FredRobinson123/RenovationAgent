export type GalleryImage = {
  id: string;
  src: string;
  caption: string;
  emphasis?: "wide" | "tall";
};

export const featuredGallery: GalleryImage[] = [
  {
    id: "renovation_1",
    src: "/home-gallery/renovation_1.jpeg",
    caption: "The early days of our living room renovation.",
  },
  {
    id: "renovation_2",
    src: "/home-gallery/renovation_2.jpeg",
    caption: "Rebuilding an unstable wall.",
  },
  {
    id: "renovation_3",
    src: "/home-gallery/renovation_3.jpeg",
    caption: "Stripping out the old bathroom.",
  },
];

export const galleryImages: GalleryImage[] = [
  {
    id: "bathroom_finished_1",
    src: "/home-gallery/bathroom_finished_1.jpeg",
    caption: "Our new shower and arch.",
  },
  {
    id: "bathroom_finished_2",
    src: "/home-gallery/bathroom_finished_2.jpeg",
    caption: "Bathroom vanity and wall lights.",
  },
  {
    id: "living_room_finished_1",
    src: "/home-gallery/living_room_finished_1.jpeg",
    caption: "Pocket doors for our new living room.",
  },
];

