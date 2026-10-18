import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env.js";

const INTERNAL_HEADER = "x-internal-key";

/**
 * Requests from our own Next.js server (server-side rendering) all come from one IP, so
 * they would hit per-IP limits for every visitor at once. The storefront server sends a
 * shared secret header; those requests skip IP-based limits.
 */
export function isTrustedServer(req: Request) {
  const expected = env.INTERNAL_API_KEY;
  const given = req.get(INTERNAL_HEADER);
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface LimiterOptions {
  windowMs: number;
  limit: number;
  message: string;
  /** Count signed-in users by account instead of by IP (for logged-in actions). */
  perUser?: boolean;
}

function createLimiter({ windowMs, limit, message, perUser = false }: LimiterOptions) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: message },
    skip: isTrustedServer,
    // ipKeyGenerator groups IPv6 addresses by subnet so one user can't rotate addresses.
    keyGenerator: (req) => (perUser && req.user ? `user:${req.user.id}` : `ip:${ipKeyGenerator(req.ip ?? "")}`),
  });
}

const MINUTE = 60 * 1000;

/** Every API request: generous, stops scraping and floods. */
export const apiLimiter = createLimiter({
  windowMs: MINUTE,
  limit: 300,
  message: "Too many requests. Please slow down and try again in a minute.",
});

/** Login, register, password change: slows password guessing and mass sign-ups. */
export const authLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  message: "Too many attempts. Please try again in 15 minutes.",
});

/** Placing orders. */
export const orderLimiter = createLimiter({
  windowMs: 10 * MINUTE,
  limit: 10,
  perUser: true,
  message: "Too many orders in a short time. Please wait a few minutes or contact us.",
});

/** Checkout price quotes (called as the customer types). */
export const quoteLimiter = createLimiter({
  windowMs: MINUTE,
  limit: 60,
  perUser: true,
  message: "Too many requests. Please wait a moment.",
});

/** Posting reviews. */
export const reviewLimiter = createLimiter({
  windowMs: 60 * MINUTE,
  limit: 10,
  perUser: true,
  message: "Too many reviews in a short time. Please try again later.",
});

/** Admin image uploads. */
export const uploadLimiter = createLimiter({
  windowMs: 10 * MINUTE,
  limit: 60,
  perUser: true,
  message: "Too many uploads. Please wait a few minutes.",
});
