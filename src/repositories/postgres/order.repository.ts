import type { OrderRepository } from "../types.js";

const notImplemented = (): never => {
  throw new Error("PostgreSQL order repository is not implemented yet");
};

export const postgresOrderRepository: OrderRepository = {
  create: async () => notImplemented(),
  findById: async () => notImplemented(),
  list: async () => notImplemented(),
  updateStatus: async () => notImplemented(),
};
