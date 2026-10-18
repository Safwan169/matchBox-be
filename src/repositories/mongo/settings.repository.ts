import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { DEFAULT_SETTINGS, type StoreSettings } from "../../domain/settings.js";
import type { SettingsRepository } from "../types.js";

// A single document (key "store") holds the store settings.
const settingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    phone: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    facebookUrl: { type: String, default: "" },
  },
  { timestamps: true },
);

type SettingsDoc = InferSchemaType<typeof settingsSchema> & { updatedAt: Date };

const SettingsModel = mongoose.model("Settings", settingsSchema);
const KEY = "store";

function toSettings(doc: SettingsDoc | null): StoreSettings {
  if (!doc) return { ...DEFAULT_SETTINGS };
  return {
    phone: doc.phone,
    whatsapp: doc.whatsapp,
    email: doc.email,
    address: doc.address,
    facebookUrl: doc.facebookUrl,
    updatedAt: doc.updatedAt,
  };
}

export const mongoSettingsRepository: SettingsRepository = {
  async get() {
    return toSettings(await SettingsModel.findOne({ key: KEY }).lean<SettingsDoc>());
  },
  async update(data) {
    const doc = await SettingsModel.findOneAndUpdate(
      { key: KEY },
      { $set: data, $setOnInsert: { key: KEY } },
      { upsert: true, returnDocument: "after" },
    ).lean<SettingsDoc>();
    return toSettings(doc);
  },
};
