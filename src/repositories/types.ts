import type { Category, NewCategory } from "../domain/category.js";
import type { Paginated } from "../domain/pagination.js";
import type { NewProduct, Product } from "../domain/product.js";
import type { NewUser, User, UserUpdate, UserWithPassword } from "../domain/user.js";

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

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<UserWithPassword | null>;
  /** Throws DuplicateError("email") if the email is taken. */
  create(data: NewUser): Promise<User>;
  update(id: string, data: UserUpdate): Promise<User | null>;
  setPasswordHash(id: string, passwordHash: string): Promise<void>;
}

export interface Repositories {
  products: ProductRepository;
  categories: CategoryRepository;
  users: UserRepository;
}
