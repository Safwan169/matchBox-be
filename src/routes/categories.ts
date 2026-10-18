import { Router } from "express";
import { NotFoundError } from "../middleware/error-handler.js";
import { repositories } from "../repositories/index.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res) => {
  const categories = await repositories.categories.findAll();
  res.json({ data: categories });
});

categoriesRouter.get("/:slug", async (req, res) => {
  const category = await repositories.categories.findBySlug(req.params.slug);
  if (!category) throw new NotFoundError("Category not found");
  res.json({ data: category });
});
