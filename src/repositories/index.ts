import { env } from "../config/env.js";
import type { Repositories } from "./types.js";
import { mongoCategoryRepository } from "./mongo/category.repository.js";
import { mongoOrderRepository } from "./mongo/order.repository.js";
import { mongoProductRepository } from "./mongo/product.repository.js";
import { mongoUserRepository } from "./mongo/user.repository.js";
import { postgresCategoryRepository } from "./postgres/category.repository.js";
import { postgresOrderRepository } from "./postgres/order.repository.js";
import { postgresProductRepository } from "./postgres/product.repository.js";
import { postgresUserRepository } from "./postgres/user.repository.js";

// The only place that decides which database implementation is used.
export const repositories: Repositories =
  env.DB_CLIENT === "postgres"
    ? {
        products: postgresProductRepository,
        categories: postgresCategoryRepository,
        users: postgresUserRepository,
        orders: postgresOrderRepository,
      }
    : {
        products: mongoProductRepository,
        categories: mongoCategoryRepository,
        users: mongoUserRepository,
        orders: mongoOrderRepository,
      };
