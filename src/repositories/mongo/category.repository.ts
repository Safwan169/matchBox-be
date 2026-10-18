import mongoose, { Schema, type InferSchemaType } from "mongoose";
import type { Category } from "../../domain/category.js";
import type { CategoryRepository } from "../types.js";

const categorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    image: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

type CategoryDoc = InferSchemaType<typeof categorySchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const CategoryModel = mongoose.model("Category", categorySchema);

function toCategory(doc: CategoryDoc): Category {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    image: doc.image ?? null,
    sortOrder: doc.sortOrder,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const mongoCategoryRepository: CategoryRepository = {
  async findAll() {
    const docs = await CategoryModel.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean<CategoryDoc[]>();
    return docs.map(toCategory);
  },
  async findBySlug(slug) {
    const doc = await CategoryModel.findOne({ slug, isActive: true }).lean<CategoryDoc>();
    return doc ? toCategory(doc) : null;
  },
  async create(data) {
    const doc = await CategoryModel.create(data);
    return toCategory(doc.toObject() as CategoryDoc);
  },
};
