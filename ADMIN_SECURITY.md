# Admin setup and security validation

Apply only the new migration `20260912120000_secure_submission_policies.sql` to the existing Supabase project using its normal migration process or SQL Editor. Do not replay the initial schema blueprints or reset the database. This closes direct REST submission paths; website submissions use validated server functions.

No live Supabase session was available in this workspace, so the intended administrator's current role could not be verified. In the Supabase SQL Editor, run:

```sql
select u.id, u.email, u.email_confirmed_at,
       exists (select 1 from public.user_roles r
               where r.user_id = u.id and r.role = 'admin') as is_admin
from auth.users u
where lower(u.email) = lower('newtonr710@gmail.com');
```

If no user exists, have the intended owner sign up and verify their email through the existing auth flow. Confirm that this is the owner's account in Authentication > Users. Then, as the project owner in SQL Editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.user_role
from auth.users
where lower(email) = lower('newtonr710@gmail.com')
  and email_confirmed_at is not null
on conflict (user_id, role) do nothing;
```

Re-run the inspection query. Email is only an operator lookup here, never application authorization. Application access uses is_admin()/user_roles on the verified session.

## Behavior to validate against the deployed database

- Anonymous shop, product, cart, checkout, bundle and contact flows still work.
- Anonymous /admin redirects to /auth. Customer /admin shows access unavailable; direct dashboard RPC rejects customers. Admin /admin loads real counts and recent records.
- Forged customer_id is stripped; signed-in submission ownership comes from auth.getUser. Missing credentials create guests; invalid tokens are rejected.
- Order lookup uses POST (verification is not put in a URL). Owners/admins can read; anonymous guests require the checkout phone and an order with no customer. Other customers cannot use phone verification to bypass ownership.
- Guest payment references require checkout phone; authenticated payment references require owner/admin access. Amount is read from the order: confirmed total, or subtotal while delivery fee is unconfirmed. References remain unverified and never mark an order paid.
- Direct customer/anonymous inserts into contact, buy/swap and support tables must fail after the migration.
- Customer profile counts represent all registered profiles, including staff, not auth.users or guest identities.

## Completion update (October 2026, migration `20261008090000_images_transactions_cost_privacy.sql`)

Apply this additive migration after `20260912120000`. It resolves two limitations listed below:

- **Transactional orders.** `place_order(_items, _details, _client_request_id)` runs as the signed-in
  customer (`auth.uid()`), locks the variants, re-prices on the server, checks exact stock, and writes
  the order, items and history in one transaction. `client_request_id` makes retries idempotent
  (a double tap returns the same order). The server function falls back to the previous path only
  if the RPC is missing.
- **Payment confirmation.** `admin_confirm_order_payment(_order_id, _note)` refuses non-admins
  (`is_admin()`), refuses double confirmation and cancelled orders, and in one transaction marks
  the payment successful, confirms the order, deducts exact-tracked stock (setting `out_of_stock`
  at zero) and logs history with the admin's id.
- **Cost privacy.** `anon`/`authenticated` now have column-level SELECT on `product_variants`
  without `cost_price`. Admin screens read cost via the service role only after the role check.

Admin dashboard actions (orders, requests, products, bundle requests, messages) are server functions
that call `is_admin()` with the caller's token and then write **with that same token**, so the existing
admin RLS policies are a second, independent check. Wishlist reads and writes use the customer's token
(RLS `wishlist_owner_all`).

These behaviours were verified against a local stack built from this repository's migrations
(Postgres 16 + PostgREST 12 + Supabase Auth v2.177): customer isolation, non-admin rejection,
idempotent retry, stock checks, stock deduction on confirmation, and double-confirmation rejection.
They have **not** yet been run against the live Lovable Cloud database.

## Remaining limitations

Phone verification is weaker than a random guest token. Public submissions and verification endpoints need shared rate limiting/CAPTCHA to reduce spam and guessing.
~~Order creation and payment recording currently use multiple database writes, not a transaction.~~ Resolved by `place_order` / `admin_confirm_order_payment` once the migration is applied. Submitting a MoMo reference still uses separate writes (payment row, order status, history); a failure between them is reported to the customer and visible to the admin.
~~Catalog variants have public row SELECT access, including cost_price.~~ Resolved by column grants in the migration. app_settings is publicly readable and must contain only public business settings.
Newton's AI rate limiting is per server instance (best effort on serverless). The assistant only reads public catalog data, so abuse costs AI usage, not data.
No live role assignment or live-database RLS tests are implied by the local verification above.
