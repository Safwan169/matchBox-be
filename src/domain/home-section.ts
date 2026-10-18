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
] as const;
export type HomeSectionType = (typeof HOME_SECTION_TYPES)[number];

export interface HomeSectionConfig {
  limit?: number; // product sections
  categoryId?: string; // category_products
  image?: string; // banner
  link?: string; // banner
  body?: string; // text
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
  { type: "categories", title: "Shop by category", isActive: true, sortOrder: 1, config: {} },
  { type: "featured_products", title: "Featured", isActive: true, sortOrder: 2, config: { limit: 8 } },
];
