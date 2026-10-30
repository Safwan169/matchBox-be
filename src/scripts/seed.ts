// Seeds sample categories and products. Uses the repositories (not Mongoose directly),
// so it works unchanged once PostgreSQL is implemented. Safe to re-run: existing slugs are skipped.
import { connectDatabase, disconnectDatabase } from "../db/index.js";
import type { NewCategory } from "../domain/category.js";
import type { NewProduct } from "../domain/product.js";
import { repositories } from "../repositories/index.js";

const categories: NewCategory[] = [
  { name: "Cigarettes", slug: "cigarettes", description: "Cigarette packs and cartons.", image: null, sortOrder: 1, isActive: true },
  { name: "Lighters", slug: "lighters", description: "Disposable, refillable and windproof lighters.", image: null, sortOrder: 2, isActive: true },
  { name: "Accessories", slug: "accessories", description: "Ashtrays, cases, rolling papers and more.", image: null, sortOrder: 3, isActive: true },
];

type SeedProduct = Omit<NewProduct, "categoryId"> & { category: string };

const base = { images: [], ageRestricted: true, isActive: true, compareAtPrice: null, maxPerOrder: null };

const products: SeedProduct[] = [
  { ...base, category: "cigarettes", name: "Classic Red — Pack of 20", slug: "classic-red-20", brand: "Sample", description: "Full-flavour classic, pack of 20.", price: 36000, stock: 120, isFeatured: true },
  { ...base, category: "cigarettes", name: "Smooth Gold — Pack of 20", slug: "smooth-gold-20", brand: "Sample", description: "Smooth, lighter taste, pack of 20.", price: 34000, stock: 80, isFeatured: false },
  { ...base, category: "cigarettes", name: "Menthol Fresh — Pack of 20", slug: "menthol-fresh-20", brand: "Sample", description: "Cool menthol, pack of 20.", price: 35000, stock: 60, isFeatured: true },
  { ...base, category: "lighters", name: "Disposable Lighter", slug: "disposable-lighter", brand: "Sample", description: "Reliable everyday gas lighter.", price: 3000, stock: 500, isFeatured: false },
  { ...base, category: "lighters", name: "Windproof Metal Lighter", slug: "windproof-metal-lighter", brand: "Sample", description: "Refillable brushed-steel windproof lighter.", price: 95000, compareAtPrice: 120000, stock: 25, isFeatured: true },
  { ...base, category: "lighters", name: "Jet Torch Lighter", slug: "jet-torch-lighter", brand: "Sample", description: "Refillable butane jet flame lighter.", price: 45000, stock: 40, isFeatured: false },
  { ...base, category: "accessories", name: "Ceramic Ashtray", slug: "ceramic-ashtray", brand: "MatchBox", description: "Heavy ceramic ashtray in brand red.", price: 55000, stock: 30, isFeatured: true },
  { ...base, category: "accessories", name: "Cigarette Case", slug: "cigarette-case", brand: "MatchBox", description: "Slim metal case, holds 20.", price: 65000, stock: 20, isFeatured: false },
  { ...base, category: "accessories", name: "Safety Matches — 10 Boxes", slug: "safety-matches-10", brand: "MatchBox", description: "The classic. Ten boxes of safety matches.", price: 5000, stock: 200, isFeatured: false },
];

async function seed() {
  await connectDatabase();

  const categoryIds = new Map<string, string>();
  for (const data of categories) {
    const existing = await repositories.categories.findBySlug(data.slug);
    const category = existing ?? (await repositories.categories.create(data));
    categoryIds.set(category.slug, category.id);
    console.log(`${existing ? "skip" : "add "} category  ${category.slug}`);
  }

  for (const { category, ...data } of products) {
    const categoryId = categoryIds.get(category);
    if (!categoryId) throw new Error(`Unknown category "${category}" for ${data.slug}`);
    const existing = await repositories.products.findBySlug(data.slug);
    if (!existing) await repositories.products.create({ ...data, categoryId });
    console.log(`${existing ? "skip" : "add "} product   ${data.slug}`);
  }

  await disconnectDatabase();
}

seed().catch(async (err) => {
  console.error(err);
  await disconnectDatabase();
  process.exit(1);
});
