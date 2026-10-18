import mongoose, { Schema, type InferSchemaType } from "mongoose";
import type { Category } from "../../domain/category.js";
import type { CategoryRepository } from "../types.js";
import { rethrowDuplicate } from "./utils.js";

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
  async findAll({ includeInactive = false } = {}) {
    const docs = await CategoryModel.find(includeInactive ? {} : { isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean<CategoryDoc[]>();
    return docs.map(toCategory);
  },
  async findBySlug(slug) {
    const doc = await CategoryModel.findOne({ slug, isActive: true }).lean<CategoryDoc>();
    return doc ? toCategory(doc) : null;
  },
  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await CategoryModel.findById(id).lean<CategoryDoc>();
    return doc ? toCategory(doc) : null;
  },
  async create(data) {
    try {
      const doc = await CategoryModel.create(data);
      return toCategory(doc.toObject() as CategoryDoc);
    } catch (err) {
      rethrowDuplicate(err, "slug");
    }
  },
  async update(id, data) {
    if (!mongoose.isValidObjectId(id)) return null;
    try {
      const doc = await CategoryModel.findByIdAndUpdate(id, data, {
        returnDocument: "after",
        runValidators: true,
      }).lean<CategoryDoc>();
      return doc ? toCategory(doc) : null;
    } catch (err) {
      rethrowDuplicate(err, "slug");
    }
  },
  async delete(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    const result = await CategoryModel.deleteOne({ _id: id });
    return result.deletedCount === 1;
  },
};
