# PETUK Restaurant Management Ecosystem

A full-stack restaurant business ecosystem for **PETUK** — a Bangladeshi-Chinese fast-food restaurant in Dhaka. Includes a customer-facing menu/ordering interface and a full admin panel (POS, kitchen display, orders, menu, members, coupons, riders, reports).

## Run & Operate

- `pnpm --filter @workspace/petuk run dev` — frontend (Vite, port via `$PORT`)
- `pnpm --filter @workspace/api-server run dev` — API server (Express, port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (uses `SUPABASE_DATABASE_URL` if set)
- `node artifacts/api-server/seed.mjs` — seed all tables (admin users, menu, settings)
- Required env: `SUPABASE_DATABASE_URL` (Replit Secret — see below), `SESSION_SECRET` (set)

## Database Setup (Supabase)

The app uses **Supabase** as the external database so it is fully portable across Replit accounts.

### Moving to a new Replit account
1. Import this repo from GitHub: `https://github.com/theshourove/Restaurant-Ecosystemzip`
2. Run `pnpm install`
3. Add a Replit Secret: `SUPABASE_DATABASE_URL` = your Supabase connection string
   - Format: `postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres`
   - URL-encode any `@` in your password as `%40`
4. Run `pnpm --filter @workspace/db run push` to create tables
5. Run `node artifacts/api-server/seed.mjs` to seed data
6. Start both workflows

### Switching to a different Supabase project
Just update the `SUPABASE_DATABASE_URL` secret in Replit → Secrets, then restart the API Server workflow.

### Priority order
`SUPABASE_DATABASE_URL` (external Supabase) → `DATABASE_URL` (Replit built-in fallback)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui, Wouter routing
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Sessions: express-session + connect-pg-simple (stored in `sessions` table)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/petuk/` — React frontend (customer menu + admin panel)
- `artifacts/api-server/` — Express API server
- `lib/db/` — Drizzle schema + database client
- `lib/api-spec/` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/` — generated React Query hooks (from Orval codegen)
- `lib/api-zod/` — generated Zod schemas (from Orval codegen)

## Admin Panel

- URL: `/admin/login`
- Default password for all seeded users: **`password`** (change in production)
- Seeded users: `admin`, `manager`, `cashier1`, `chef`, `juicebar`, `teacounter`, `kitchen1`
- Roles: Admin, Manager, Cashier, Chef, Juice Bar, Tea Counter, Kitchen

## Image Uploads

- Admin can upload menu item photos via the Menu page (file upload → `POST /api/menu/upload`)
- Uploads saved to `artifacts/api-server/uploads/`, served at `/api/uploads/<filename>`
- 5 MB limit, JPG/PNG/WebP accepted

## QR Table Ordering

- Manage table QR codes at `/admin/tables`
- Each QR code encodes a URL: `<origin>/order?table=N`
- Customer scans → `QrOrder` page → auto-fills table number, source=qr, order type=dine_in
- Table number appears in Kitchen Display and Order Management

## Architecture decisions

- Sessions stored in PostgreSQL (`sessions` table) via `connect-pg-simple` — survives restarts
- `secure` cookie only in production (`NODE_ENV === "production"`); `sameSite: "lax"` throughout
- API served at `/api` prefix; frontend proxied through Vite dev server in development
- Orval codegen from OpenAPI spec keeps client hooks and Zod schemas in sync with the API

## Product

PETUK is a restaurant management system with:
- **Customer side**: browsable menu with categories, cart, QR ordering, order tracking, member registration/profile
- **Admin side**: POS terminal, kitchen display, order management, menu management, member loyalty program, coupon system, rider/delivery management, sales reports, system settings

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change — the React hooks and Zod schemas are generated, not hand-written
- Run `pnpm --filter @workspace/db run push` after schema changes in `lib/db/src/schema/` to apply them to the dev database
- The API server reads `PORT` from the environment — never hardcode it
- Session cookie uses `secure: false` in dev (Replit proxy handles HTTPS); `session.save()` is called before sending the login response to eliminate the race condition where `GET /api/auth/me` arrived before the session was written to PostgreSQL
- `PATCH /api/orders/:id/status` matches on the numeric DB `id`, not the `orderId` string (e.g. "PK-1001") — the Orval client always sends the numeric id in the URL

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- DB schema: `lib/db/src/schema/`
- API routes: `artifacts/api-server/src/routes/`
- Frontend pages: `artifacts/petuk/src/pages/`
