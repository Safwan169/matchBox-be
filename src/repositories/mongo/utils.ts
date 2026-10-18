import { DuplicateError } from "../../domain/errors.js";

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Re-throws MongoDB duplicate-key errors as a database-agnostic DuplicateError. */
export function rethrowDuplicate(err: unknown, field: string): never {
  if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
    throw new DuplicateError(field);
  }
  throw err;
}
