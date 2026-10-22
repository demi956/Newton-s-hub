import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, LayoutDashboard, LogOut, Package, Repeat2, Wifi } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { listMyBundleOrders, listMyOrders } from "@/lib/orders.functions";
import { listMyRequests } from "@/lib/requests.functions";
import { listProducts } from "@/lib/catalog.functions";
import { getAdminAccess } from "@/lib/admin.functions";
import { formatGHS } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/lib/wishlist";
import type { CatalogProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account — Newton's Hub" },
      {
        name: "description",
        content: "Track your Newton's Hub orders, swaps, data requests and saved items.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

const ORDER_STEPS = [
  "pending",
  "payment_pending_verification",
  "payment_confirmed",
  "processing",
  "ready",
  "delivered",
] as const;
const STEP_LABEL: Record<string, string> = {
  pending: "Awaiting payment",
  payment_pending_verification: "Payment being checked",
  payment_confirmed: "Payment confirmed",
  processing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Completed",
  cancelled: "Cancelled",
};
const REQUEST_LABEL: Record<string, string> = {
  pending_review: "Waiting for review",
  submitted: "Waiting for review",
  contacted: "We've contacted you",
  inspection_scheduled: "Inspection booked",
  offer_made: "Offer made",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};

function Account() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const wishlist = useWishlist();
  const fetchOrders = useServerFn(listMyOrders);
  const fetchRequests = useServerFn(listMyRequests);
  const fetchBundles = useServerFn(listMyBundleOrders);
  const fetchProducts = useServerFn(listProducts);
  const checkAdmin = useServerFn(getAdminAccess);

  const orders = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: () => fetchOrders(),
  });
  const requests = useQuery({
    queryKey: ["my-requests", user?.id],
    enabled: !!user,
    queryFn: () => fetchRequests(),
  });
  const bundles = useQuery({
    queryKey: ["my-bundles", user?.id],
    enabled: !!user,
    queryFn: () => fetchBundles(),
  });
  const isAdmin = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: () => checkAdmin(),
    staleTime: 300_000,
  });
  const products = useQuery({
    queryKey: ["products", "all"],
    enabled: wishlist.count > 0,
    queryFn: () => fetchProducts({ data: {} }),
    staleTime: 60_000,
  });
  const saved = ((products.data ?? []) as unknown as CatalogProduct[]).filter((p) =>
    wishlist.has(p.id),
  );

  // Honour #wishlist / #requests links once content has rendered.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const t = window.setTimeout(
      () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }),
      300,
    );
    return () => window.clearTimeout(t);
  }, []);

  const name =
    (user?.user_metadata?.["first_name"] as string | undefined) || user?.email?.split("@")[0];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Hi{name ? `, ${name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin.data === true && (
            <Button asChild variant="secondary" className="rounded-full">
              <Link to="/admin">
                <LayoutDashboard className="mr-1 size-4" /> Admin dashboard
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            className="rounded-full border-white/15 bg-transparent"
            onClick={async () => {
              await supabase.auth.signOut();
              void navigate({ to: "/" });
            }}
          >
            <LogOut className="mr-1 size-4" /> Sign out
          </Button>
        </div>
      </div>

      <nav
        aria-label="Account sections"
        className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        {[
          { href: "#orders", label: "Orders", icon: Package },
          { href: "#requests", label: "Sell & swap", icon: Repeat2 },
          { href: "#data", label: "Data", icon: Wifi },
          {
            href: "#wishlist",
            label: `Wishlist${wishlist.count ? ` (${wishlist.count})` : ""}`,
            icon: Heart,
          },
        ].map((s) => (
          <a
            key={s.href}
            href={s.href}
            className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <s.icon className="size-4" /> {s.label}
          </a>
        ))}
      </nav>

      {/* Orders */}
      <Section id="orders" title="Orders">
        {orders.isLoading ? (
          <Skeletons />
        ) : orders.isError ? (
          <ErrorNote onRetry={() => void orders.refetch()} />
        ) : (orders.data ?? []).length === 0 ? (
          <Empty
            text="You haven't placed an order yet."
            cta={{ to: "/shop", label: "Start shopping" }}
          />
        ) : (
          <ul className="space-y-3">
            {orders.data!.map((order) => {
              const status = String(order.order_status);
              const idx = ORDER_STEPS.indexOf(status as (typeof ORDER_STEPS)[number]);
              return (
                <li key={order.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("en-GH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        · {order.fulfillment_method === "pickup" ? "Pickup" : "Delivery"}
                      </p>
                    </div>
                    <StatusPill
                      tone={
                        status === "cancelled"
                          ? "muted"
                          : status === "delivered"
                            ? "success"
                            : "gold"
                      }
                    >
                      {STEP_LABEL[status] ?? status.replace(/_/g, " ")}
                    </StatusPill>
                  </div>
                  {status !== "cancelled" && (
                    <div className="mt-4 flex gap-1" aria-hidden>
                      {ORDER_STEPS.map((s, i) => (
                        <span
                          key={s}
                          className={cn(
                            "h-1.5 flex-1 rounded-full",
                            i <= Math.max(idx, status === "out_for_delivery" ? 4 : idx)
                              ? "bg-primary"
                              : "bg-white/10",
                          )}
                        />
                      ))}
                    </div>
                  )}
                  <ul className="mt-3 space-y-0.5 text-sm text-muted-foreground">
                    {(order.items ?? []).map((item) => (
                      <li key={item.id}>
                        {item.product_name_snapshot} × {item.quantity}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm font-semibold">
                    {order.total != null
                      ? formatGHS(order.total)
                      : `${formatGHS(order.subtotal)} + delivery fee (to be confirmed)`}
                  </p>
                  {status === "pending" && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Send payment by mobile money, then message us your transaction ID on WhatsApp
                      if you didn&apos;t submit it at checkout.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Sell & swap */}
      <Section id="requests" title="Sell & swap requests">
        {requests.isLoading ? (
          <Skeletons />
        ) : requests.isError ? (
          <ErrorNote onRetry={() => void requests.refetch()} />
        ) : (requests.data ?? []).length === 0 ? (
          <Empty
            text="No sell or swap requests yet."
            cta={{ to: "/buy-sell-swap", label: "Sell or swap a device" }}
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {requests.data!.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{r.request_number}</p>
                    <p className="text-sm capitalize text-muted-foreground">
                      {r.request_type} ·{" "}
                      {[r.current_brand, r.current_model].filter(Boolean).join(" ") || "Device"}
                    </p>
                  </div>
                  <StatusPill
                    tone={
                      r.admin_status === "completed"
                        ? "success"
                        : ["declined", "cancelled"].includes(r.admin_status)
                          ? "muted"
                          : "gold"
                    }
                  >
                    {REQUEST_LABEL[r.admin_status] ?? r.admin_status.replace(/_/g, " ")}
                  </StatusPill>
                </div>
                {r.admin_offer != null && (
                  <p className="mt-2 text-sm">
                    Offer: <span className="font-semibold">{formatGHS(r.admin_offer)}</span>{" "}
                    <span className="text-muted-foreground">(final after inspection)</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Data */}
      <Section id="data" title="Data bundle requests">
        {bundles.isLoading ? (
          <Skeletons />
        ) : bundles.isError ? (
          <ErrorNote onRetry={() => void bundles.refetch()} />
        ) : (bundles.data ?? []).length === 0 ? (
          <Empty
            text="No data requests saved to your account."
            cta={{ to: "/bundles", label: "Buy data" }}
          />
        ) : (
          <ul className="space-y-2">
            {bundles.data!.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm"
              >
                <span>
                  <span className="font-semibold">{b.order_number}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {b.bundle ? `${b.bundle.network} ${b.bundle.name}` : "Bundle"} →{" "}
                    {b.receiving_phone}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{formatGHS(b.amount)}</span>
                  <StatusPill
                    tone={
                      b.status === "completed"
                        ? "success"
                        : ["failed", "cancelled"].includes(b.status)
                          ? "muted"
                          : "gold"
                    }
                  >
                    {b.status.replace(/_/g, " ")}
                  </StatusPill>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Wishlist */}
      <Section id="wishlist" title="Wishlist">
        {wishlist.count === 0 ? (
          <Empty
            text="Tap the heart on any product to save it here."
            cta={{ to: "/shop", label: "Browse products" }}
          />
        ) : products.isLoading ? (
          <Skeletons />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
            {saved.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <h2 className="mb-4 font-display text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "gold" | "success" | "muted";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        tone === "gold" && "bg-primary/15 text-primary",
        tone === "success" && "bg-success/15 text-success",
        tone === "muted" && "bg-white/5 text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function Skeletons() {
  return (
    <div className="space-y-3">
      <div className="skeleton-shimmer h-24 rounded-2xl" />
      <div className="skeleton-shimmer h-24 rounded-2xl" />
    </div>
  );
}

function Empty({
  text,
  cta,
}: {
  text: string;
  cta: { to: "/shop" | "/buy-sell-swap" | "/bundles"; label: string };
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button asChild size="sm" className="rounded-full">
        <Link to={cta.to}>{cta.label}</Link>
      </Button>
    </div>
  );
}

function ErrorNote({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
      <span>This section couldn&apos;t load.</span>
      <Button size="sm" variant="outline" className="rounded-full" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
