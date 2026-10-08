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

## Remaining limitations

Phone verification is weaker than a random guest token. Public submissions and verification endpoints need shared rate limiting/CAPTCHA to reduce spam and guessing.
Order creation and payment recording currently use multiple database writes, not a transaction; concurrent submissions and partial failures remain possible. A future transactional RPC should lock the order and enforce idempotency.
Catalog variants have public row SELECT access, including cost_price through direct REST; hiding commercial cost data requires column grants or a public view. app_settings is publicly readable and must contain only public business settings.
No live role assignment, migration application, browser session tests or live RLS tests are implied by a successful local build.
