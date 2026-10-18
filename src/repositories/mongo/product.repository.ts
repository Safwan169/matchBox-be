import mongoose, { Schema, type InferSchemaType, type SortOrder } from "mongoose";
import type { Product } from "../../domain/product.js";
import type { ProductRepository, ProductSort } from "../types.js";
import { escapeRegex, rethrowDuplicate } from "./utils.js";

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    brand: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: null, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    images: { type: [String], default: [] },
    ageRestricted: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

type ProductDoc = InferSchemaType<typeof productSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const ProductModel = mongoose.model("Product", productSchema);

const sortMap: Record<ProductSort, Record<string, SortOrder>> = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  name_asc: { name: 1 },
};

function toProduct(doc: ProductDoc): Product {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    categoryId: doc.categoryId.toString(),
    brand: doc.brand,
    price: doc.price,
    compareAtPrice: doc.compareAtPrice ?? null,
    stock: doc.stock,
    images: doc.images,
    ageRestricted: doc.ageRestricted,
    isFeatured: doc.isFeatured,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const mongoProductRepository: ProductRepository = {
  async list({ categoryId, search, featured, excludeIds, status = "active", sort, page, limit }) {
    const filter: Record<string, unknown> = {};
    if (status !== "all") filter.isActive = status === "active";
    if (categoryId) {
      // An invalid id can't match anything, so return an empty page instead of a cast error.
      if (!mongoose.isValidObjectId(categoryId)) {
        return { items: [], total: 0, page, limit, totalPages: 0 };
      }
      filter.categoryId = categoryId;
    }
    if (featured !== undefined) filter.isFeatured = featured;
    if (excludeIds?.length) filter._id = { $nin: excludeIds.filter((id) => mongoose.isValidObjectId(id)) };
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: pattern }, { brand: pattern }];
    }

    const [docs, total] = await Promise.all([
      ProductModel.find(filter)
        .sort(sortMap[sort])
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<ProductDoc[]>(),
      ProductModel.countDocuments(filter),
    ]);

    return {
      items: docs.map(toProduct),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },
  async findBySlug(slug) {
    const doc = await ProductModel.findOne({ slug, isActive: true }).lean<ProductDoc>();
    return doc ? toProduct(doc) : null;
  },
  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await ProductModel.findById(id).lean<ProductDoc>();
    return doc ? toProduct(doc) : null;
  },
  async findByIds(ids) {
    const valid = ids.filter((id) => mongoose.isValidObjectId(id));
    const docs = await ProductModel.find({ _id: { $in: valid } }).lean<ProductDoc[]>();
    return docs.map(toProduct);
  },
  async create(data) {
    try {
      const doc = await ProductModel.create(data);
      return toProduct(doc.toObject() as ProductDoc);
    } catch (err) {
      rethrowDuplicate(err, "slug");
    }
  },
  async update(id, data) {
    if (!mongoose.isValidObjectId(id)) return null;
    try {
      const doc = await ProductModel.findByIdAndUpdate(id, data, {
        returnDocument: "after",
        runValidators: true,
      }).lean<ProductDoc>();
      return doc ? toProduct(doc) : null;
    } catch (err) {
      rethrowDuplicate(err, "slug");
    }
  },
  async delete(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    const result = await ProductModel.deleteOne({ _id: id });
    return result.deletedCount === 1;
  },
  async countByCategory(categoryId) {
    if (!mongoose.isValidObjectId(categoryId)) return 0;
    return ProductModel.countDocuments({ categoryId });
  },
  async count() {
    return ProductModel.countDocuments();
  },
  async listLowStock(threshold, limit) {
    const docs = await ProductModel.find({ isActive: true, stock: { $lte: threshold } })
      .sort({ stock: 1, name: 1 })
      .limit(limit)
      .lean<ProductDoc[]>();
    return docs.map(toProduct);
  },
  async decrementStock(id, quantity) {
    // The stock condition and the decrement happen in one atomic update.
    const result = await ProductModel.updateOne(
      { _id: id, isActive: true, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
    );
    return result.modifiedCount === 1;
  },
  async incrementStock(id, quantity) {
    await ProductModel.updateOne({ _id: id }, { $inc: { stock: quantity } });
  },
};
