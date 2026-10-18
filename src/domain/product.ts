// Database-agnostic product shape. Routes and services only ever see this type,
// never a Mongoose document or a SQL row, so the database can be swapped.
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number; // smallest currency unit (e.g. paisa/cents)
  stock: number;
  images: string[];
  ageRestricted: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type NewProduct = Omit<Product, "id" | "createdAt" | "updatedAt">;
