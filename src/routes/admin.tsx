import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { requireRouteAuth } from "@/lib/auth-guard";
import { getAdminAccess, getAdminDashboard } from "@/lib/admin.functions";
import { AdminLayout, ADMIN_TABS, type AdminTab } from "@/components/AdminLayout";
import { OrdersPanel } from "@/components/admin/OrdersPanel";
import { RequestsPanel } from "@/components/admin/RequestsPanel";
import { ProductsPanel } from "@/components/admin/ProductsPanel";
import { BundlesPanel, MessagesPanel } from "@/components/admin/SmallPanels";
import { formatGHS } from "@/lib/format";

const tabs = ADMIN_TABS.map((t) => t.key) as [AdminTab, ...AdminTab[]];

export const Route = createFileRoute("/admin")({
  ssr: false,
  validateSearch: (s) => z.object({ tab: z.enum(tabs).optional().catch(undefined) }).parse(s),
  beforeLoad: async ({ location }) => {
    await requireRouteAuth({ location });
    // Server-verified role check; every admin data call re-checks independently.
    if (!(await getAdminAccess())) throw new Error("Unauthorized");
  },
  loaderDeps: ({ search }) => ({ tab: search.tab }),
  loader: ({ deps }) => ((deps.tab ?? "dashboard") === "dashboard" ? getAdminDashboard() : null),
  staleTime: 0,
  gcTime: 0,
  head: () => ({
    meta: [{ title: "Admin — Newton's Hub" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  errorComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-semibold">Admin access unavailable</h1>
      <p className="my-4 text-sm text-muted-foreground">
        This area needs an administrator account. If you are an administrator, refresh the page or
        sign in again.
      </p>
      <Link to="/" className="font-semibold text-primary">
        Return to the shop
      </Link>
    </div>
  ),
  component: AdminPage,
});

function AdminPage() {
  const { tab = "dashboard" } = Route.useSearch();
  const router = useRouter();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => void router.invalidate());
    return () => data.subscription.unsubscribe();
  }, [router]);

  return (
    <AdminLayout tab={tab}>
      {tab === "dashboard" && <Dashboard />}
      {tab === "orders" && <OrdersPanel />}
      {tab === "requests" && <RequestsPanel />}
      {tab === "products" && <ProductsPanel />}
      {tab === "data" && <BundlesPanel />}
      {tab === "messages" && <MessagesPanel />}
    </AdminLayout>
  );
}

function Dashboard() {
  const dashboard = Route.useLoaderData();
  if (!dashboard) return null;
  const links: Partial<Record<string, AdminTab>> = {
    "Orders awaiting action": "orders",
    "Bundle requests pending": "data",
    "Sell/Swap requests to review": "requests",
    "New messages": "messages",
    "Low or no stock variants": "products",
  };
  return (
    <div>
      <h2 className="font-display text-2xl font-bold sm:text-3xl">Dashboard</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Live counts from the database. Tap a card to act on it.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-3">
        {dashboard.metrics.map((metric) => {
          const target = metric.label ? links[metric.label] : undefined;
          const body = (
            <>
              <p className="text-xs text-muted-foreground sm:text-sm">{metric.label}</p>
              <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                {metric.value ?? "—"}
              </p>
              {metric.value === null && (
                <p className="mt-1 text-xs text-destructive">Couldn&apos;t read this count.</p>
              )}
            </>
          );
          return target ? (
            <Link
              key={metric.label}
              to="/admin"
              search={{ tab: target }}
              className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 sm:p-5"
            >
              {body}
            </Link>
          ) : (
            <div key={metric.label} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              {body}
            </div>
          );
        })}
      </div>

      <h3 className="mb-3 mt-10 font-display text-lg font-semibold">Recent orders</h3>
      {dashboard.orders === null ? (
        <p className="text-sm text-destructive">
          Orders couldn&apos;t load. Check database permissions.
        </p>
      ) : dashboard.orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="bg-secondary/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Placed</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.orders.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{o.order_number}</td>
                  <td className="px-4 py-3 capitalize">{o.order_status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 capitalize">{o.payment_status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    {formatGHS(Number(o.total ?? o.subtotal))}
                    {o.total === null && (
                      <span className="text-xs text-muted-foreground"> + delivery</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("en-GH")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="mb-3 mt-10 font-display text-lg font-semibold">Recent sell & swap requests</h3>
      {dashboard.requests === null ? (
        <p className="text-sm text-destructive">
          Requests couldn&apos;t load. Check database permissions.
        </p>
      ) : dashboard.requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No requests yet.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {dashboard.requests.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
              <span className="font-semibold">{r.request_number}</span>{" "}
              <span className="capitalize text-muted-foreground">
                · {r.request_type} · {r.current_model || "Device unspecified"}
              </span>
              <p className="mt-1 text-xs capitalize text-muted-foreground">
                {r.admin_status.replace(/_/g, " ")} ·{" "}
                {new Date(r.created_at).toLocaleDateString("en-GH")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
