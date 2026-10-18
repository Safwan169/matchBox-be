// Placeholder used until the PostgreSQL implementation exists: any method call throws.
// Replace each repository file's stub with a real implementation during the migration.
export function notImplementedRepository<T extends object>(name: string): T {
  return new Proxy({} as T, {
    get: (_target, method) => async () => {
      throw new Error(`PostgreSQL ${name}.${String(method)} is not implemented yet`);
    },
  });
}
