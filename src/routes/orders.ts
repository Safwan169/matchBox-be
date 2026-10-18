import { Router } from "express";
import { z } from "zod";
import { shopConfig } from "../config/shop.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError, NotFoundError } from "../middleware/error-handler.js";
import { repositories } from "../repositories/index.js";
import { changeOrderStatus, placeOrder, quoteOrder } from "../services/orders.js";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

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
  phone: text(20).regex(/^[0-9+\-\s]{6,20}$/, "Invalid phone number"),
  addressLine: text(200).min(5),
  area: text(80).default(""),
  city: text(60).min(2),
  postalCode: text(12).default(""),
});

const quoteSchema = z.object({ items: linesSchema, city: text(60).default("") });

const placeSchema = z.object({
  items: linesSchema,
  shippingAddress: addressSchema,
  notes: text(500).default(""),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

ordersRouter.post("/quote", async (req, res) => {
  const { items, city } = quoteSchema.parse(req.body);
  res.json({ data: await quoteOrder(items, city) });
});

ordersRouter.post("/", async (req, res) => {
  const { items, shippingAddress, notes } = placeSchema.parse(req.body);
  const order = await placeOrder({ userId: req.user!.id, lines: items, shippingAddress, notes });
  res.status(201).json({ data: order });
});

ordersRouter.get("/", async (req, res) => {
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

ordersRouter.get("/:id", async (req, res) => {
  res.json({ data: await findVisibleOrder(req.params.id, req.user!) });
});

ordersRouter.post("/:id/cancel", async (req, res) => {
  const order = await findVisibleOrder(req.params.id, req.user!);
  if (order.status !== "pending") {
    throw new HttpError(409, "Only pending orders can be cancelled. Please contact us.");
  }
  res.json({ data: await changeOrderStatus(order, "cancelled") });
});
