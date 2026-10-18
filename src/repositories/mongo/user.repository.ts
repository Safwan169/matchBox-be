import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { DuplicateError } from "../../domain/errors.js";
import type { User, UserWithPassword } from "../../domain/user.js";
import type { UserRepository } from "../types.js";
import { escapeRegex } from "./utils.js";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer", index: true },
    dateOfBirth: { type: Date, required: true },
  },
  { timestamps: true },
);

type UserDoc = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const UserModel = mongoose.model("User", userSchema);

function toUser(doc: UserDoc): User {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    role: doc.role,
    dateOfBirth: doc.dateOfBirth,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const isDuplicateKey = (err: unknown) =>
  typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;

export const mongoUserRepository: UserRepository = {
  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await UserModel.findById(id).lean<UserDoc>();
    return doc ? toUser(doc) : null;
  },
  async findByEmailWithPassword(email) {
    const doc = await UserModel.findOne({ email: email.toLowerCase().trim() }).lean<UserDoc>();
    return doc ? ({ ...toUser(doc), passwordHash: doc.passwordHash } satisfies UserWithPassword) : null;
  },
  async create(data) {
    try {
      const doc = await UserModel.create(data);
      return toUser(doc.toObject() as UserDoc);
    } catch (err) {
      if (isDuplicateKey(err)) throw new DuplicateError("email");
      throw err;
    }
  },
  async update(id, data) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await UserModel.findByIdAndUpdate(id, data, { returnDocument: "after", runValidators: true }).lean<UserDoc>();
    return doc ? toUser(doc) : null;
  },
  async setPasswordHash(id, passwordHash) {
    await UserModel.updateOne({ _id: id }, { passwordHash });
  },
  async list({ role, search, page, limit }) {
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
    }
    const [docs, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean<UserDoc[]>(),
      UserModel.countDocuments(filter),
    ]);
    return { items: docs.map(toUser), total, page, limit, totalPages: Math.ceil(total / limit) };
  },
  async count(role) {
    return UserModel.countDocuments(role ? { role } : {});
  },
};
