import type { ProductRepository } from "../types.js";

const notImplemented = (): never => {
  throw new Error("PostgreSQL product repository is not implemented yet");
};

export const postgresProductRepository: ProductRepository = {
  findAll: async () => notImplemented(),
  findBySlug: async () => notImplemented(),
  create: async () => notImplemented(),
};
