-- Newton's Hub completion migration (additive; safe to run once on the existing database).
-- 1. Product image rows for Newton's Hub's own photos (only where a product has none).
-- 2. Hide cost_price from the public REST API (column-level grants).
-- 3. Idempotency key on orders.
-- 4. Transactional order placement and payment confirmation RPCs.
-- Nothing is dropped and no existing rows are modified except as described.

begin;

-- 1. Images ---------------------------------------------------------------------------
-- The files live in the web app at /products/<sku>-900.webp (and -480.webp).
insert into public.product_images (product_id, image_url, is_primary, sort_order)
select p.id, '/products/' || lower(p.sku) || '-900.webp', true, 0
from public.products p
where p.sku ~ '^NWH-0(0[1-9]|[12][0-9]|3[0-3])$'
  and not exists (select 1 from public.product_images i where i.product_id = p.id);

-- 2. Cost privacy -----------------------------------------------------------------------
-- Replace the table-wide SELECT grant with a column list that omits cost_price.
-- Server code that needs cost_price (admin) uses the service role, which is unaffected.
revoke select on public.product_variants from anon, authenticated;
grant select (
  id, product_id, sku, storage, color, stock_type, condition, sealed_in_box, network_lock,
  battery_health_percent, price, sale_price, stock_quantity, low_stock_threshold,
  stock_tracking_mode, availability_status, active, created_at, updated_at
) on public.product_variants to anon, authenticated;

-- 3. Idempotency ------------------------------------------------------------------------
alter table public.orders add column if not exists client_request_id uuid;
create unique index if not exists orders_client_request_id_key
  on public.orders (client_request_id) where client_request_id is not null;

-- 4a. place_order ------------------------------------------------------------------------
-- Called with the signed-in customer's token. Locks the variants, checks stock and prices
-- on the server, and writes order + items + history in one transaction.
create or replace function public.place_order(
  _items jsonb,
  _details jsonb,
  _client_request_id uuid
) returns table (id uuid, order_number text, subtotal numeric)
language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _existing record;
  _order_id uuid;
  _order_number text;
  _subtotal numeric(12,2) := 0;
  _method text := coalesce(_details->>'fulfillment_method', 'delivery');
  _item jsonb;
  _qty integer;
  _v record;
begin
  if _uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if _method not in ('delivery', 'pickup') then raise exception 'invalid_fulfillment'; end if;
  if _items is null or jsonb_typeof(_items) is distinct from 'array'
     or jsonb_array_length(_items) = 0 or jsonb_array_length(_items) > 100 then
    raise exception 'invalid_items';
  end if;
  if length(trim(coalesce(_details->>'full_name', ''))) < 2
     or length(trim(coalesce(_details->>'phone', ''))) < 6 then
    raise exception 'invalid_details';
  end if;
  if (select count(*) from jsonb_array_elements(_items) e
      where (e->>'variant_id') is null) > 0
     or (select count(distinct e->>'variant_id') from jsonb_array_elements(_items) e)
        <> jsonb_array_length(_items) then
    raise exception 'invalid_items';
  end if;

  if _client_request_id is not null then
    select o.id, o.order_number, o.subtotal into _existing
    from public.orders o
    where o.client_request_id = _client_request_id and o.customer_id = _uid;
    if found then
      return query select _existing.id, _existing.order_number, _existing.subtotal;
      return;
    end if;
  end if;

  -- Lock every variant in a stable order to avoid deadlocks between concurrent checkouts.
  perform 1 from public.product_variants pv
  where pv.id in (select (e->>'variant_id')::uuid from jsonb_array_elements(_items) e)
  order by pv.id for update;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item->>'quantity')::integer;
    if _qty is null or _qty < 1 or _qty > 20 then raise exception 'invalid_quantity'; end if;
    select pv.*, p.active as product_active into _v
    from public.product_variants pv join public.products p on p.id = pv.product_id
    where pv.id = (_item->>'variant_id')::uuid;
    if not found or not _v.active or not _v.product_active
       or _v.availability_status in ('inactive', 'out_of_stock') then
      raise exception 'item_unavailable';
    end if;
    if _v.stock_tracking_mode = 'exact' and _v.stock_quantity is not null
       and _v.stock_quantity < _qty then
      raise exception 'insufficient_stock';
    end if;
    _subtotal := _subtotal + coalesce(_v.sale_price, _v.price) * _qty;
  end loop;

  insert into public.orders (
    customer_id, subtotal, delivery_fee, total, delivery_fee_confirmed, fulfillment_method,
    full_name, phone, email, region, city, delivery_address, landmark, notes,
    payment_status, order_status, client_request_id
  ) values (
    _uid, _subtotal, null,
    case when _method = 'pickup' then _subtotal else null end,
    _method = 'pickup', _method,
    left(_details->>'full_name', 120), left(_details->>'phone', 30),
    nullif(left(_details->>'email', 200), ''), nullif(left(_details->>'region', 120), ''),
    nullif(left(_details->>'city', 120), ''), nullif(left(_details->>'delivery_address', 400), ''),
    nullif(left(_details->>'landmark', 200), ''), nullif(left(_details->>'notes', 1000), ''),
    'pending', 'pending', _client_request_id
  ) returning orders.id, orders.order_number into _order_id, _order_number;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name_snapshot, variant_snapshot, sku_snapshot,
    unit_price_snapshot, quantity, subtotal
  )
  select _order_id, p.id, pv.id, p.name,
         jsonb_build_object('storage', pv.storage, 'color', pv.color, 'condition', pv.condition),
         pv.sku, coalesce(pv.sale_price, pv.price), (e->>'quantity')::integer,
         coalesce(pv.sale_price, pv.price) * (e->>'quantity')::integer
  from jsonb_array_elements(_items) e
  join public.product_variants pv on pv.id = (e->>'variant_id')::uuid
  join public.products p on p.id = pv.product_id;

  insert into public.order_status_history (order_id, status, note, changed_by)
  values (_order_id, 'pending', 'Order placed on the website.', _uid);

  return query select _order_id, _order_number, _subtotal;
end;
$$;

revoke execute on function public.place_order(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.place_order(jsonb, jsonb, uuid) to authenticated, service_role;

-- 4b. admin_confirm_order_payment ---------------------------------------------------------
-- Admin-only. Marks the pending payment successful, confirms the order and deducts stock for
-- exactly tracked variants, all in one transaction. Never runs for non-admins.
create or replace function public.admin_confirm_order_payment(_order_id uuid, _note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _o record;
begin
  if not public.is_admin() then raise exception 'not_authorized' using errcode = '42501'; end if;
  select * into _o from public.orders where id = _order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if _o.payment_status = 'successful' then raise exception 'already_confirmed'; end if;
  if _o.order_status = 'cancelled' then raise exception 'order_cancelled'; end if;

  perform 1 from public.product_variants pv
  where pv.id in (select oi.variant_id from public.order_items oi where oi.order_id = _order_id)
  order by pv.id for update;

  if exists (
    select 1 from public.order_items oi join public.product_variants pv on pv.id = oi.variant_id
    where oi.order_id = _order_id and pv.stock_tracking_mode = 'exact'
      and pv.stock_quantity is not null and pv.stock_quantity < oi.quantity
  ) then
    raise exception 'insufficient_stock';
  end if;

  update public.product_variants pv
  set stock_quantity = pv.stock_quantity - oi.quantity,
      availability_status = case when pv.stock_quantity - oi.quantity <= 0 then 'out_of_stock'
                                 else pv.availability_status end
  from public.order_items oi
  where oi.order_id = _order_id and oi.variant_id = pv.id
    and pv.stock_tracking_mode = 'exact' and pv.stock_quantity is not null;

  update public.payments
  set status = 'successful', verified_at = now()
  where order_id = _order_id and status in ('pending', 'pending_verification');

  update public.orders
  set payment_status = 'successful', order_status = 'payment_confirmed'
  where id = _order_id;

  insert into public.order_status_history (order_id, status, note, changed_by)
  values (_order_id, 'payment_confirmed',
          coalesce(nullif(left(_note, 500), ''), 'Payment confirmed by Newton''s Hub.'), _uid);
end;
$$;

revoke execute on function public.admin_confirm_order_payment(uuid, text) from public, anon;
grant execute on function public.admin_confirm_order_payment(uuid, text) to authenticated, service_role;

commit;
