import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, MessageCircle, Phone, Search } from "lucide-react";
import { useState } from "react";
import {
  adminListOrders,
  adminUpdateOrder,
  ORDER_STATUSES,
  type AdminOrderUpdate,
} from "@/lib/admin.functions";
import { formatGHS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ConfirmButton, ghPhone, LoadState, PanelHeader, Pill, useAdminAction } from "./shared";

type Status = (typeof ORDER_STATUSES)[number];
const FILTERS: Array<{ key: Status | "all" | "action"; label: string }> = [
  { key: "action", label: "Needs action" },
  { key: "all", label: "All" },
  { key: "payment_confirmed", label: "Paid" },
  { key: "processing", label: "Processing" },
  { key: "ready", label: "Ready" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];
const NEXT: Array<{
  value: "processing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
  label: string;
}> = [
  { value: "processing", label: "Processing" },
  { value: "ready", label: "Ready for pickup/dispatch" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered / collected" },
];

export function OrdersPanel() {
  const list = useServerFn(adminListOrders);
  const update = useServerFn(adminUpdateOrder);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("action");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin-orders", filter === "all" || filter === "action" ? null : filter, search],
    queryFn: () =>
      list({
        data: {
          ...(filter !== "all" && filter !== "action" ? { status: filter } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      }),
  });
  const action = useAdminAction(
    (args: AdminOrderUpdate) => update({ data: args }),
    ["admin-orders"],
    "Order updated",
  );

  const rows = (q.data ?? []).filter(
    (o) =>
      filter !== "action" ||
      ["pending", "payment_pending_verification"].includes(o.order_status) ||
      (o.payment_status === "successful" && !["delivered", "cancelled"].includes(o.order_status)),
  );

  return (
    <div>
      <PanelHeader
        title="Orders"
        text="Payments stay unconfirmed until you verify them here. Confirming a payment deducts stock."
      >
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <span className="sr-only">Search orders</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order no., name or phone"
            className="h-10 w-full rounded-full border border-input bg-card pl-9 pr-4 text-sm outline-none focus:border-primary/60 sm:w-64"
          />
        </label>
      </PanelHeader>

      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors",
              filter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <LoadState
        loading={q.isLoading}
        error={q.isError}
        empty={!q.isLoading && rows.length === 0}
        retry={() => void q.refetch()}
      />

      <ul className="mt-5 space-y-3">
        {rows.map((o) => {
          const expanded = open === o.id;
          const pendingRef = o.payments?.find((p) => p.status === "pending_verification");
          return (
            <li key={o.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : o.id)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {o.order_number}
                    <Pill
                      tone={
                        o.order_status === "cancelled"
                          ? "danger"
                          : o.order_status === "delivered"
                            ? "success"
                            : "gold"
                      }
                    >
                      {o.order_status.replace(/_/g, " ")}
                    </Pill>
                    <Pill
                      tone={
                        o.payment_status === "successful"
                          ? "success"
                          : o.payment_status === "pending_verification"
                            ? "blue"
                            : "muted"
                      }
                    >
                      {o.payment_status === "pending_verification"
                        ? "reference to check"
                        : `payment ${o.payment_status.replace(/_/g, " ")}`}
                    </Pill>
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {o.full_name} · {o.fulfillment_method} ·{" "}
                    {formatGHS(Number(o.total ?? o.subtotal))}
                    {o.total === null ? " + delivery" : ""} ·{" "}
                    {new Date(o.created_at).toLocaleString("en-GH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "size-5 shrink-0 text-muted-foreground transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </button>

              {expanded && (
                <div className="grid gap-5 border-t border-border p-4 animate-in fade-in slide-in-from-top-1 lg:grid-cols-2">
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Customer</p>
                      <p className="mt-1">{o.full_name}</p>
                      <p className="flex flex-wrap gap-3">
                        <a
                          href={`tel:${o.phone}`}
                          className="inline-flex items-center gap-1 text-primary"
                        >
                          <Phone className="size-3.5" /> {o.phone}
                        </a>
                        <a
                          href={`https://wa.me/${ghPhone(o.phone)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-whatsapp"
                        >
                          <MessageCircle className="size-3.5" /> WhatsApp
                        </a>
                      </p>
                      {o.email && <p className="text-muted-foreground">{o.email}</p>}
                      {o.fulfillment_method === "delivery" && (
                        <p className="mt-1 text-muted-foreground">
                          {[o.delivery_address, o.landmark, o.city, o.region]
                            .filter(Boolean)
                            .join(", ") || "No address given"}
                        </p>
                      )}
                      {o.notes && (
                        <p className="mt-1 rounded-lg bg-secondary/60 p-2 text-muted-foreground">
                          “{o.notes}”
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Items</p>
                      <ul className="mt-1 space-y-1">
                        {(o.items ?? []).map((i) => (
                          <li key={i.id} className="flex justify-between gap-3">
                            <span>
                              {i.product_name_snapshot} × {i.quantity}
                              <span className="block text-xs text-muted-foreground">
                                {i.sku_snapshot}
                              </span>
                            </span>
                            <span>{formatGHS(i.subtotal)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
                        <span>{o.delivery_fee_confirmed ? "Total" : "Items total"}</span>
                        <span>{formatGHS(Number(o.total ?? o.subtotal))}</span>
                      </p>
                    </div>
                    {o.payments && o.payments.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          MoMo references
                        </p>
                        <ul className="mt-1 space-y-1">
                          {o.payments.map((p) => (
                            <li key={p.id} className="flex justify-between gap-2">
                              <span className="font-mono text-[13px]">{p.reference}</span>
                              <span className="text-xs capitalize text-muted-foreground">
                                {formatGHS(p.amount)} · {p.status.replace(/_/g, " ")}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {o.order_status !== "cancelled" && o.payment_status !== "successful" && (
                      <div className="rounded-xl border border-border p-3">
                        <p className="text-sm font-semibold">Payment</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {pendingRef
                            ? `Check reference ${pendingRef.reference} for ${formatGHS(pendingRef.amount)} in your MoMo history before confirming.`
                            : "No reference submitted yet. Confirm only once the money has arrived."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <ConfirmButton
                            disabled={action.isPending}
                            onConfirm={() =>
                              action.mutate({ action: "confirm_payment", order_id: o.id })
                            }
                          >
                            Confirm payment received
                          </ConfirmButton>
                          {pendingRef && (
                            <ConfirmButton
                              tone="danger"
                              disabled={action.isPending}
                              onConfirm={() =>
                                action.mutate({ action: "reject_payment", order_id: o.id })
                              }
                            >
                              Reference not found
                            </ConfirmButton>
                          )}
                        </div>
                      </div>
                    )}

                    {o.fulfillment_method === "delivery" &&
                      !o.delivery_fee_confirmed &&
                      o.order_status !== "cancelled" && (
                        <DeliveryFee
                          onSave={(fee) =>
                            action.mutate({ action: "set_delivery_fee", order_id: o.id, fee })
                          }
                          pending={action.isPending}
                        />
                      )}

                    {o.order_status !== "cancelled" && (
                      <div className="rounded-xl border border-border p-3">
                        <p className="text-sm font-semibold">Progress</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {NEXT.filter(
                            (n) =>
                              o.fulfillment_method === "delivery" || n.value !== "out_for_delivery",
                          ).map((n) => (
                            <button
                              key={n.value}
                              type="button"
                              disabled={
                                action.isPending ||
                                o.payment_status !== "successful" ||
                                o.order_status === n.value
                              }
                              onClick={() =>
                                action.mutate({
                                  action: "set_status",
                                  order_id: o.id,
                                  status: n.value,
                                })
                              }
                              className={cn(
                                "h-9 rounded-full border px-3 text-xs font-semibold transition-colors disabled:opacity-40",
                                o.order_status === n.value
                                  ? "border-primary bg-primary/15 text-primary"
                                  : "border-border hover:bg-secondary",
                              )}
                            >
                              {n.label}
                            </button>
                          ))}
                        </div>
                        {o.payment_status !== "successful" && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Confirm payment first to move the order forward.
                          </p>
                        )}
                        <div className="mt-3 space-y-1">
                          {o.payment_status === "successful" && (
                            <p className="text-xs text-muted-foreground">
                              Cancelling a paid order doesn&apos;t restock items or refund the
                              customer — update stock in Products if items come back.
                            </p>
                          )}
                          <ConfirmButton
                            tone="danger"
                            disabled={action.isPending}
                            onConfirm={() =>
                              action.mutate({
                                action: "set_status",
                                order_id: o.id,
                                status: "cancelled",
                              })
                            }
                          >
                            Cancel order
                          </ConfirmButton>
                        </div>
                      </div>
                    )}

                    {o.history && o.history.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">History</p>
                        <ol className="mt-2 space-y-2 border-l border-border pl-4 text-xs">
                          {[...o.history]
                            .sort((a, b) => a.created_at.localeCompare(b.created_at))
                            .map((h) => (
                              <li key={h.id}>
                                <span className="font-semibold capitalize">
                                  {h.status.replace(/_/g, " ")}
                                </span>
                                <span className="text-muted-foreground">
                                  {" "}
                                  ·{" "}
                                  {new Date(h.created_at).toLocaleString("en-GH", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </span>
                                {h.note && <p className="text-muted-foreground">{h.note}</p>}
                              </li>
                            ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DeliveryFee({ onSave, pending }: { onSave: (fee: number) => void; pending: boolean }) {
  const [fee, setFee] = useState("");
  const value = Number(fee);
  const ok = fee.trim() !== "" && Number.isFinite(value) && value >= 0;
  return (
    <form
      className="rounded-xl border border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onSave(value);
      }}
    >
      <label htmlFor="fee" className="text-sm font-semibold">
        Delivery fee (GH₵)
      </label>
      <p className="mt-1 text-xs text-muted-foreground">
        Agree the fee with the customer first. Saving it sets the order total.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          id="fee"
          inputMode="decimal"
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          placeholder="e.g. 20"
          className="h-10 w-28 rounded-full border border-input bg-background px-4 text-sm outline-none focus:border-primary/60"
        />
        <button
          type="submit"
          disabled={!ok || pending}
          className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          Save fee
        </button>
      </div>
    </form>
  );
}
