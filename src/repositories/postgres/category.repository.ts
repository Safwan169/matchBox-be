import type { CategoryRepository } from "../types.js";

const notImplemented = (): never => {
  throw new Error("PostgreSQL category repository is not implemented yet");
};

export const postgresCategoryRepository: CategoryRepository = {
  findAll: async () => notImplemented(),
  findBySlug: async () => notImplemented(),
  create: async () => notImplemented(),
};
