export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type NewCategory = Omit<Category, "id" | "createdAt" | "updatedAt">;
