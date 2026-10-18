import type { CookieOptions, Response } from "express";
import jwt from "jsonwebtoken";
import { env, isProduction } from "../config/env.js";

export const SESSION_COOKIE = "mb_session";

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
};

export function startSession(res: Response, userId: string) {
  const token = jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: `${env.JWT_EXPIRES_DAYS}d`,
  });
  res.cookie(SESSION_COOKIE, token, {
    ...cookieOptions,
    maxAge: env.JWT_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function endSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

/** Returns the user id from a valid token, or null. */
export function readSession(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    return typeof payload === "object" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}
