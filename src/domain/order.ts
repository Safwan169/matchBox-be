export const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type PaymentMethod = "cod"; // cash on delivery; online gateways can be added later
export type PaymentStatus = "unpaid" | "paid";

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine: string;
  area: string;
  city: string;
  postalCode: string;
}

// Product details are copied onto the order so later product edits don't change history.
export interface OrderItem {
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  price: number; // poisha, at time of purchase
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingAddress: ShippingAddress;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NewOrder = Omit<Order, "id" | "createdAt" | "updatedAt">;

// Allowed status changes. Cancelled and delivered are final.
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
