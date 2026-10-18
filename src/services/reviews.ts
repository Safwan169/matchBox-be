import { repositories } from "../repositories/index.js";

/** Recomputes a product's stored rating from its published reviews. Call after any review change. */
export async function refreshProductRating(productId: string) {
  const { average, count } = await repositories.reviews.summary(productId);
  await repositories.products.setRating(productId, average, count);
}

/** Only customers who received the product (a delivered order) may review it. */
export async function canReview(userId: string, productId: string) {
  return repositories.orders.hasDeliveredPurchase(userId, productId);
}
