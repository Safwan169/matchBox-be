import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  // Number of reverse proxies in front of the API (e.g. 1 behind Nginx/Cloudflare). Keep 0
  // when clients connect directly, otherwise they could fake their IP via X-Forwarded-For.
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  // Shared secret the storefront server sends so its requests skip per-IP rate limits.
  INTERNAL_API_KEY: z.string().min(32, "INTERNAL_API_KEY must be at least 32 characters").optional(),
  DB_CLIENT: z.enum(["mongo", "postgres"]).default("mongo"),
  MONGO_URI: z.string().optional(),
  DATABASE_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type DbClient = typeof env.DB_CLIENT;
export const isProduction = env.NODE_ENV === "production";
