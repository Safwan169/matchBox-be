import { Router } from "express";
import type { HomeSectionConfig } from "../domain/home-section.js";
import { repositories } from "../repositories/index.js";
import { getHomeSections } from "../services/home-sections.js";

export const homeSectionsRouter = Router();

// Public: visible home page sections in order, with category slugs resolved for links.
homeSectionsRouter.get("/", async (_req, res) => {
  const sections = (await getHomeSections()).filter((s) => s.isActive);
  const categories = await repositories.categories.findAll();
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));

  const data = sections
    .map(({ id, type, title, config }) => {
      const publicConfig: HomeSectionConfig & { categorySlug?: string } = { ...config };
      if (type === "category_products") publicConfig.categorySlug = slugById.get(config.categoryId ?? "");
      return { id, type, title, config: publicConfig };
    })
    // Hide category sections whose category was deleted or hidden.
    .filter((s) => s.type !== "category_products" || s.config.categorySlug);
  res.json({ data });
});
