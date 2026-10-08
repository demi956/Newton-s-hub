import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/lib/auth-middleware";

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
    const { data: admin, error } = await db.rpc("is_admin");
    if (error || admin !== true) throw new Error("Unauthorized.");
    const results = await Promise.all([
      db.from("products").select("id", { count: "exact", head: true }).eq("active", true),
      db.from("product_variants").select("id", { count: "exact", head: true }),
      db.from("orders").select("id", { count: "exact", head: true }),
      db.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "pending"),
      db.from("bundle_orders").select("id", { count: "exact", head: true }),
      db.from("profiles").select("id", { count: "exact", head: true }),
      db.from("buy_swap_requests").select("id", { count: "exact", head: true }),
      db.from("contact_messages").select("id", { count: "exact", head: true }),
    ]);
    const labels = [
      "Active products",
      "Phone / accessory variants",
      "Orders",
      "Pending orders",
      "Bundle orders",
      "Customer profiles",
      "Buy/Sell/Swap requests",
      "Contact messages",
    ];
    const [orders, requests] = await Promise.all([
      db
        .from("orders")
        .select("id, order_number, order_status, subtotal, total, created_at")
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
