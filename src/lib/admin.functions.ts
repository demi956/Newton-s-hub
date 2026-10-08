import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/lib/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type Db = ReturnType<typeof import("./supabase-public.server").publicClient>;
type OrderStatus = Database["public"]["Enums"]["order_status"];

// Every admin function re-checks the role on the server with the caller's own token.
// Writes also go through that token, so the database's admin RLS policies apply as a
// second, independent check. The service role is used only for reads RLS would hide
// from admins (cost_price) after the role check has passed.
async function assertAdmin(db: Db) {
  const { data, error } = await db.rpc("is_admin");
  if (error || data !== true) throw new Error("Unauthorized.");
}

function fail(message: string): never {
  throw new Error(message);
}

export const getAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("is_admin");
    if (error) throw new Error("Unable to verify administrator access.");
    return data === true;
  });

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    await assertAdmin(db);
    const results = await Promise.all([
      db.from("products").select("id", { count: "exact", head: true }).eq("active", true),
      db.from("product_variants").select("id", { count: "exact", head: true }),
      db.from("orders").select("id", { count: "exact", head: true }),
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("order_status", ["pending", "payment_pending_verification"]),
      db.from("bundle_orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      db.from("profiles").select("id", { count: "exact", head: true }),
      db
        .from("buy_swap_requests")
        .select("id", { count: "exact", head: true })
        .in("admin_status", ["pending_review", "submitted"]),
      db.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
      db
        .from("product_variants")
        .select("id", { count: "exact", head: true })
        .eq("stock_tracking_mode", "exact")
        .lte("stock_quantity", 2),
    ]);
    const labels = [
      "Active products",
      "Catalog variants",
      "Orders (all time)",
      "Orders awaiting action",
      "Bundle requests pending",
      "Registered profiles",
      "Sell/Swap requests to review",
      "New messages",
      "Low or no stock variants",
    ];
    const [orders, requests] = await Promise.all([
      db
        .from("orders")
        .select("id, order_number, order_status, payment_status, subtotal, total, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      db
        .from("buy_swap_requests")
        .select("id, request_number, request_type, current_model, admin_status, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
    return {
      metrics: results.map((result, i) => ({
        label: labels[i],
        value: result.error ? null : result.count,
      })),
      orders: orders.error ? null : orders.data,
      requests: requests.error ? null : requests.data,
    };
  });

// ---------------------------------------------------------------- Orders

export const ORDER_STATUSES = [
  "pending",
  "payment_pending_verification",
  "payment_confirmed",
  "processing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const satisfies readonly OrderStatus[];

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        status: z.enum(ORDER_STATUSES).optional(),
        search: z.string().trim().max(60).optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    await assertAdmin(db);
    let query = db
      .from("orders")
      .select(
        "id, order_number, order_status, payment_status, fulfillment_method, subtotal, delivery_fee, total, delivery_fee_confirmed, full_name, phone, email, region, city, delivery_address, landmark, notes, created_at, items:order_items ( id, product_name_snapshot, variant_snapshot, sku_snapshot, unit_price_snapshot, quantity, subtotal ), payments ( id, reference, amount, status, created_at ), history:order_status_history ( id, status, note, created_at )",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status) query = query.eq("order_status", data.status);
    if (data.search) {
      const term = data.search.replace(/[%_,().*\\]/g, " ").trim();
      if (term) query = query.or(`order_number.ilike.%${term}%,full_name.ilike.%${term}%,phone.ilike.%${term}%`);
    }
    const { data: rows, error } = await query;
    if (error) fail("Unable to load orders.");
    return rows ?? [];
  });

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .discriminatedUnion("action", [
        z.object({
          action: z.literal("set_status"),
          order_id: z.string().uuid(),
          status: z.enum(["processing", "ready", "out_for_delivery", "delivered", "cancelled"]),
          note: z.string().trim().max(500).optional(),
        }),
        z.object({
          action: z.literal("set_delivery_fee"),
          order_id: z.string().uuid(),
          fee: z.number().min(0).max(10000),
        }),
        z.object({
          action: z.literal("confirm_payment"),
          order_id: z.string().uuid(),
          note: z.string().trim().max(500).optional(),
        }),
        z.object({
          action: z.literal("reject_payment"),
          order_id: z.string().uuid(),
          note: z.string().trim().max(500).optional(),
        }),
      ])
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    await assertAdmin(db);
    const { data: order, error } = await db
      .from("orders")
      .select("id, order_status, payment_status, subtotal, fulfillment_method")
      .eq("id", data.order_id)
      .maybeSingle();
    if (error || !order) fail("Order not found.");

    const history = (status: OrderStatus, note: string) =>
      db.from("order_status_history").insert({
        order_id: order.id,
        status,
        note,
        changed_by: context.userId,
      });

    if (data.action === "confirm_payment") {
      const { error: rpcError } = await db.rpc("admin_confirm_order_payment" as never, {
        _order_id: order.id,
        _note: data.note ?? null,
      } as never);
      if (rpcError) {
        const msg = rpcError.message ?? "";
        if (msg.includes("insufficient_stock"))
          fail("Not enough stock to fulfil this order. Update inventory first.");
        if (msg.includes("already_confirmed")) fail("Payment is already confirmed.");
        if (msg.includes("order_cancelled")) fail("This order is cancelled.");
        if ((rpcError as { code?: string }).code === "PGRST202")
          fail("Apply migration 20261008090000 before confirming payments from the dashboard.");
        fail("Unable to confirm payment.");
      }
      return { ok: true };
    }

    if (data.action === "reject_payment") {
      if (order.payment_status === "successful") fail("A confirmed payment can't be rejected here.");
      const p = await db
        .from("payments")
        .update({ status: "failed" })
        .eq("order_id", order.id)
        .in("status", ["pending", "pending_verification"]);
      const o = await db
        .from("orders")
        .update({ payment_status: "pending", order_status: "pending" })
        .eq("id", order.id);
      if (p.error || o.error) fail("Unable to update the payment.");
      await history("pending", data.note || "Payment reference could not be verified. Customer may resubmit.");
      return { ok: true };
    }

    if (data.action === "set_delivery_fee") {
      if (order.fulfillment_method !== "delivery") fail("Pickup orders have no delivery fee.");
      const total = Number(order.subtotal) + data.fee;
      const { error: updateError } = await db
        .from("orders")
        .update({ delivery_fee: data.fee, total, delivery_fee_confirmed: true })
        .eq("id", order.id);
      if (updateError) fail("Unable to save the delivery fee.");
      await history(order.order_status, `Delivery fee confirmed: GH₵ ${data.fee.toFixed(2)}.`);
      return { ok: true };
    }

    // set_status
    if (order.order_status === "cancelled") fail("This order is cancelled.");
    if (
      data.status !== "cancelled" &&
      order.payment_status !== "successful"
    )
      fail("Confirm the payment before moving this order forward.");
    const { error: statusError } = await db
      .from("orders")
      .update({ order_status: data.status })
      .eq("id", order.id);
    if (statusError) fail("Unable to update the order.");
    await history(data.status, data.note || `Status changed to ${data.status.replace(/_/g, " ")}.`);
    return { ok: true };
  });

// ---------------------------------------------------------------- Buy / Sell / Swap

export const REQUEST_STATUSES = [
  "pending_review",
  "contacted",
  "inspection_scheduled",
  "offer_made",
  "completed",
  "declined",
  "cancelled",
] as const;

export const adminListRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    await assertAdmin(db);
    const { data, error } = await db
      .from("buy_swap_requests")
      .select(
        "id, request_number, request_type, customer_name, customer_phone, current_brand, current_model, current_storage, current_condition, battery_health_percent, imei_or_serial, customer_notes, admin_status, admin_offer, admin_notes, created_at, updated_at, desired:products ( name, slug )",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) fail("Unable to load requests.");
    return data ?? [];
  });

export const adminUpdateRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        admin_status: z.enum(REQUEST_STATUSES),
        admin_offer: z.number().min(0).max(100000).nullable(),
        admin_notes: z.string().trim().max(2000).nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    await assertAdmin(db);
    const { error } = await db
      .from("buy_swap_requests")
      .update({
        admin_status: data.admin_status,
        admin_offer: data.admin_offer,
        admin_notes: data.admin_notes || null,
      })
      .eq("id", data.id);
    if (error) fail("Unable to update the request.");
    return { ok: true };
  });

// ---------------------------------------------------------------- Products & inventory

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase);
    // Service role read: admins need cost_price, which is hidden from the public API.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products")
      .select(
        "id, sku, name, slug, brand, subcategory, active, featured, description, variants:product_variants ( id, sku, storage, color, condition, price, sale_price, cost_price, stock_quantity, stock_tracking_mode, availability_status, active ), images:product_images ( id, image_url, is_primary, sort_order )",
      )
      .order("subcategory", { ascending: true })
      .order("name", { ascending: true });
    if (error) fail("Unable to load products.");
    return data ?? [];
  });

const money = z.number().min(0).max(1_000_000);

export const adminUpdateVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        price: money,
        sale_price: money.nullable(),
        stock_quantity: z.number().int().min(0).max(100000).nullable(),
        availability_status: z.enum(["available", "out_of_stock", "preorder", "inactive"]),
        active: z.boolean(),
      })
      .refine((d) => d.sale_price === null || d.sale_price <= d.price, {
        message: "Sale price must be lower than the regular price.",
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    await assertAdmin(db);
    const { id, ...fields } = data;
    const { error } = await db.from("product_variants").update(fields).eq("id", id);
    if (error) fail("Unable to save the variant.");
    return { ok: true };
  });

export const adminUpdateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        active: z.boolean(),
        featured: z.boolean(),
        description: z.string().trim().max(3000).nullable(),
        image_url: z
          .string()
          .trim()
          .max(600)
          .refine((v) => v === "" || /^https:\/\/\S+$/i.test(v) || /^\/products\/[\w.-]+$/.test(v), {
            message: "Use an https:// image link or a /products/… path.",
          })
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    await assertAdmin(db);
    const { error } = await db
      .from("products")
      .update({ active: data.active, featured: data.featured, description: data.description || null })
      .eq("id", data.id);
    if (error) fail("Unable to save the product.");
    if (data.image_url) {
      const demote = await db.from("product_images").update({ is_primary: false }).eq("product_id", data.id);
      const insert = await db
        .from("product_images")
        .insert({ product_id: data.id, image_url: data.image_url, is_primary: true, sort_order: 0 });
      if (demote.error || insert.error) fail("Product saved, but the image could not be added.");
    }
    return { ok: true };
  });

// ---------------------------------------------------------------- Bundles & messages

export const adminListBundleOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    await assertAdmin(db);
    const { data, error } = await db
      .from("bundle_orders")
      .select(
        "id, order_number, receiving_phone, amount, status, payment_status, created_at, bundle:data_bundles ( network, name )",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) fail("Unable to load bundle requests.");
    return data ?? [];
  });

export const adminUpdateBundleOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "payment_confirmed", "processing", "completed", "failed", "cancelled"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    await assertAdmin(db);
    const payment_status =
      data.status === "payment_confirmed" || data.status === "processing" || data.status === "completed"
        ? ("successful" as const)
        : data.status === "failed" || data.status === "cancelled"
          ? ("failed" as const)
          : ("pending" as const);
    const { error } = await db
      .from("bundle_orders")
      .update({ status: data.status, payment_status })
      .eq("id", data.id);
    if (error) fail("Unable to update the bundle request.");
    return { ok: true };
  });

export const adminListMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    await assertAdmin(db);
    const { data, error } = await db
      .from("contact_messages")
      .select("id, name, email, phone, subject, message, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) fail("Unable to load messages.");
    return data ?? [];
  });

export const adminUpdateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["new", "in_progress", "resolved"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    await assertAdmin(db);
    const { error } = await db.from("contact_messages").update({ status: data.status }).eq("id", data.id);
    if (error) fail("Unable to update the message.");
    return { ok: true };
  });
