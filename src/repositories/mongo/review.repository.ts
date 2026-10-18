import mongoose, { Schema, type InferSchemaType } from "mongoose";
import type { RatingSummary, Review } from "../../domain/review.js";
import type { ReviewRepository } from "../types.js";

const reviewSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    status: { type: String, enum: ["published", "hidden"], default: "published", index: true },
  },
  { timestamps: true },
);
// One review per customer per product.
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, status: 1, createdAt: -1 });

type ReviewDoc = InferSchemaType<typeof reviewSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const ReviewModel = mongoose.model("Review", reviewSchema);

function toReview(doc: ReviewDoc): Review {
  return {
    id: doc._id.toString(),
    productId: doc.productId.toString(),
    userId: doc.userId.toString(),
    authorName: doc.authorName,
    rating: doc.rating,
    comment: doc.comment,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const valid = (...ids: string[]) => ids.every((id) => mongoose.isValidObjectId(id));

export const mongoReviewRepository: ReviewRepository = {
  async listForProduct(productId, { page, limit }) {
    if (!valid(productId)) return { items: [], total: 0, page, limit, totalPages: 0 };
    const filter: Record<string, unknown> = { productId, status: "published" };
    const [docs, total] = await Promise.all([
      ReviewModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean<ReviewDoc[]>(),
      ReviewModel.countDocuments(filter),
    ]);
    return { items: docs.map(toReview), total, page, limit, totalPages: Math.ceil(total / limit) };
  },
  async list({ status, page, limit }) {
    const filter: Record<string, unknown> = status ? { status } : {};
    const [docs, total] = await Promise.all([
      ReviewModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean<ReviewDoc[]>(),
      ReviewModel.countDocuments(filter),
    ]);
    return { items: docs.map(toReview), total, page, limit, totalPages: Math.ceil(total / limit) };
  },
  async findById(id) {
    if (!valid(id)) return null;
    const doc = await ReviewModel.findById(id).lean<ReviewDoc>();
    return doc ? toReview(doc) : null;
  },
  async findByUserAndProduct(userId, productId) {
    if (!valid(userId, productId)) return null;
    const doc = await ReviewModel.findOne({ userId, productId }).lean<ReviewDoc>();
    return doc ? toReview(doc) : null;
  },
  async upsert({ productId, userId, authorName, rating, comment }) {
    const doc = await ReviewModel.findOneAndUpdate(
      { productId, userId },
      // Editing keeps an admin's "hidden" decision; new reviews start published.
      { $set: { authorName, rating, comment }, $setOnInsert: { status: "published" } },
      { upsert: true, returnDocument: "after", runValidators: true },
    ).lean<ReviewDoc>();
    return toReview(doc!);
  },
  async setStatus(id, status) {
    if (!valid(id)) return null;
    const doc = await ReviewModel.findByIdAndUpdate(id, { status }, { returnDocument: "after" }).lean<ReviewDoc>();
    return doc ? toReview(doc) : null;
  },
  async delete(id) {
    if (!valid(id)) return false;
    const result = await ReviewModel.deleteOne({ _id: id });
    return result.deletedCount === 1;
  },
  async summary(productId) {
    const empty: RatingSummary = { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    if (!valid(productId)) return empty;
    const rows = await ReviewModel.aggregate<{ _id: 1 | 2 | 3 | 4 | 5; count: number }>([
      { $match: { productId: new mongoose.Types.ObjectId(productId), status: "published" } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
    ]);
    let total = 0;
    let sum = 0;
    for (const row of rows) {
      empty.distribution[row._id] = row.count;
      total += row.count;
      sum += row._id * row.count;
    }
    return { ...empty, count: total, average: total ? Math.round((sum / total) * 10) / 10 : 0 };
  },
};
