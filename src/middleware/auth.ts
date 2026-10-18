import type { RequestHandler } from "express";
import { repositories } from "../repositories/index.js";
import { readSession, SESSION_COOKIE } from "../services/session.js";
import { HttpError } from "./error-handler.js";

// Loads the user from the session cookie (if any) onto req.user. The user is read
// from the database on each request so role changes and deletions apply immediately.
export const authenticate: RequestHandler = async (req, _res, next) => {
  const userId = readSession(req.cookies?.[SESSION_COOKIE]);
  if (userId) {
    req.user = (await repositories.users.findById(userId)) ?? undefined;
  }
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) throw new HttpError(401, "Please log in");
  next();
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) throw new HttpError(401, "Please log in");
  if (req.user.role !== "admin") throw new HttpError(403, "Admin access required");
  next();
};
