import type { User } from "../domain/user.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware when a valid session cookie is present. */
      user?: User;
    }
  }
}

export {};
