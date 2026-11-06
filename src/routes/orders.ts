import { Router } from "express";
import { z } from "zod";
import { shopConfig } from "../config/shop.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError, NotFoundError } from "../middleware/error-handler.js";
import { orderLimiter, quoteLimiter } from "../middleware/rate-limit.js";
import { repositories } from "../repositories/index.js";
import { changeOrderStatus, placeOrder, quoteOrder } from "../services/orders.js";
import { bdPhone } from "../utils/validation.js";

export const ordersRouter = Router();
const linesSchema = z
  .array(
    z.object({
      productId: z.string().min(1).max(64),
      quantity: z.number().int().min(1).max(shopConfig.maxQuantityPerItem),
    }),
  )
  .min(1, "Your cart is empty")
  .max(50);

const text = (max: number) => z.string().trim().max(max);

const addressSchema = z.object({
  fullName: text(80).min(2),
  phone: bdPhone,
  addressLine: text(200).default(""),
  area: text(80).default(""),
  city: text(60).default("Dhaka"),
  postalCode: text(12).default(""),
});

const quoteSchema = z.object({ items: linesSchema, city: text(60).default("") });

const placeSchema = z.object({
  items: linesSchema,
  shippingAddress: addressSchema,
  notes: text(500).default(""),
  // Remember this address as the account's default for next time.
  saveAddress: z.boolean().default(true),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

ordersRouter.post("/quote", quoteLimiter, async (req, res) => {
  const { items, city } = quoteSchema.parse(req.body);
  res.json({ data: await quoteOrder(items, city) });
});

ordersRouter.post("/", orderLimiter, async (req, res) => {
  const { items, shippingAddress, notes, saveAddress } = placeSchema.parse(req.body);
  const user = req.user;
  const order = await placeOrder({ userId: user?.id ?? null, lines: items, shippingAddress, notes });

  if (saveAddress && user && shippingAddress.addressLine.length >= 5) {
    const { addressLine, area, city, postalCode, phone } = shippingAddress;
    await repositories.users.update(user.id, {
      address: { addressLine, area, city, postalCode },
      // Fill in the account phone for older accounts that don't have one yet.
      ...(user.phone ? {} : { phone }),
    });
  }
  res.status(201).json({ data: order });
});

ordersRouter.get("/", requireAuth, async (req, res) => {
  const { page, limit } = listSchema.parse(req.query);
  const { items, ...meta } = await repositories.orders.list({ userId: req.user!.id, page, limit });
  res.json({ data: items, meta });
});

// Customers can only see their own orders; admins can see any.
async function findVisibleOrder(id: string, user: NonNullable<Express.Request["user"]>) {
  const order = await repositories.orders.findById(id);
  if (!order || (order.userId !== user.id && user.role !== "admin")) {
    throw new NotFoundError("Order not found");
  }
  return order;
}

ordersRouter.get("/:id", requireAuth, async (req, res) => {
  res.json({ data: await findVisibleOrder(req.params.id as string, req.user!) });
});

ordersRouter.post("/:id/cancel", requireAuth, async (req, res) => {
  const order = await findVisibleOrder(req.params.id as string, req.user!);
  if (order.status !== "pending") {
    throw new HttpError(409, "Only pending orders can be cancelled. Please contact us.");
  }
  res.json({ data: await changeOrderStatus(order, "cancelled") });
});
