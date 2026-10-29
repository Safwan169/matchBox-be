import mongoose, { Schema, type InferSchemaType } from "mongoose";
import type { Promotion } from "../../domain/promotion.js";
import type { PromotionRepository } from "../types.js";

const promotionSchema = new Schema(
  {
    kind: { type: String, enum: ["brand", "promotion"], default: "promotion" },
    eyebrow: { type: String, default: "" },
    title: { type: String, required: true },
    accent: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    image: { type: String, required: true },
    buttonText: { type: String, default: "" },
    link: { type: String, default: "" },
    showText: { type: Boolean, default: true },
    textColor: { type: String, enum: ["ivory", "brass", "ink"], default: "ivory" },
    eyebrowColor: { type: String, enum: ["ivory", "brass", "ink"], default: "brass" },
    accentColor: { type: String, enum: ["ivory", "brass", "ink"], default: "brass" },
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
const BRAND_SLIDE_ID = new mongoose.Types.ObjectId("0000000000000000000000b1");

function toPromotion(doc: PromotionDoc): Promotion {
  return {
    id: doc._id.toString(),
    kind: doc.kind === "brand" ? "brand" : "promotion",
    eyebrow: doc.eyebrow ?? "",
    title: doc.title,
    accent: doc.accent ?? "",
    subtitle: doc.subtitle,
    image: doc.image,
    buttonText: doc.buttonText,
    link: doc.link,
    showText: doc.showText,
    textColor: doc.textColor === "brass" || doc.textColor === "ink" ? doc.textColor : "ivory",
    eyebrowColor: doc.eyebrowColor === "ivory" || doc.eyebrowColor === "ink" ? doc.eyebrowColor : "brass",
    accentColor: doc.accentColor === "ivory" || doc.accentColor === "ink" ? doc.accentColor : "brass",
    sortOrder: doc.sortOrder,
    isActive: doc.isActive,
    startsAt: doc.startsAt ?? null,
    endsAt: doc.endsAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const order = { sortOrder: 1, createdAt: -1 } as const;

async function ensureBrandSlide() {
  const doc = await PromotionModel.findOneAndUpdate(
    { _id: BRAND_SLIDE_ID },
    {
      $setOnInsert: {
        kind: "brand",
        eyebrow: "MatchBox · Dhaka",
        title: "The quiet art of the",
        accent: "flame.",
        subtitle: "Lighters, tobacco and smoking accessories, chosen for their craft and delivered with discretion.",
        image: "/images/hero-flame.jpg",
        buttonText: "Explore the collection",
        link: "/products",
        showText: true,
        textColor: "ivory",
        eyebrowColor: "brass",
        accentColor: "brass",
        sortOrder: 0,
        isActive: true,
        startsAt: null,
        endsAt: null,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean<PromotionDoc>();
  return toPromotion(doc);
}

export const mongoPromotionRepository: PromotionRepository = {
  async listAll() {
    const docs = await PromotionModel.find().sort(order).lean<PromotionDoc[]>();
    const brand = await ensureBrandSlide();
    return [brand, ...docs.filter((doc) => !doc._id.equals(BRAND_SLIDE_ID)).map(toPromotion)];
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
    const brand = await ensureBrandSlide();
    return [
      ...(brand.isActive && (!brand.startsAt || brand.startsAt <= now) && (!brand.endsAt || brand.endsAt > now) ? [brand] : []),
      ...docs.filter((doc) => !doc._id.equals(BRAND_SLIDE_ID)).map(toPromotion),
    ];
  },
  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await PromotionModel.findById(id).lean<PromotionDoc>();
    return doc ? toPromotion(doc) : null;
  },
  async create(data) {
    const doc = await PromotionModel.create({ ...data, kind: "promotion" });
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
