import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import {
  adminListBundleOrders,
  adminListMessages,
  adminUpdateBundleOrder,
  adminUpdateMessage,
  type AdminBundleUpdate,
  type AdminMessageUpdate,
} from "@/lib/admin.functions";
import { formatGHS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ghPhone, LoadState, PanelHeader, Pill, useAdminAction } from "./shared";

const BUNDLE_STATUSES = [
  "pending",
  "payment_confirmed",
  "processing",
  "completed",
  "failed",
  "cancelled",
] as const;

export function BundlesPanel() {
  const list = useServerFn(adminListBundleOrders);
  const update = useServerFn(adminUpdateBundleOrder);
  const q = useQuery({ queryKey: ["admin-bundles"], queryFn: () => list() });
  const save = useAdminAction(
    (args: AdminBundleUpdate) => update({ data: args }),
    ["admin-bundles"],
    "Data request updated",
  );
  const [showDone, setShowDone] = useState(false);
  const rows = (q.data ?? []).filter(
    (b) => showDone || !["completed", "failed", "cancelled"].includes(b.status),
  );

  return (
    <div>
      <PanelHeader
        title="Data requests"
        text="Requests from signed-in customers. Guest bundle orders arrive on WhatsApp only."
      >
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
            className="size-4 accent-[#f6c21c]"
          />
          Show finished
        </label>
      </PanelHeader>
      <LoadState
        loading={q.isLoading}
        error={q.isError}
        empty={!q.isLoading && rows.length === 0}
        retry={() => void q.refetch()}
      />
      <ul className="mt-5 space-y-2">
        {rows.map((b) => (
          <li
            key={b.id}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 text-sm">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {b.order_number}
                <Pill
                  tone={
                    b.status === "completed"
                      ? "success"
                      : ["failed", "cancelled"].includes(b.status)
                        ? "danger"
                        : "gold"
                  }
                >
                  {b.status.replace(/_/g, " ")}
                </Pill>
              </p>
              <p className="mt-1 text-muted-foreground">
                {b.bundle ? `${b.bundle.network} ${b.bundle.name}` : "Bundle"} ·{" "}
                {formatGHS(b.amount)} → {b.receiving_phone} ·{" "}
                {new Date(b.created_at).toLocaleString("en-GH", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <label className="sr-only" htmlFor={`b-${b.id}`}>
              Status for {b.order_number}
            </label>
            <select
              id={`b-${b.id}`}
              value={b.status}
              disabled={save.isPending}
              onChange={(e) =>
                save.mutate({
                  id: b.id,
                  status: e.target.value as (typeof BUNDLE_STATUSES)[number],
                })
              }
              className="h-10 rounded-full border border-input bg-background px-4 text-sm capitalize outline-none focus:border-primary/60"
            >
              {BUNDLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MessagesPanel() {
  const list = useServerFn(adminListMessages);
  const update = useServerFn(adminUpdateMessage);
  const q = useQuery({ queryKey: ["admin-messages"], queryFn: () => list() });
  const save = useAdminAction(
    (args: AdminMessageUpdate) => update({ data: args }),
    ["admin-messages"],
    "Message updated",
  );
  const [showResolved, setShowResolved] = useState(false);
  const rows = (q.data ?? []).filter((m) => showResolved || m.status !== "resolved");

  return (
    <div>
      <PanelHeader title="Messages" text="Contact form messages from signed-in customers.">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="size-4 accent-[#f6c21c]"
          />
          Show resolved
        </label>
      </PanelHeader>
      <LoadState
        loading={q.isLoading}
        error={q.isError}
        empty={!q.isLoading && rows.length === 0}
        retry={() => void q.refetch()}
      />
      <ul className="mt-5 space-y-3">
        {rows.map((m) => (
          <li
            key={m.id}
            className={cn(
              "rounded-2xl border bg-card p-4",
              m.status === "new" ? "border-primary/40" : "border-border",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {m.subject || "No subject"}
                  <Pill
                    tone={
                      m.status === "new" ? "gold" : m.status === "resolved" ? "success" : "blue"
                    }
                  >
                    {m.status.replace(/_/g, " ")}
                  </Pill>
                </p>
                <p className="text-sm text-muted-foreground">
                  {m.name} ·{" "}
                  {new Date(m.created_at).toLocaleString("en-GH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                {(["in_progress", "resolved"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={save.isPending || m.status === s}
                    onClick={() => save.mutate({ id: m.id, status: s })}
                    className="h-9 rounded-full border border-border px-3 text-xs font-semibold hover:bg-secondary disabled:opacity-40"
                  >
                    {s === "in_progress" ? "Mark in progress" : "Mark resolved"}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm">{m.message}</p>
            <p className="mt-3 flex flex-wrap gap-4 text-sm">
              {m.phone && (
                <>
                  <a
                    href={`tel:${m.phone}`}
                    className="inline-flex items-center gap-1 text-primary"
                  >
                    <Phone className="size-3.5" /> {m.phone}
                  </a>
                  <a
                    href={`https://wa.me/${ghPhone(m.phone)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-whatsapp"
                  >
                    <MessageCircle className="size-3.5" /> WhatsApp
                  </a>
                </>
              )}
              {m.email && (
                <a href={`mailto:${m.email}`} className="text-primary">
                  {m.email}
                </a>
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
