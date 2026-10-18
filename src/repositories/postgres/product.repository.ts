import type { ProductRepository } from "../types.js";
import { notImplementedRepository } from "./stub.js";

export const postgresProductRepository = notImplementedRepository<ProductRepository>("products");
