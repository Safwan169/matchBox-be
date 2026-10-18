import type { Category, NewCategory } from "../domain/category.js";
import type { NewOrder, Order, OrderStatus, PaymentStatus } from "../domain/order.js";
import type { Paginated } from "../domain/pagination.js";
import type { StoreSettings, StoreSettingsUpdate } from "../domain/settings.js";
import type { NewProduct, Product } from "../domain/product.js";
import type { HomeSection, NewHomeSection } from "../domain/home-section.js";
import type { NewPromotion, Promotion } from "../domain/promotion.js";
import type { RatingSummary, Review, ReviewStatus } from "../domain/review.js";
import type { NewUser, User, UserRole, UserUpdate, UserWithPassword } from "../domain/user.js";

export type ProductSort = "newest" | "price_asc" | "price_desc" | "name_asc";

export interface ProductQuery {
  categoryId?: string;
  search?: string;
  featured?: boolean;
  /** Only products with a compare-at price above the price. */
  onSale?: boolean;
  /** Product ids to leave out (e.g. the product being viewed). */
  excludeIds?: string[];
  /** "active" (default, storefront), "inactive" or "all" (admin). */
  status?: "active" | "inactive" | "all";
  sort: ProductSort;
  page: number;
  limit: number;
}

// Every database implementation must satisfy these interfaces.
export interface ProductRepository {
  list(query: ProductQuery): Promise<Paginated<Product>>;
  /** Active products only. */
  findBySlug(slug: string): Promise<Product | null>;
  /** Any product, active or not. */
  findById(id: string): Promise<Product | null>;
  /** Active and inactive products with the given ids; unknown ids are skipped. */
  findByIds(ids: string[]): Promise<Product[]>;
  /** Throws DuplicateError("slug") if the slug is taken. */
  create(data: NewProduct): Promise<Product>;
  /** Throws DuplicateError("slug") if the slug is taken. */
  update(id: string, data: Partial<NewProduct>): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
  countByCategory(categoryId: string): Promise<number>;
  count(): Promise<number>;
  /** Active products at or below the threshold, lowest stock first. */
  listLowStock(threshold: number, limit: number): Promise<Product[]>;
  /** Atomically takes `quantity` from stock. Returns false (and changes nothing) if not enough. */
  decrementStock(id: string, quantity: number): Promise<boolean>;
  incrementStock(id: string, quantity: number): Promise<void>;
  setRating(id: string, ratingAverage: number, ratingCount: number): Promise<void>;
}

export interface CategoryRepository {
  /** Active categories only, unless includeInactive is set. */
  findAll(options?: { includeInactive?: boolean }): Promise<Category[]>;
  findBySlug(slug: string): Promise<Category | null>;
  findById(id: string): Promise<Category | null>;
  /** Throws DuplicateError("slug") if the slug is taken. */
  create(data: NewCategory): Promise<Category>;
  update(id: string, data: Partial<NewCategory>): Promise<Category | null>;
  delete(id: string): Promise<boolean>;
}

export interface UserQuery {
  role?: UserRole;
  search?: string; // name, email or phone
  page: number;
  limit: number;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmailWithPassword(email: string): Promise<UserWithPassword | null>;
  /** Throws DuplicateError("email") if the email is taken. */
  create(data: NewUser): Promise<User>;
  update(id: string, data: UserUpdate): Promise<User | null>;
  setPasswordHash(id: string, passwordHash: string): Promise<void>;
  list(query: UserQuery): Promise<Paginated<User>>;
  count(role?: UserRole): Promise<number>;
}

export interface OrderQuery {
  userId?: string;
  status?: OrderStatus;
  search?: string; // order number, customer name or phone
  page: number;
  limit: number;
}

export interface OrderStats {
  totalOrders: number;
  /** Sum of order totals, excluding cancelled orders. */
  revenue: number;
  byStatus: Record<OrderStatus, number>;
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
  stats(): Promise<OrderStats>;
  /** True if the user has a delivered order containing the product. */
  hasDeliveredPurchase(userId: string, productId: string): Promise<boolean>;
  /** Number of orders per user id. */
  countByUsers(userIds: string[]): Promise<Record<string, number>>;
}

export interface SettingsRepository {
  /** Current settings; defaults (empty values) if never saved. */
  get(): Promise<StoreSettings>;
  update(data: StoreSettingsUpdate): Promise<StoreSettings>;
}

export interface PromotionRepository {
  /** All promotions (admin), by sortOrder. */
  listAll(): Promise<Promotion[]>;
  /** Active promotions whose start/end window contains `now`, by sortOrder. */
  listLive(now: Date): Promise<Promotion[]>;
  findById(id: string): Promise<Promotion | null>;
  create(data: NewPromotion): Promise<Promotion>;
  update(id: string, data: Partial<NewPromotion>): Promise<Promotion | null>;
  delete(id: string): Promise<boolean>;
}

export interface ReviewRepository {
  /** Published reviews of a product, newest first. */
  listForProduct(productId: string, page: { page: number; limit: number }): Promise<Paginated<Review>>;
  /** All reviews (admin), newest first. */
  list(query: { status?: ReviewStatus; page: number; limit: number }): Promise<Paginated<Review>>;
  findById(id: string): Promise<Review | null>;
  findByUserAndProduct(userId: string, productId: string): Promise<Review | null>;
  /** Creates or updates the user's review of the product (one per user per product). */
  upsert(data: Pick<Review, "productId" | "userId" | "authorName" | "rating" | "comment">): Promise<Review>;
  setStatus(id: string, status: ReviewStatus): Promise<Review | null>;
  delete(id: string): Promise<boolean>;
  /** Average, count and 1–5 distribution of published reviews. */
  summary(productId: string): Promise<RatingSummary>;
}

export interface HomeSectionRepository {
  /** All sections in display order. */
  listAll(): Promise<HomeSection[]>;
  count(): Promise<number>;
  findById(id: string): Promise<HomeSection | null>;
  createMany(data: NewHomeSection[]): Promise<HomeSection[]>;
  update(id: string, data: Partial<NewHomeSection>): Promise<HomeSection | null>;
  delete(id: string): Promise<boolean>;
  /** Sets sortOrder to each id's position in the list. */
  reorder(ids: string[]): Promise<void>;
}

export interface Repositories {
  products: ProductRepository;
  categories: CategoryRepository;
  users: UserRepository;
  orders: OrderRepository;
  settings: SettingsRepository;
  promotions: PromotionRepository;
  reviews: ReviewRepository;
  homeSections: HomeSectionRepository;
}
