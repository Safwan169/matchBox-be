import { Router } from "express";
import { repositories } from "../repositories/index.js";

export const promotionsRouter = Router();

// Public: banners for the home page hero (active and within their date window).
promotionsRouter.get("/", async (_req, res) => {
  const promotions = await repositories.promotions.listLive(new Date());
  res.json({
    data: promotions.map(({ id, kind, eyebrow, title, accent, subtitle, image, buttonText, link, showText, textColor, eyebrowColor, accentColor }) => ({
      id,
      kind,
      eyebrow,
      title,
      accent,
      subtitle,
      image,
      buttonText,
      link,
      showText,
      textColor,
      eyebrowColor,
      accentColor,
    })),
  });
});
