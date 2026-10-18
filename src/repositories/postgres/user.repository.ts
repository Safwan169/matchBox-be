import type { UserRepository } from "../types.js";

const notImplemented = (): never => {
  throw new Error("PostgreSQL user repository is not implemented yet");
};

export const postgresUserRepository: UserRepository = {
  findById: async () => notImplemented(),
  findByEmailWithPassword: async () => notImplemented(),
  create: async () => notImplemented(),
  update: async () => notImplemented(),
  setPasswordHash: async () => notImplemented(),
};
