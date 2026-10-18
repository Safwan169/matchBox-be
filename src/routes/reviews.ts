import { Router } from "express";
import { z } from "zod";
import { reviewerName } from "../domain/review.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError, NotFoundError } from "../middleware/error-handler.js";
import { reviewLimiter } from "../middleware/rate-limit.js";
import { repositories } from "../repositories/index.js";
import { canReview, refreshProductRating } from "../services/reviews.js";

// Mounted at /api/products/:slug/reviews
export const reviewsRouter = Router({ mergeParams: true });

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10, "Please write at least 10 characters").max(1000),
});

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

async function productFromSlug(slug: string) {
  const product = await repositories.products.findBySlug(slug);
  if (!product) throw new NotFoundError("Product not found");
  return product;
}

const slugOf = (params: Record<string, string | string[]>) => String(params.slug ?? "");

// Public: published reviews + rating summary.
reviewsRouter.get("/", async (req, res) => {
  const product = await productFromSlug(slugOf(req.params));
  const page = pageSchema.parse(req.query);
  const [{ items, ...meta }, summary] = await Promise.all([
    repositories.reviews.listForProduct(product.id, page),
    repositories.reviews.summary(product.id),
  ]);
  // Don't expose user ids publicly.
  const data = items.map(({ userId: _u, productId: _p, status: _s, ...review }) => review);
  res.json({ data, meta, summary });
});

// The signed-in user's own review and whether they may write one.
reviewsRouter.get("/mine", requireAuth, async (req, res) => {
  const product = await productFromSlug(slugOf(req.params));
  const [review, eligible] = await Promise.all([
    repositories.reviews.findByUserAndProduct(req.user!.id, product.id),
    canReview(req.user!.id, product.id),
  ]);
  res.json({ data: { review, canReview: eligible || !!review } });
});

reviewsRouter.put("/mine", requireAuth, reviewLimiter, async (req, res) => {
  const product = await productFromSlug(slugOf(req.params));
  const { rating, comment } = reviewSchema.parse(req.body);
  const user = req.user!;

  if (!(await canReview(user.id, product.id))) {
    throw new HttpError(403, "Only customers who have received this product can review it.");
  }

  const review = await repositories.reviews.upsert({
    productId: product.id,
    userId: user.id,
    authorName: reviewerName(user.name),
    rating,
    comment,
  });
  await refreshProductRating(product.id);
  res.json({ data: review });
});

reviewsRouter.delete("/mine", requireAuth, async (req, res) => {
  const product = await productFromSlug(slugOf(req.params));
  const review = await repositories.reviews.findByUserAndProduct(req.user!.id, product.id);
  if (!review) throw new NotFoundError("You haven't reviewed this product");
  await repositories.reviews.delete(review.id);
  await refreshProductRating(product.id);
  res.status(204).end();
});
