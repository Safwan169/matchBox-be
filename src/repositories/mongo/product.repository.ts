import mongoose, { Schema, type InferSchemaType } from "mongoose";
import type { Product } from "../../domain/product.js";
import type { ProductRepository } from "../types.js";

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    images: { type: [String], default: [] },
    ageRestricted: { type: Boolean, default: true },
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

function toProduct(doc: ProductDoc): Product {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    category: doc.category,
    price: doc.price,
    stock: doc.stock,
    images: doc.images,
    ageRestricted: doc.ageRestricted,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const mongoProductRepository: ProductRepository = {
  async findAll() {
    const docs = await ProductModel.find({ isActive: true }).lean<ProductDoc[]>();
    return docs.map(toProduct);
  },
  async findBySlug(slug) {
    const doc = await ProductModel.findOne({ slug }).lean<ProductDoc>();
    return doc ? toProduct(doc) : null;
  },
  async create(data) {
    const doc = await ProductModel.create(data);
    return toProduct(doc.toObject() as ProductDoc);
  },
};
