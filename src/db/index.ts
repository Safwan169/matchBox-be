import { env } from "../config/env.js";
import { connectMongo, disconnectMongo, isMongoConnected } from "./mongo/connection.js";
import { connectPostgres, disconnectPostgres, isPostgresConnected } from "./postgres/connection.js";

export async function connectDatabase() {
  if (env.DB_CLIENT === "postgres") return connectPostgres(env.DATABASE_URL);
  return connectMongo(env.MONGO_URI);
}

export async function disconnectDatabase() {
  if (env.DB_CLIENT === "postgres") return disconnectPostgres();
  return disconnectMongo();
}

export function isDatabaseConnected() {
  return env.DB_CLIENT === "postgres" ? isPostgresConnected() : isMongoConnected();
}
