// Database-agnostic product shape. Routes and services only ever see this type,
// never a Mongoose document or a SQL row, so the database can be swapped.
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  brand: string;
  price: number | null; // smallest currency unit (BDT poisha: 35000 = ৳350); null = "price on request", can't be ordered
  compareAtPrice: number | null; // original price when on sale
  stock: number;
  maxPerOrder: number | null; // most one order may contain; null = only the store-wide limit
  images: string[];
  ageRestricted: boolean;
  isFeatured: boolean;
  isActive: boolean;
  ratingAverage: number; // 0–5, from published reviews (kept in sync by the review service)
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type NewProduct = Omit<Product, "id" | "createdAt" | "updatedAt" | "ratingAverage" | "ratingCount">;
