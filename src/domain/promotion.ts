/** A banner shown in the home page hero carousel. */
export interface Promotion {
  id: string;
  kind: "brand" | "promotion";
  eyebrow: string;
  title: string; // also used as the image's alt text
  accent: string;
  subtitle: string;
  image: string; // "/uploads/…" or https URL; recommended 1640×624
  buttonText: string;
  link: string; // "/products/…" or https URL; "" for no button
  showText: boolean; // false when the banner image already contains its own text
  textColor: "ivory" | "brass" | "ink";
  eyebrowColor: "ivory" | "brass" | "ink";
  accentColor: "ivory" | "brass" | "ink";
  sortOrder: number;
  isActive: boolean;
  startsAt: Date | null; // null = no start limit
  endsAt: Date | null; // null = no end limit
  createdAt: Date;
  updatedAt: Date;
}

export type NewPromotion = Omit<Promotion, "id" | "kind" | "createdAt" | "updatedAt">;
