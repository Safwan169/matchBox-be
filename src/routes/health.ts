import { Router } from "express";
import { env } from "../config/env.js";
import { isDatabaseConnected } from "../db/index.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    db: { client: env.DB_CLIENT, connected: isDatabaseConnected() },
  });
});
