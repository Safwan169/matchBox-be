import type { NewProduct, Product } from "../domain/product.js";

// Every database implementation must satisfy these interfaces.
export interface ProductRepository {
  findAll(): Promise<Product[]>;
  findBySlug(slug: string): Promise<Product | null>;
  create(data: NewProduct): Promise<Product>;
}

export interface Repositories {
  products: ProductRepository;
}
