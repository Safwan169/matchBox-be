import { Router } from "express";
import { z } from "zod";
import { NotFoundError } from "../middleware/error-handler.js";
import { repositories } from "../repositories/index.js";

export const productsRouter = Router();

const listQuerySchema = z.object({
  // Filter by category slug (friendlier for URLs than ids).
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  featured: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "name_asc"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

productsRouter.get("/", async (req, res) => {
  const { category, ...query } = listQuerySchema.parse(req.query);

  let categoryId: string | undefined;
  if (category) {
    const found = await repositories.categories.findBySlug(category);
    if (!found) throw new NotFoundError("Category not found");
    categoryId = found.id;
  }

  const result = await repositories.products.list({ ...query, categoryId });
  const { items, ...meta } = result;
  res.json({ data: items, meta });
});

productsRouter.get("/:slug", async (req, res) => {
  const product = await repositories.products.findBySlug(req.params.slug);
  if (!product) throw new NotFoundError("Product not found");
  res.json({ data: product });
});
