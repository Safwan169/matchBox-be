import type { RequestHandler } from "express";
import { env } from "../config/env.js";

const STOREFRONT_URL = env.STOREFRONT_URL ?? env.CORS_ORIGIN[0];

/**
 * Tells the storefront to refresh its cached store data (home sections, categories,
 * promotions, settings, product lists). Fire-and-forget: a failure only means the
 * storefront refreshes on its normal one-minute schedule instead.
 */
export function refreshStorefront() {
  if (!STOREFRONT_URL || !env.INTERNAL_API_KEY) return;
  fetch(`${STOREFRONT_URL}/api/revalidate`, {
    method: "POST",
    headers: { "X-Internal-Key": env.INTERNAL_API_KEY },
    signal: AbortSignal.timeout(5000),
  })
    .then((res) => {
      if (!res.ok) console.warn(`[storefront] revalidate responded ${res.status}`);
    })
    .catch((err) => console.warn("[storefront] revalidate failed:", (err as Error).message));
}

/** Middleware: refresh the storefront after any successful write request on this router. */
export const refreshStorefrontAfterWrites: RequestHandler = (req, res, next) => {
  if (req.method !== "GET") {
    res.on("finish", () => {
      if (res.statusCode < 400) refreshStorefront();
    });
  }
  next();
};
