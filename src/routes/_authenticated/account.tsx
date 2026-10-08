import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyOrders } from "@/lib/orders.functions";
import { formatGHS } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account — Newton's Hub" },
      { name: "description", content: "Track your Newton's Hub orders and account details." },
      { property: "og:title", content: "My account — Newton's Hub" },
      { property: "og:description", content: "Track your Newton's Hub orders." },
    ],
  }),
  component: Account,
});

function Account() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fetchOrders = useServerFn(listMyOrders);
  const { data, isLoading } = useQuery({ queryKey: ["my-orders", user?.id], enabled: !!user, queryFn: () => fetchOrders() });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">My account</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/" });
          }}
        >
          Sign out
        </Button>
      </div>

      <h2 className="mt-10 font-display text-xl font-semibold">Your orders</h2>
      <div className="mt-4 space-y-3">
        {isLoading &&
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}

        {!isLoading && (data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">You haven&apos;t placed an order yet.</p>
        )}

        {(data ?? []).map((order) => (
          <div key={order.id} className="surface-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{order.order_number}</span>
              <div className="flex gap-2">
                <Badge variant="secondary">{String(order.order_status).replace(/_/g, " ")}</Badge>
                <Badge variant="outline">{String(order.payment_status).replace(/_/g, " ")}</Badge>
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {(order.items ?? []).map((item) => (
                <li key={item.id}>
                  {item.product_name_snapshot} × {item.quantity}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm font-semibold">
              {order.total != null
                ? formatGHS(order.total)
                : `${formatGHS(order.subtotal)} + delivery fee to be confirmed`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
