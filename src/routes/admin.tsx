import { requireRouteAuth } from "@/lib/auth-guard";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminAccess, getAdminDashboard } from "@/lib/admin.functions";
import { AdminLayout } from "@/components/AdminLayout";
import { formatGHS } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    await requireRouteAuth({ location });
    if (!(await getAdminAccess())) throw new Error("Unauthorized");
  },
  loader: () => getAdminDashboard(),
  staleTime: 0,
  gcTime: 0,
  errorComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-semibold">Admin access unavailable</h1>
      <p className="my-4">
        An authenticated administrator role is required. If you have that role, try refreshing.
      </p>
      <Link to="/">Return to shop</Link>
    </div>
  ),
  component: AdminDashboard,
});

function AdminDashboard() {
  const dashboard = Route.useLoaderData();
  const router = useRouter();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      void router.invalidate();
    });
    return () => data.subscription.unsubscribe();
  }, [router]);
  return (
    <AdminLayout>
      <h2 className="font-display text-3xl font-semibold">Dashboard</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboard.metrics.map((metric) => (
          <div key={metric.label} className="surface-card p-5">
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold">{metric.value ?? "Unavailable"}</p>
            {metric.value === null && (
              <p className="mt-2 text-xs">
                The database count could not be read securely. Check database permissions and
                connectivity.
              </p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Customer profiles include registered profiles, including staff; guest checkouts are
        excluded. Pending orders have status “pending”. Variants include all catalog variants.
      </p>
      <h3 className="mb-3 mt-8 text-xl font-semibold">Recent orders</h3>
      {dashboard.orders === null ? (
        <p>Orders unavailable. Check database permissions and connectivity.</p>
      ) : dashboard.orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-3">Order</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.orders.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="p-3">{order.order_number}</td>
                  <td>{order.order_status}</td>
                  <td>
                    {formatGHS(Number(order.total ?? order.subtotal))}
                    {order.total === null && " (subtotal)"}
                  </td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h3 className="mb-3 mt-8 text-xl font-semibold">Recent Buy/Sell/Swap requests</h3>
      {dashboard.requests === null ? (
        <p>Requests unavailable. Check database permissions and connectivity.</p>
      ) : dashboard.requests.length === 0 ? (
        <p>No requests yet.</p>
      ) : (
        <ul className="space-y-3">
          {dashboard.requests.map((request) => (
            <li key={request.id} className="surface-card p-4">
              <span className="font-semibold">{request.request_number}</span> ·{" "}
              {request.request_type} · {request.current_model || "Device unspecified"}
              <p className="mt-1 text-sm text-muted-foreground">
                {request.admin_status} · {new Date(request.created_at).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AdminLayout>
  );
}
