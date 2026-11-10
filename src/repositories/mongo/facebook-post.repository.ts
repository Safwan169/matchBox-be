import mongoose, { Schema, type InferSchemaType } from "mongoose";
import type { FacebookPost } from "../../domain/facebook-post.js";
import type { FacebookPostRepository } from "../types.js";

const facebookPostSchema = new Schema(
  {
    facebookPostId: { type: String, required: true, unique: true },
    postUrl: { type: String, required: true },
    productIds: { type: [String], required: true },
    productNames: { type: [String], required: true },
    message: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

type FacebookPostDoc = InferSchemaType<typeof facebookPostSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

const FacebookPostModel = mongoose.model("FacebookPost", facebookPostSchema);

function toFacebookPost(doc: FacebookPostDoc): FacebookPost {
  return {
    id: doc._id.toString(),
    facebookPostId: doc.facebookPostId,
    postUrl: doc.postUrl,
    productIds: doc.productIds,
    productNames: doc.productNames,
    productCount: doc.productIds.length,
    message: doc.message,
    createdAt: doc.createdAt,
  };
}

export const mongoFacebookPostRepository: FacebookPostRepository = {
  async create(data) {
    const doc = await FacebookPostModel.create(data);
    return toFacebookPost(doc.toObject() as FacebookPostDoc);
  },
  async list(limit) {
    const docs = await FacebookPostModel.find().sort({ createdAt: -1 }).limit(limit).lean<FacebookPostDoc[]>();
    return docs.map(toFacebookPost);
  },
  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await FacebookPostModel.findById(id).lean<FacebookPostDoc>();
    return doc ? toFacebookPost(doc) : null;
  },
  async delete(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    const result = await FacebookPostModel.deleteOne({ _id: id });
    return result.deletedCount === 1;
  },
};
