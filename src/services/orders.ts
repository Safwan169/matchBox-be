import { randomInt } from "node:crypto";
import { deliveryFee } from "../config/shop.js";
import { DuplicateError } from "../domain/errors.js";
import {
  STATUS_TRANSITIONS,
  type Order,
  type OrderItem,
  type OrderStatus,
  type ShippingAddress,
} from "../domain/order.js";
import { HttpError } from "../middleware/error-handler.js";
import { repositories } from "../repositories/index.js";

export interface CartLine {
  productId: string;
  quantity: number;
}

interface PricedCart {
  items: OrderItem[];
  subtotal: number;
}

/** Merge duplicate lines for the same product. */
function mergeLines(lines: CartLine[]): CartLine[] {
  const merged = new Map<string, number>();
  for (const { productId, quantity } of lines) {
    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

/** Prices a cart from the database. Client-sent prices are never trusted. */
async function priceCart(lines: CartLine[]): Promise<PricedCart> {
  const merged = mergeLines(lines);
  const products = await repositories.products.findByIds(merged.map((l) => l.productId));
  const byId = new Map(products.map((p) => [p.id, p]));

  const items: OrderItem[] = merged.map(({ productId, quantity }) => {
    const product = byId.get(productId);
    if (!product || !product.isActive) {
      throw new HttpError(409, "A product in your cart is no longer available");
    }
    if (product.price === null) {
      throw new HttpError(409, `${product.name} can't be ordered yet (price on request)`);
    }
    if (product.maxPerOrder !== null && quantity > product.maxPerOrder) {
      throw new HttpError(409, `You can buy at most ${product.maxPerOrder} of ${product.name} per order`);
    }
    if (product.stock < quantity) {
      throw new HttpError(
        409,
        product.stock === 0 ? `${product.name} is out of stock` : `Only ${product.stock} of ${product.name} left in stock`,
      );
    }
    return {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: product.images[0] ?? null,
      price: product.price,
      quantity,
      lineTotal: product.price * quantity,
    };
  });

  return { items, subtotal: items.reduce((sum, i) => sum + i.lineTotal, 0) };
}

export async function quoteOrder(lines: CartLine[], city: string) {
  const { items, subtotal } = await priceCart(lines);
  const shippingFee = deliveryFee(subtotal, city);
  return { items, subtotal, shippingFee, total: subtotal + shippingFee };
}

function generateOrderNumber() {
  const d = new Date();
  const date = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  const suffix = Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return `MB-${date}-${suffix}`;
}

async function releaseStock(items: Pick<OrderItem, "productId" | "quantity">[]) {
  await Promise.all(items.map((i) => repositories.products.incrementStock(i.productId, i.quantity)));
}

export async function placeOrder(input: {
  userId: string;
  lines: CartLine[];
  shippingAddress: ShippingAddress;
  notes: string;
}): Promise<Order> {
  const { items, subtotal } = await priceCart(input.lines);

  // Reserve stock item by item; undo what was taken if any item runs out meanwhile.
  const reserved: OrderItem[] = [];
  for (const item of items) {
    const ok = await repositories.products.decrementStock(item.productId, item.quantity);
    if (!ok) {
      await releaseStock(reserved);
      throw new HttpError(409, `${item.name} just sold out. Please update your cart.`);
    }
    reserved.push(item);
  }

  const shippingFee = deliveryFee(subtotal, input.shippingAddress.city);
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        return await repositories.orders.create({
          orderNumber: generateOrderNumber(),
          userId: input.userId,
          items,
          subtotal,
          shippingFee,
          total: subtotal + shippingFee,
          status: "pending",
          paymentMethod: "cod",
          paymentStatus: "unpaid",
          shippingAddress: input.shippingAddress,
          notes: input.notes,
        });
      } catch (err) {
        if (err instanceof DuplicateError && attempt < 3) continue;
        throw err;
      }
    }
  } catch (err) {
    await releaseStock(reserved);
    throw err;
  }
}

/** Moves an order to a new status, enforcing allowed transitions and restocking on cancel. */
export async function changeOrderStatus(order: Order, to: OrderStatus): Promise<Order> {
  if (!STATUS_TRANSITIONS[order.status].includes(to)) {
    throw new HttpError(409, `Cannot change an order from ${order.status} to ${to}`);
  }

  // Cash on delivery is collected when the order is delivered.
  const paymentStatus = to === "delivered" ? "paid" : undefined;
  const updated = await repositories.orders.updateStatus(order.id, order.status, { status: to, paymentStatus });
  if (!updated) throw new HttpError(409, "The order was changed by someone else. Please refresh.");

  if (to === "cancelled") await releaseStock(order.items);
  return updated;
}
