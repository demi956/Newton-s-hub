# Newton's Hub

**We Buy • We Sell • We Swap — Where quality meets affordability.**

Online store for Newton's Hub (UMaT Campus, Tarkwa & Breman Essiam, Ghana): phones and accessories,
sell/swap requests, MTN / AirtelTigo / Telecel data bundles and MTN AFA registration, with an
AI shopping assistant ("Newton's AI") and an admin dashboard.

**Stack:** TanStack Start (React 19, Vite 8, server functions on Nitro) · Tailwind CSS 4 ·
Supabase (Postgres, Auth, RLS) · Anthropic Claude for the assistant · deployed on Vercel.

| Guide | What it covers |
|---|---|
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Vercel setup, environment variables, migration, auth URLs |
| [`ADMIN_SECURITY.md`](ADMIN_SECURITY.md) | Making the owner an admin; security model and verification |
| [`PRODUCT_IMAGES.md`](PRODUCT_IMAGES.md) | Which product photos exist, which are still needed, how to add them |
| [`.env.example`](.env.example) | Every environment variable |

### Where things live

- `src/routes/` — pages (`index`, `shop`, `shop.$slug`, `cart`, `checkout`, `bundles`, `buy-sell-swap`, `contact`, `auth`, `_authenticated/account`, `admin`)
- `src/lib/*.functions.ts` — server functions (catalog, orders, requests, wishlist, admin, assistant)
- `src/lib/assistant.server.ts` — Newton's AI: catalog grounding, guardrails, rate limit, fallback
- `src/components/assistant/` — welcome animation and floating chat
- `supabase/migrations/` — database history (apply new files only; never replay the initial schema on live data)
- `public/products/` — Newton's Hub's own product photos (WebP, 480/900px)

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2398a30b-42e4-4296-92dd-c3817101d64e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
