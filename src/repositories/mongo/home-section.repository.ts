import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { HOME_SECTION_TYPES, type HomeSection } from "../../domain/home-section.js";
import type { HomeSectionRepository } from "../types.js";

const homeSectionSchema = new Schema(
  {
    type: { type: String, enum: HOME_SECTION_TYPES, required: true },
    title: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    config: {
      limit: Number,
      categoryId: String,
      image: String,
      link: String,
      body: String,
    },
  },
  { timestamps: true, minimize: false },
);

type HomeSectionDoc = InferSchemaType<typeof homeSectionSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const HomeSectionModel = mongoose.model("HomeSection", homeSectionSchema);

function toSection(doc: HomeSectionDoc): HomeSection {
  const c = doc.config ?? {};
  // Drop unset keys so the config only carries what the section uses.
  const config = Object.fromEntries(
    Object.entries({ limit: c.limit, categoryId: c.categoryId, image: c.image, link: c.link, body: c.body }).filter(
      ([, v]) => v !== undefined && v !== null,
    ),
  );
  return {
    id: doc._id.toString(),
    type: doc.type,
    title: doc.title,
    isActive: doc.isActive,
    sortOrder: doc.sortOrder,
    config,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const order = { sortOrder: 1, createdAt: 1 } as const;

export const mongoHomeSectionRepository: HomeSectionRepository = {
  async listAll() {
    const docs = await HomeSectionModel.find().sort(order).lean<HomeSectionDoc[]>();
    return docs.map(toSection);
  },
  async count() {
    return HomeSectionModel.countDocuments();
  },
  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await HomeSectionModel.findById(id).lean<HomeSectionDoc>();
    return doc ? toSection(doc) : null;
  },
  async createMany(data) {
    const docs = await HomeSectionModel.insertMany(data);
    return docs.map((d) => toSection(d.toObject() as HomeSectionDoc));
  },
  async update(id, data) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await HomeSectionModel.findByIdAndUpdate(id, data, {
      returnDocument: "after",
      runValidators: true,
    }).lean<HomeSectionDoc>();
    return doc ? toSection(doc) : null;
  },
  async delete(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    const result = await HomeSectionModel.deleteOne({ _id: id });
    return result.deletedCount === 1;
  },
  async reorder(ids) {
    await HomeSectionModel.bulkWrite(
      ids.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { sortOrder: index } } })),
    );
  },
};
