import type { ReviewRepository } from "../types.js";
import { notImplementedRepository } from "./stub.js";

export const postgresReviewRepository = notImplementedRepository<ReviewRepository>("reviews");
