import type { Category, NewCategory } from "../domain/category.js";
import type { NewOrder, Order, OrderStatus, PaymentStatus } from "../domain/order.js";
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
  /** Active and inactive products with the given ids; unknown ids are skipped. */
  findByIds(ids: string[]): Promise<Product[]>;
  create(data: NewProduct): Promise<Product>;
  /** Atomically takes `quantity` from stock. Returns false (and changes nothing) if not enough. */
  decrementStock(id: string, quantity: number): Promise<boolean>;
  incrementStock(id: string, quantity: number): Promise<void>;
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

export interface OrderQuery {
  userId?: string;
  status?: OrderStatus;
  search?: string; // order number, customer name or phone
  page: number;
  limit: number;
}

export interface OrderRepository {
  /** Throws DuplicateError("orderNumber") on a number collision. */
  create(data: NewOrder): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  list(query: OrderQuery): Promise<Paginated<Order>>;
  /** Applies the update only if the order is still in status `from`; otherwise returns null. */
  updateStatus(
    id: string,
    from: OrderStatus,
    update: { status: OrderStatus; paymentStatus?: PaymentStatus },
  ): Promise<Order | null>;
}

export interface Repositories {
  products: ProductRepository;
  categories: CategoryRepository;
  users: UserRepository;
  orders: OrderRepository;
}
