import type { OrderRepository } from "../types.js";
import { notImplementedRepository } from "./stub.js";

export const postgresOrderRepository = notImplementedRepository<OrderRepository>("orders");
