// Placeholder for the PostgreSQL migration. Install a driver/ORM (e.g. `pg` with
// Drizzle or Prisma) and implement these when switching DB_CLIENT to "postgres".
export async function connectPostgres(_url: string | undefined): Promise<void> {
  throw new Error("PostgreSQL support is not implemented yet");
}

export async function disconnectPostgres(): Promise<void> {}

export function isPostgresConnected() {
  return false;
}
