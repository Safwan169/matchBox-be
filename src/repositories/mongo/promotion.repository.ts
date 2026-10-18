import mongoose, { Schema, type InferSchemaType } from "mongoose";
import type { Promotion } from "../../domain/promotion.js";
import type { PromotionRepository } from "../types.js";

const promotionSchema = new Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String, default: "" },
    image: { type: String, required: true },
    buttonText: { type: String, default: "" },
    link: { type: String, default: "" },
    showText: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true },
);

type PromotionDoc = InferSchemaType<typeof promotionSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const PromotionModel = mongoose.model("Promotion", promotionSchema);

function toPromotion(doc: PromotionDoc): Promotion {
  return {
    id: doc._id.toString(),
    title: doc.title,
    subtitle: doc.subtitle,
    image: doc.image,
    buttonText: doc.buttonText,
    link: doc.link,
    showText: doc.showText,
    sortOrder: doc.sortOrder,
    isActive: doc.isActive,
    startsAt: doc.startsAt ?? null,
    endsAt: doc.endsAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const order = { sortOrder: 1, createdAt: -1 } as const;

export const mongoPromotionRepository: PromotionRepository = {
  async listAll() {
    const docs = await PromotionModel.find().sort(order).lean<PromotionDoc[]>();
    return docs.map(toPromotion);
  },
  async listLive(now) {
    const docs = await PromotionModel.find({
      isActive: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
      ],
    })
      .sort(order)
      .lean<PromotionDoc[]>();
    return docs.map(toPromotion);
  },
  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await PromotionModel.findById(id).lean<PromotionDoc>();
    return doc ? toPromotion(doc) : null;
  },
  async create(data) {
    const doc = await PromotionModel.create(data);
    return toPromotion(doc.toObject() as PromotionDoc);
  },
  async update(id, data) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await PromotionModel.findByIdAndUpdate(id, data, {
      returnDocument: "after",
      runValidators: true,
    }).lean<PromotionDoc>();
    return doc ? toPromotion(doc) : null;
  },
  async delete(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    const result = await PromotionModel.deleteOne({ _id: id });
    return result.deletedCount === 1;
  },
};
