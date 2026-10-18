import { Router } from "express";
import { repositories } from "../repositories/index.js";

export const settingsRouter = Router();

// Public: store contact details for the website (footer, WhatsApp button).
settingsRouter.get("/", async (_req, res) => {
  const { updatedAt: _omit, ...settings } = await repositories.settings.get();
  res.json({ data: settings });
});
