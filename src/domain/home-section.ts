/** Building blocks for the home page; admins add, configure, reorder and hide them. */
export const HOME_SECTION_TYPES = [
  "hero",
  "categories",
  "featured_products",
  "new_arrivals",
  "on_sale",
  "category_products",
  "banner",
  "text",
  "editorial",
  "services",
  "quote",
  "contact",
] as const;
export type HomeSectionType = (typeof HOME_SECTION_TYPES)[number];

export interface HomeSectionConfig {
  limit?: number; // product sections
  categoryId?: string; // category_products
  image?: string; // banner, editorial, quote ("" = the built-in photo)
  link?: string; // banner, editorial
  linkText?: string; // editorial
  body?: string; // text, editorial, quote, contact
}

export interface HomeSection {
  id: string;
  type: HomeSectionType;
  title: string; // heading shown above the section ("" = no heading)
  isActive: boolean;
  sortOrder: number;
  config: HomeSectionConfig;
  createdAt: Date;
  updatedAt: Date;
}

export type NewHomeSection = Omit<HomeSection, "id" | "createdAt" | "updatedAt">;

/** The layout used before any customisation. */
export const DEFAULT_HOME_SECTIONS: NewHomeSection[] = [
  { type: "hero", title: "", isActive: true, sortOrder: 0, config: {} },
  {
    type: "text",
    title: "",
    isActive: true,
    sortOrder: 1,
    config: { body: "A considered selection for those who appreciate the ritual — from the weight of a fine lighter to the last detail of the case it rests in." },
  },
  { type: "categories", title: "The Collections", isActive: true, sortOrder: 2, config: {} },
  { type: "featured_products", title: "The Curated Edit", isActive: true, sortOrder: 3, config: { limit: 4 } },
  {
    type: "editorial",
    title: "Made for the moments worth slowing down for.",
    isActive: true,
    sortOrder: 4,
    config: {
      image: "",
      body: "Every piece in our collection is chosen by hand — refillable lighters built to last a lifetime, cases that age beautifully, and the accessories that complete the ritual.",
      link: "/products",
      linkText: "Discover the lighters",
    },
  },
  { type: "services", title: "", isActive: true, sortOrder: 5, config: {} },
  { type: "quote", title: "", isActive: true, sortOrder: 6, config: { body: "Some pleasures are meant to be savoured slowly.", image: "" } },
  { type: "contact", title: "At your service", isActive: true, sortOrder: 7, config: { body: "" } },
];
