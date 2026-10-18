// Database-agnostic errors thrown by repositories. Mapped to HTTP codes by the error handler.
export class DuplicateError extends Error {
  constructor(public field: string) {
    super(`${field} already exists`);
  }
}
