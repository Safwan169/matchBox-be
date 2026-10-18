import type { CategoryRepository } from "../types.js";
import { notImplementedRepository } from "./stub.js";

export const postgresCategoryRepository = notImplementedRepository<CategoryRepository>("categories");
