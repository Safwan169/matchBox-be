// Creates an admin account, or promotes an existing account to admin.
// Usage: npm run create-admin -- --email you@example.com --password "secret123" --name "Owner"
import bcrypt from "bcryptjs";
import { parseArgs } from "node:util";
import { connectDatabase, disconnectDatabase } from "../db/index.js";
import { repositories } from "../repositories/index.js";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
    name: { type: "string", default: "Admin" },
    dob: { type: "string", default: "1990-01-01" },
  },
});

async function main() {
  if (!values.email) throw new Error("--email is required");
  await connectDatabase();

  const existing = await repositories.users.findByEmailWithPassword(values.email);
  if (existing) {
    await repositories.users.update(existing.id, { role: "admin" });
    if (values.password) {
      await repositories.users.setPasswordHash(existing.id, await bcrypt.hash(values.password, 12));
    }
    console.log(`Promoted ${existing.email} to admin`);
  } else {
    if (!values.password || values.password.length < 8) {
      throw new Error("--password (min 8 characters) is required for a new account");
    }
    const user = await repositories.users.create({
      name: values.name,
      email: values.email,
      phone: "",
      role: "admin",
      dateOfBirth: new Date(`${values.dob}T00:00:00Z`),
      passwordHash: await bcrypt.hash(values.password, 12),
    });
    console.log(`Created admin ${user.email}`);
  }

  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await disconnectDatabase();
  process.exit(1);
});
