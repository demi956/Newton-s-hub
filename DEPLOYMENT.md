# Deploying Newton's Hub to Vercel

Newton's Hub is a **TanStack Start** app (React 19, Vite 8, server functions via Nitro) backed by
**Supabase**. It is *not* a static site: checkout, sell/swap, admin and the AI assistant run as
server functions. Vercel runs them as one Node.js serverless function, which Nitro generates
automatically when it detects the Vercel build environment.

## 1. Apply the database migration (once)

In the Supabase SQL editor (or your normal migration process), run **only** the new file:

```
supabase/migrations/20261008090000_images_transactions_cost_privacy.sql
```

It is additive and safe on the existing database. It:

- adds image rows pointing at the 33 accessory photos shipped in `public/products/`
  (only for products that have no image yet);
- hides `cost_price` from the public API (column-level grants);
- adds `orders.client_request_id` (prevents duplicate orders from double taps);
- adds `place_order(...)` — places an order, its items and history in **one transaction**, with
  server-side prices and a stock check;
- adds `admin_confirm_order_payment(...)` — admin-only; confirms payment and deducts stock in
  one transaction.

The site keeps working before the migration is applied (checkout falls back to the previous
multi-step path), but apply it before going live. Do **not** replay `001_initial_schema.sql` /
`002_seed_catalog.sql` on the live database.

If `20260912120000_secure_submission_policies.sql` was never applied, apply it first
(see `ADMIN_SECURITY.md`).

## 2. Create the Vercel project

1. Vercel → **Add New → Project** → import `demi956/truthful-data-hub`.
2. **Framework preset:** *Other*. `vercel.json` already sets:
   - install: `node scripts/vercel-install.mjs` (installs the exact versions in `bun.lock`
     from the public npm registry — the lockfile points at Lovable's private cache, which
     Vercel cannot reach);
   - build: `bun run build` (Nitro detects Vercel and writes `.vercel/output`).
   Leave *Output Directory* empty.
3. **Production branch:** choose the branch you want live (after merging this work).
4. **Node.js version:** 22.x (default is fine).

## 3. Environment variables

Add these under *Project → Settings → Environment Variables* (Production and Preview).
See `.env.example` for descriptions.

| Variable | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | yes | publishable / anon key |
| `VITE_SUPABASE_URL` | yes | same URL (needed at build time for the browser) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | yes | same publishable key |
| `SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PROJECT_ID` | recommended | project ref |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | server-only secret; checkout, sell/swap, contact and admin need it |
| `ANTHROPIC_API_KEY` | recommended | enables Newton's AI language model; without it the assistant answers from built-in catalog rules |
| `AI_MODEL` | no | defaults to `claude-haiku-5-5` |
| `VITE_ENABLE_GOOGLE_AUTH` | no | `true` only after configuring Google in Supabase Auth |

Never put the service role key or Anthropic key in a `VITE_` variable — those are bundled into
browser code.

> The current Supabase project is managed by **Lovable Cloud**. Its service-role key is
> injected automatically inside Lovable. To run the same database on Vercel you need that key
> (or to move the project to a Supabase account you control). This is the one credential the
> deployment cannot proceed without.

## 4. Supabase Auth settings

Supabase → **Authentication → URL Configuration**:

- **Site URL:** your production domain, e.g. `https://newtonshub.vercel.app`
- **Redirect URLs:** add
  - `https://YOUR-DOMAIN/auth`
  - `https://YOUR-DOMAIN/auth/reset`
  - `https://*-YOUR-TEAM.vercel.app/**` (preview deployments, optional)

Password-reset emails link to `/auth/reset`; signup confirmations return to `/auth`.

## 5. Make the owner an administrator

Follow `ADMIN_SECURITY.md` (sign up with the owner's email, confirm it, then insert the `admin`
role in `user_roles`). The admin dashboard is at `/admin`; it is invisible to customers and every
admin action re-checks the role on the server and in the database.

## 6. Deploy and verify

After the first deploy, check:

1. `/` loads with product photos; `/shop` lists products; a product page opens.
2. Sign up → you land on `/account`.
3. Add to cart → checkout (pickup) → order number shown → submit a test MoMo reference.
4. As admin: `/admin?tab=orders` → confirm the payment → stock decreases in *Products & stock*.
5. Open Newton's AI → ask "I have GH₵150, what can I buy?" → product cards appear.
6. `/bundles` → pick a bundle → "Send on WhatsApp" opens WhatsApp with the request.

## Local development

```sh
cp .env.example .env   # fill in values
bun install            # or: node scripts/vercel-install.mjs outside Lovable
bun run dev
```

## Operational notes

- **AI rate limiting** is per server instance (10 messages/minute, 80/hour per IP). For heavier
  traffic, add a shared limiter (e.g. Upstash Redis) in `src/lib/assistant.server.ts`.
- **Product photos** are served from `/products/*.webp` with long cache headers. New photos can
  be added in the admin *Products & stock* panel as an `https://` link (e.g. a Supabase Storage
  public URL) — see `PRODUCT_IMAGES.md`.
- Lovable sync: pushing to the Lovable-connected branch updates the Lovable editor. Don't
  force-push or rewrite pushed history.
