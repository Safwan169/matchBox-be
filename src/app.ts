import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { authenticate } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { healthRouter } from "./routes/health.js";
import { ordersRouter } from "./routes/orders.js";
import { productsRouter } from "./routes/products.js";
import { settingsRouter } from "./routes/settings.js";
import { UPLOAD_DIR, UPLOAD_URL_PREFIX } from "./services/uploads.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  // Allow the storefront (another origin) to display uploaded images.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

  app.use(
    UPLOAD_URL_PREFIX,
    express.static(UPLOAD_DIR, {
      maxAge: "30d",
      immutable: true, // file names are random UUIDs, never reused
      setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
    }),
  );

  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(authenticate);

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/admin", adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
