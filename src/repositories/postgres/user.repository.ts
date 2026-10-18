import type { UserRepository } from "../types.js";
import { notImplementedRepository } from "./stub.js";

export const postgresUserRepository = notImplementedRepository<UserRepository>("users");
