import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { repositories } from "../repositories/index.js";

/**
 * Creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD if no account has that email.
 * An existing account is never changed: its password may have been changed in the dashboard,
 * and promoting a customer account could hand admin to whoever registered that email.
 */
export async function ensureAdminFromEnv(): Promise<void> {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return;

  const existing = await repositories.users.findByEmailWithPassword(env.ADMIN_EMAIL);
  if (existing) {
    if (existing.role !== "admin") {
      console.warn(`[admin] ${env.ADMIN_EMAIL} exists but is not an admin; not changed. Use npm run create-admin to promote it.`);
    }
    return;
  }

  await repositories.users.create({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    phone: "",
    address: null,
    role: "admin",
    dateOfBirth: new Date("1990-01-01T00:00:00Z"),
    passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 12),
  });
  console.log(`[admin] Created admin account ${env.ADMIN_EMAIL} from .env`);
}
