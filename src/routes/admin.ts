import { Router } from "express";
import { z } from "zod";
import { ORDER_STATUSES } from "../domain/order.js";
import { requireAdmin } from "../middleware/auth.js";
import { uploadLimiter } from "../middleware/rate-limit.js";
import { HttpError, NotFoundError } from "../middleware/error-handler.js";
import { repositories } from "../repositories/index.js";
import { changeOrderStatus } from "../services/orders.js";
import { refreshProductRating } from "../services/reviews.js";
import { finalizeUpload, imageUpload } from "../services/uploads.js";
import { SLUG_PATTERN, slugify } from "../utils/slugify.js";
import { optionalBdPhone } from "../utils/validation.js";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const LOW_STOCK_THRESHOLD = 5;

const pageSchema = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};
const optionalText = z.string().trim().min(1).max(100).optional();
const slug = z.string().trim().toLowerCase().regex(SLUG_PATTERN, "Use lowercase letters, numbers and dashes");
// Images are our own uploads or absolute https URLs.
const imagePath = z.string().trim().regex(/^(\/uploads\/[\w.-]+|https:\/\/\S+)$/, "Invalid image URL");
const money = z.number().int("Amount must be in poisha (whole number)").min(0).max(100_000_000);

// ---------- Dashboard ----------

adminRouter.get("/stats", async (_req, res) => {
  const [orders, customers, products, lowStock, recent] = await Promise.all([
    repositories.orders.stats(),
    repositories.users.count("customer"),
    repositories.products.count(),
    repositories.products.listLowStock(LOW_STOCK_THRESHOLD, 10),
    repositories.orders.list({ page: 1, limit: 5 }),
  ]);
  res.json({ data: { orders, customers, products, lowStock, recentOrders: recent.items } });
});

// ---------- Uploads ----------

adminRouter.post("/uploads", uploadLimiter, imageUpload.single("image"), async (req, res) => {
  const url = await finalizeUpload(req.file);
  res.status(201).json({ data: { url } });
});

// ---------- Categories ----------

const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: slug.optional(),
  description: z.string().trim().max(500).default(""),
  image: imagePath.nullable().default(null),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

adminRouter.get("/categories", async (_req, res) => {
  const categories = await repositories.categories.findAll({ includeInactive: true });
  const counts = await Promise.all(categories.map((c) => repositories.products.countByCategory(c.id)));
  res.json({ data: categories.map((c, i) => ({ ...c, productCount: counts[i] })) });
});

adminRouter.post("/categories", async (req, res) => {
  const data = categorySchema.parse(req.body);
  const category = await repositories.categories.create({ ...data, slug: data.slug ?? slugify(data.name) });
  res.status(201).json({ data: category });
});

adminRouter.patch("/categories/:id", async (req, res) => {
  const data = categorySchema.partial().parse(req.body);
  const category = await repositories.categories.update(req.params.id, data);
  if (!category) throw new NotFoundError("Category not found");
  res.json({ data: category });
});

adminRouter.delete("/categories/:id", async (req, res) => {
  const inUse = await repositories.products.countByCategory(req.params.id);
  if (inUse > 0) {
    throw new HttpError(409, `This category has ${inUse} product(s). Move or delete them first, or hide the category.`);
  }
  if (!(await repositories.categories.delete(req.params.id))) throw new NotFoundError("Category not found");
  res.status(204).end();
});

// ---------- Products ----------

const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slug.optional(),
  description: z.string().trim().max(5000).default(""),
  categoryId: z.string().min(1),
  brand: z.string().trim().max(80).default(""),
  price: money,
  compareAtPrice: money.nullable().default(null),
  stock: z.number().int().min(0).max(1_000_000),
  images: z.array(imagePath).max(10).default([]),
  ageRestricted: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

async function assertCategoryExists(categoryId: string | undefined) {
  if (categoryId && !(await repositories.categories.findById(categoryId))) {
    throw new HttpError(400, "Category does not exist");
  }
}

const productListSchema = z.object({
  ...pageSchema,
  search: optionalText,
  categoryId: optionalText,
  status: z.enum(["active", "inactive", "all"]).default("all"),
  sort: z.enum(["newest", "price_asc", "price_desc", "name_asc"]).default("newest"),
});

adminRouter.get("/products", async (req, res) => {
  const query = productListSchema.parse(req.query);
  const { items, ...meta } = await repositories.products.list(query);
  res.json({ data: items, meta });
});

adminRouter.get("/products/:id", async (req, res) => {
  const product = await repositories.products.findById(req.params.id);
  if (!product) throw new NotFoundError("Product not found");
  res.json({ data: product });
});

adminRouter.post("/products", async (req, res) => {
  const data = productSchema.parse(req.body);
  await assertCategoryExists(data.categoryId);
  const product = await repositories.products.create({ ...data, slug: data.slug ?? slugify(data.name) });
  res.status(201).json({ data: product });
});

adminRouter.patch("/products/:id", async (req, res) => {
  // .partial() on the base shape so defaults don't overwrite fields that weren't sent.
  const data = productSchema
    .extend({
      description: z.string().trim().max(5000),
      brand: z.string().trim().max(80),
      compareAtPrice: money.nullable(),
      images: z.array(imagePath).max(10),
      ageRestricted: z.boolean(),
      isFeatured: z.boolean(),
      isActive: z.boolean(),
    })
    .partial()
    .parse(req.body);
  await assertCategoryExists(data.categoryId);
  const product = await repositories.products.update(req.params.id, data);
  if (!product) throw new NotFoundError("Product not found");
  res.json({ data: product });
});

adminRouter.delete("/products/:id", async (req, res) => {
  // Past orders keep their own copy of product details, so deleting is safe for history.
  if (!(await repositories.products.delete(req.params.id))) throw new NotFoundError("Product not found");
  res.status(204).end();
});

// ---------- Orders ----------

const orderListSchema = z.object({
  ...pageSchema,
  status: z.enum(ORDER_STATUSES).optional(),
  search: optionalText,
});

adminRouter.get("/orders", async (req, res) => {
  const query = orderListSchema.parse(req.query);
  const { items, ...meta } = await repositories.orders.list(query);
  res.json({ data: items, meta });
});

adminRouter.get("/orders/:id", async (req, res) => {
  const order = await repositories.orders.findById(req.params.id);
  if (!order) throw new NotFoundError("Order not found");
  const customer = await repositories.users.findById(order.userId);
  res.json({ data: { ...order, customer } });
});

adminRouter.patch("/orders/:id/status", async (req, res) => {
  const { status } = z.object({ status: z.enum(ORDER_STATUSES) }).parse(req.body);
  const order = await repositories.orders.findById(req.params.id);
  if (!order) throw new NotFoundError("Order not found");
  res.json({ data: await changeOrderStatus(order, status) });
});

// ---------- Promotions (home page hero banners) ----------

// Internal path ("/products/x") or an https URL. "//evil.com" is rejected.
const promotionLink = z.union([
  z.literal(""),
  z.string().trim().max(500).regex(/^(\/(?!\/)\S*|https:\/\/\S+)$/, "Use a page path like /products/... or an https:// link"),
]);
const optionalDate = z.iso.datetime({ offset: true }).transform((d) => new Date(d)).nullable();

const promotionFields = {
  title: z.string().trim().min(2).max(100),
  subtitle: z.string().trim().max(200),
  image: imagePath,
  buttonText: z.string().trim().max(40),
  link: promotionLink,
  showText: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
  startsAt: optionalDate,
  endsAt: optionalDate,
};

const checkDates = (p: { startsAt?: Date | null; endsAt?: Date | null }) =>
  !p.startsAt || !p.endsAt || p.endsAt > p.startsAt;
const DATES_MESSAGE = "End date must be after the start date";

const createPromotionSchema = z
  .object({
    ...promotionFields,
    subtitle: promotionFields.subtitle.default(""),
    buttonText: promotionFields.buttonText.default(""),
    link: promotionLink.default(""),
    showText: promotionFields.showText.default(true),
    sortOrder: promotionFields.sortOrder.default(0),
    isActive: promotionFields.isActive.default(true),
    startsAt: optionalDate.default(null),
    endsAt: optionalDate.default(null),
  })
  .refine(checkDates, { error: DATES_MESSAGE, path: ["endsAt"] });

const updatePromotionSchema = z.object(promotionFields).partial();

adminRouter.get("/promotions", async (_req, res) => {
  res.json({ data: await repositories.promotions.listAll() });
});

adminRouter.post("/promotions", async (req, res) => {
  const data = createPromotionSchema.parse(req.body);
  res.status(201).json({ data: await repositories.promotions.create(data) });
});

adminRouter.patch("/promotions/:id", async (req, res) => {
  const data = updatePromotionSchema.parse(req.body);
  const existing = await repositories.promotions.findById(req.params.id);
  if (!existing) throw new NotFoundError("Promotion not found");
  if (!checkDates({ ...existing, ...data })) throw new HttpError(400, DATES_MESSAGE);
  res.json({ data: await repositories.promotions.update(req.params.id, data) });
});

adminRouter.delete("/promotions/:id", async (req, res) => {
  if (!(await repositories.promotions.delete(req.params.id))) throw new NotFoundError("Promotion not found");
  res.status(204).end();
});

// ---------- Reviews (moderation) ----------

const reviewListSchema = z.object({ ...pageSchema, status: z.enum(["published", "hidden"]).optional() });

adminRouter.get("/reviews", async (req, res) => {
  const query = reviewListSchema.parse(req.query);
  const { items, ...meta } = await repositories.reviews.list(query);
  // Attach product names for display.
  const products = await repositories.products.findByIds([...new Set(items.map((r) => r.productId))]);
  const byId = new Map(products.map((p) => [p.id, { name: p.name, slug: p.slug }]));
  res.json({ data: items.map((r) => ({ ...r, product: byId.get(r.productId) ?? null })), meta });
});

adminRouter.patch("/reviews/:id", async (req, res) => {
  const { status } = z.object({ status: z.enum(["published", "hidden"]) }).parse(req.body);
  const review = await repositories.reviews.setStatus(req.params.id, status);
  if (!review) throw new NotFoundError("Review not found");
  await refreshProductRating(review.productId);
  res.json({ data: review });
});

adminRouter.delete("/reviews/:id", async (req, res) => {
  const review = await repositories.reviews.findById(req.params.id);
  if (!review) throw new NotFoundError("Review not found");
  await repositories.reviews.delete(review.id);
  await refreshProductRating(review.productId);
  res.status(204).end();
});

// ---------- Store settings ----------

const settingsSchema = z
  .object({
    phone: optionalBdPhone,
    whatsapp: optionalBdPhone,
    email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(254)]),
    address: z.string().trim().max(300),
    facebookUrl: z.union([
      z.literal(""),
      z.string().trim().max(300).regex(/^https:\/\/(www\.|m\.)?(facebook|fb)\.com\/\S+$/, "Use a https://facebook.com/… link"),
    ]),
  })
  .partial();

adminRouter.get("/settings", async (_req, res) => {
  res.json({ data: await repositories.settings.get() });
});

adminRouter.patch("/settings", async (req, res) => {
  const data = settingsSchema.parse(req.body);
  res.json({ data: await repositories.settings.update(data) });
});

// ---------- Customers ----------

const customerListSchema = z.object({ ...pageSchema, search: optionalText });

adminRouter.get("/customers", async (req, res) => {
  const { search, page, limit } = customerListSchema.parse(req.query);
  const { items, ...meta } = await repositories.users.list({ role: "customer", search, page, limit });
  const orderCounts = await repositories.orders.countByUsers(items.map((u) => u.id));
  res.json({ data: items.map((u) => ({ ...u, orderCount: orderCounts[u.id] ?? 0 })), meta });
});
