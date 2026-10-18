import { env } from "../config/env.js";
import type { Repositories } from "./types.js";
import { mongoCategoryRepository } from "./mongo/category.repository.js";
import { mongoProductRepository } from "./mongo/product.repository.js";
import { postgresCategoryRepository } from "./postgres/category.repository.js";
import { postgresProductRepository } from "./postgres/product.repository.js";

// The only place that decides which database implementation is used.
export const repositories: Repositories =
  env.DB_CLIENT === "postgres"
    ? { products: postgresProductRepository, categories: postgresCategoryRepository }
    : { products: mongoProductRepository, categories: mongoCategoryRepository };
