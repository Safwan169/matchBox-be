import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { DuplicateError } from "../../domain/errors.js";
import { ORDER_STATUSES, type Order, type OrderStatus } from "../../domain/order.js";
import type { OrderRepository } from "../types.js";
import { escapeRegex } from "./utils.js";

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    image: { type: String, default: null },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const addressSchema = new Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine: { type: String, required: true },
    area: { type: String, default: "" },
    city: { type: String, required: true },
    postalCode: { type: String, default: "" },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: "pending", index: true },
    paymentMethod: { type: String, enum: ["cod"], default: "cod" },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    shippingAddress: { type: addressSchema, required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);
orderSchema.index({ createdAt: -1 });

type OrderDoc = InferSchemaType<typeof orderSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const OrderModel = mongoose.model("Order", orderSchema);

function toOrder(doc: OrderDoc): Order {
  const a = doc.shippingAddress!;
  return {
    id: doc._id.toString(),
    orderNumber: doc.orderNumber,
    userId: doc.userId.toString(),
    items: doc.items.map((i) => ({
      productId: i.productId.toString(),
      name: i.name,
      slug: i.slug,
      image: i.image ?? null,
      price: i.price,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
    subtotal: doc.subtotal,
    shippingFee: doc.shippingFee,
    total: doc.total,
    status: doc.status,
    paymentMethod: doc.paymentMethod,
    paymentStatus: doc.paymentStatus,
    shippingAddress: {
      fullName: a.fullName,
      phone: a.phone,
      addressLine: a.addressLine,
      area: a.area,
      city: a.city,
      postalCode: a.postalCode,
    },
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const mongoOrderRepository: OrderRepository = {
  async create(data) {
    try {
      const doc = await OrderModel.create(data);
      return toOrder(doc.toObject() as OrderDoc);
    } catch (err) {
      if ((err as { code?: number }).code === 11000) throw new DuplicateError("orderNumber");
      throw err;
    }
  },
  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await OrderModel.findById(id).lean<OrderDoc>();
    return doc ? toOrder(doc) : null;
  },
  async list({ userId, status, search, page, limit }) {
    const filter: Record<string, unknown> = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ orderNumber: pattern }, { "shippingAddress.fullName": pattern }, { "shippingAddress.phone": pattern }];
    }
    const [docs, total] = await Promise.all([
      OrderModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean<OrderDoc[]>(),
      OrderModel.countDocuments(filter),
    ]);
    return { items: docs.map(toOrder), total, page, limit, totalPages: Math.ceil(total / limit) };
  },
  async updateStatus(id, from, update) {
    // Conditional on the current status so two concurrent changes can't both apply.
    const doc = await OrderModel.findOneAndUpdate({ _id: id, status: from }, update, {
      returnDocument: "after",
    }).lean<OrderDoc>();
    return doc ? toOrder(doc) : null;
  },
  async hasDeliveredPurchase(userId, productId) {
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(productId)) return false;
    const found = await OrderModel.exists({ userId, status: "delivered", "items.productId": productId });
    return found !== null;
  },
  async stats() {
    const rows = await OrderModel.aggregate<{ _id: OrderStatus; count: number; revenue: number }>([
      { $group: { _id: "$status", count: { $sum: 1 }, revenue: { $sum: "$total" } } },
    ]);
    const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
    let totalOrders = 0;
    let revenue = 0;
    for (const row of rows) {
      byStatus[row._id] = row.count;
      totalOrders += row.count;
      if (row._id !== "cancelled") revenue += row.revenue;
    }
    return { totalOrders, revenue, byStatus };
  },
  async countByUsers(userIds) {
    const ids = userIds.filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id));
    const rows = await OrderModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { userId: { $in: ids } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((r) => [r._id.toString(), r.count]));
  },
};
