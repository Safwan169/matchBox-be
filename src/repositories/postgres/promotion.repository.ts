import type { PromotionRepository } from "../types.js";
import { notImplementedRepository } from "./stub.js";

export const postgresPromotionRepository = notImplementedRepository<PromotionRepository>("promotions");
