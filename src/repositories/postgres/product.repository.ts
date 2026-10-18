import type { ProductRepository } from "../types.js";

const notImplemented = (): never => {
  throw new Error("PostgreSQL product repository is not implemented yet");
};

export const postgresProductRepository: ProductRepository = {
  list: async () => notImplemented(),
  findBySlug: async () => notImplemented(),
  create: async () => notImplemented(),
};
