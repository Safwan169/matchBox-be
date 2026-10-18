import type { Category, NewCategory } from "../domain/category.js";
import type { Paginated } from "../domain/pagination.js";
import type { NewProduct, Product } from "../domain/product.js";

export type ProductSort = "newest" | "price_asc" | "price_desc" | "name_asc";

export interface ProductQuery {
  categoryId?: string;
  search?: string;
  featured?: boolean;
  sort: ProductSort;
  page: number;
  limit: number;
}

// Every database implementation must satisfy these interfaces.
export interface ProductRepository {
  list(query: ProductQuery): Promise<Paginated<Product>>;
  findBySlug(slug: string): Promise<Product | null>;
  create(data: NewProduct): Promise<Product>;
}

export interface CategoryRepository {
  findAll(): Promise<Category[]>;
  findBySlug(slug: string): Promise<Category | null>;
  create(data: NewCategory): Promise<Category>;
}

export interface Repositories {
  products: ProductRepository;
  categories: CategoryRepository;
}
