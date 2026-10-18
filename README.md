# MatchBox — Backend API

The REST API for the MatchBox store. It's built with Express 5, TypeScript and Zod, and stores
data in MongoDB. It is designed to move to PostgreSQL later.

Frontend repo: [matchBox-fe](https://github.com/Safwan169/matchBox-fe)

## Setup

Requirements: Node.js 22+ and MongoDB.

```bash
cp .env.example .env        # then set JWT_SECRET to a long random string
npm install
npm run seed                # optional: sample categories and products
npm run create-admin -- --email you@example.com --password "a-strong-password" --name "Owner"
npm run dev                 # http://localhost:4000
```

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start with auto-reload (tsx) |
| `npm run build` / `npm start` | Compile to `dist/` and run it |
| `npm run typecheck` | Type-check only |
| `npm run seed` | Add sample data. Safe to run again. |
| `npm run create-admin -- --email … --password … --name …` | Create a new admin, or promote an existing user to admin |

## Environment variables

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default `4000`) |
| `NODE_ENV` | `development` or `production`. In production, cookies are only sent over HTTPS (`Secure`). |
| `CORS_ORIGIN` | Storefront URL, e.g. `http://localhost:3000` |
| `JWT_SECRET` | Secret used to sign session tokens. At least 32 characters. |
| `JWT_EXPIRES_DAYS` | How many days a login lasts (default `7`) |
| `DB_CLIENT` | `mongo` (now) or `postgres` (not yet implemented) |
| `MONGO_URI` / `DATABASE_URL` | Database connection strings |

## Architecture

```
src/
├── config/        env validation (env.ts), store rules such as delivery fees (shop.ts)
├── domain/        plain types and business rules (Product, Order, User, …) with no database code
├── repositories/  data-access interfaces (types.ts), plus mongo/ and postgres/ implementations
├── services/      orders (pricing, stock, status changes), session cookies, uploads
├── middleware/    auth (authenticate, requireAuth, requireAdmin) and the error handler
├── routes/        Express routers
└── scripts/       seed, create-admin
```

Routes and services only use `repositories` (from `repositories/index.ts`) and the domain
types. Mongoose is only imported inside `db/mongo` and `repositories/mongo`.

### Switching to PostgreSQL

1. Add a driver or ORM (e.g. `pg` with Drizzle or Prisma).
2. Implement `db/postgres/connection.ts`.
3. Replace each `repositories/postgres/*.repository.ts` placeholder with a real class that
   implements the interfaces in `repositories/types.ts`. The interface comments describe the
   behaviour each method must have.
   - `decrementStock` must stay atomic: an `UPDATE … WHERE stock >= $qty` is enough.
   - `updateStatus` must only apply while the status is still `from`.
4. Set `DB_CLIENT=postgres` and `DATABASE_URL`.

## API

All responses have the shape `{ data }` or `{ data, meta }`. Errors have the shape
`{ error, details? }`. Prices are integers in **poisha** (৳1 = 100).

**Public**
- `GET /api/health`
- `GET /api/categories`, `GET /api/categories/:slug`
- `GET /api/products?category=&search=&featured=&sort=newest|price_asc|price_desc|name_asc&page=&limit=`
- `GET /api/products/:slug`

- `GET /api/settings` — store contact details: phone, WhatsApp, email, address, Facebook link
- `GET /api/promotions` — home page banners that are currently live

**Auth** (session stored in an httpOnly cookie named `mb_session`; these endpoints are rate-limited)
- `POST /api/auth/register` — requires `phone` (a Bangladeshi mobile number) and `dateOfBirth`;
  the user must be 18 or older
- `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/auth/me`, `PATCH /api/auth/me` (name, phone, saved `address`), `POST /api/auth/change-password`

Phone numbers are accepted as `01XXXXXXXXX`, `+8801…` or `8801…`, and stored as `01XXXXXXXXX`.

**Orders** (requires login)
- `POST /api/orders/quote` — server-side prices and delivery fee for a cart
- `POST /api/orders` — places a cash-on-delivery order and reserves stock atomically.
  `saveAddress` (default true) saves the delivery address to the account.
- `GET /api/orders`, `GET /api/orders/:id`
- `POST /api/orders/:id/cancel` — only while the order is pending; puts the stock back

**Admin** (requires the admin role)
- `GET /api/admin/stats`
- `GET|POST /api/admin/categories`, `PATCH|DELETE /api/admin/categories/:id`
- `GET|POST /api/admin/products`, `GET|PATCH|DELETE /api/admin/products/:id`
- `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `PATCH /api/admin/orders/:id/status`
- `GET /api/admin/customers`
- `GET|POST /api/admin/promotions`, `PATCH|DELETE /api/admin/promotions/:id` — hero banners with
  optional start and end dates
- `GET|PATCH /api/admin/settings` — store contact details
- `POST /api/admin/uploads` — multipart field `image`, JPEG/PNG/WebP/GIF up to 5 MB. Files
  are served from `/uploads/…`.

Order status flow: `pending → confirmed → shipped → delivered`. An order can be cancelled
while it is pending or confirmed. Marking an order delivered also marks it paid.

## Deployment notes

- The session cookie uses `SameSite=Lax`, so the storefront and API must be on the **same
  site**, e.g. `shop.example.com` and `api.example.com`. Set `CORS_ORIGIN` to the storefront
  URL.
- Uploaded files live in `./uploads`. Use a persistent disk, or move to object storage
  later.
- Tobacco sales are age-restricted and regulated. Check the local law for online sales
  and delivery.
