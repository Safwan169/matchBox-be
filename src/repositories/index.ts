import { env } from "../config/env.js";
import type { Repositories } from "./types.js";
import { mongoCategoryRepository } from "./mongo/category.repository.js";
import { mongoOrderRepository } from "./mongo/order.repository.js";
import { mongoSettingsRepository } from "./mongo/settings.repository.js";
import { mongoPromotionRepository } from "./mongo/promotion.repository.js";
import { mongoReviewRepository } from "./mongo/review.repository.js";
import { mongoHomeSectionRepository } from "./mongo/home-section.repository.js";
import { mongoProductRepository } from "./mongo/product.repository.js";
import { mongoUserRepository } from "./mongo/user.repository.js";
import { postgresCategoryRepository } from "./postgres/category.repository.js";
import { postgresOrderRepository } from "./postgres/order.repository.js";
import { postgresSettingsRepository } from "./postgres/settings.repository.js";
import { postgresPromotionRepository } from "./postgres/promotion.repository.js";
import { postgresReviewRepository } from "./postgres/review.repository.js";
import { postgresHomeSectionRepository } from "./postgres/home-section.repository.js";
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
        settings: postgresSettingsRepository,
        promotions: postgresPromotionRepository,
        reviews: postgresReviewRepository,
        homeSections: postgresHomeSectionRepository,
      }
    : {
        products: mongoProductRepository,
        categories: mongoCategoryRepository,
        users: mongoUserRepository,
        orders: mongoOrderRepository,
        settings: mongoSettingsRepository,
        promotions: mongoPromotionRepository,
        reviews: mongoReviewRepository,
        homeSections: mongoHomeSectionRepository,
      };
