import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import {
  adminListRequests,
  adminUpdateRequest,
  REQUEST_STATUSES,
  type AdminRequestUpdate,
} from "@/lib/admin.functions";
import { formatGHS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ghPhone, LoadState, PanelHeader, Pill, useAdminAction } from "./shared";

type Status = (typeof REQUEST_STATUSES)[number];
const LABEL: Record<Status, string> = {
  pending_review: "Waiting for review",
  contacted: "Customer contacted",
  inspection_scheduled: "Inspection booked",
  offer_made: "Offer made",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};

export function RequestsPanel() {
  const list = useServerFn(adminListRequests);
  const update = useServerFn(adminUpdateRequest);
  const q = useQuery({ queryKey: ["admin-requests"], queryFn: () => list() });
  const save = useAdminAction(
    (args: AdminRequestUpdate) => update({ data: args }),
    ["admin-requests"],
    "Request updated",
  );
  const [open, setOpen] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const rows = (q.data ?? []).filter(
    (r) => showClosed || !["completed", "declined", "cancelled"].includes(r.admin_status),
  );

  return (
    <div>
      <PanelHeader
        title="Sell & swap requests"
        text="Offers are provisional until the device is inspected in person."
      >
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
            className="size-4 accent-[#f6c21c]"
          />
          Show closed
        </label>
      </PanelHeader>
      <LoadState
        loading={q.isLoading}
        error={q.isError}
        empty={!q.isLoading && rows.length === 0}
        retry={() => void q.refetch()}
      />
      <ul className="mt-5 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            <button
              type="button"
              onClick={() => setOpen(open === r.id ? null : r.id)}
              aria-expanded={open === r.id}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {r.request_number}
                  <Pill tone={r.request_type === "swap" ? "blue" : "gold"}>{r.request_type}</Pill>
                  <Pill
                    tone={
                      r.admin_status === "completed"
                        ? "success"
                        : ["declined", "cancelled"].includes(r.admin_status)
                          ? "muted"
                          : "gold"
                    }
                  >
                    {LABEL[r.admin_status as Status] ?? r.admin_status}
                  </Pill>
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {[r.current_brand, r.current_model, r.current_storage]
                    .filter(Boolean)
                    .join(" ") || "Device"}{" "}
                  · {r.customer_name} · {new Date(r.created_at).toLocaleDateString("en-GH")}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "size-5 shrink-0 text-muted-foreground transition-transform",
                  open === r.id && "rotate-180",
                )}
              />
            </button>
            {open === r.id && (
              <RequestEditor
                request={r}
                pending={save.isPending}
                onSave={(v) => save.mutate({ id: r.id, ...v })}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RequestEditor({
  request: r,
  pending,
  onSave,
}: {
  request: Awaited<ReturnType<typeof adminListRequests>>[number];
  pending: boolean;
  onSave: (v: {
    admin_status: Status;
    admin_offer: number | null;
    admin_notes: string | null;
  }) => void;
}) {
  const [status, setStatus] = useState<Status>(
    (REQUEST_STATUSES as readonly string[]).includes(r.admin_status)
      ? (r.admin_status as Status)
      : "pending_review",
  );
  const [offer, setOffer] = useState(r.admin_offer != null ? String(r.admin_offer) : "");
  const [notes, setNotes] = useState(r.admin_notes ?? "");
  const offerNum = offer.trim() === "" ? null : Number(offer);
  const offerOk = offerNum === null || (Number.isFinite(offerNum) && offerNum >= 0);

  return (
    <div className="grid gap-5 border-t border-border p-4 text-sm animate-in fade-in slide-in-from-top-1 lg:grid-cols-2">
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5">
        <dt className="text-muted-foreground">Customer</dt>
        <dd>{r.customer_name}</dd>
        <dt className="text-muted-foreground">Phone</dt>
        <dd className="flex flex-wrap gap-3">
          <a
            href={`tel:${r.customer_phone}`}
            className="inline-flex items-center gap-1 text-primary"
          >
            <Phone className="size-3.5" /> {r.customer_phone}
          </a>
          <a
            href={`https://wa.me/${ghPhone(r.customer_phone)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-whatsapp"
          >
            <MessageCircle className="size-3.5" /> WhatsApp
          </a>
        </dd>
        <dt className="text-muted-foreground">Condition</dt>
        <dd>{r.current_condition || "—"}</dd>
        <dt className="text-muted-foreground">Battery</dt>
        <dd>{r.battery_health_percent != null ? `${r.battery_health_percent}%` : "—"}</dd>
        <dt className="text-muted-foreground">IMEI / serial</dt>
        <dd className="font-mono text-[13px]">{r.imei_or_serial || "—"}</dd>
        {r.desired && (
          <>
            <dt className="text-muted-foreground">Wants</dt>
            <dd>{r.desired.name}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Notes</dt>
        <dd className="whitespace-pre-line">{r.customer_notes || "—"}</dd>
      </dl>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (offerOk)
            onSave({
              admin_status: status,
              admin_offer: offerNum,
              admin_notes: notes.trim() || null,
            });
        }}
      >
        <div>
          <label htmlFor={`st-${r.id}`} className="text-xs font-semibold text-muted-foreground">
            Status
          </label>
          <select
            id={`st-${r.id}`}
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 outline-none focus:border-primary/60"
          >
            {REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`of-${r.id}`} className="text-xs font-semibold text-muted-foreground">
            Provisional offer (GH₵, optional)
          </label>
          <input
            id={`of-${r.id}`}
            inputMode="decimal"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            className={cn(
              "mt-1 h-10 w-full rounded-xl border bg-background px-3 outline-none focus:border-primary/60",
              offerOk ? "border-input" : "border-destructive",
            )}
          />
          {offerNum !== null && offerOk && (
            <p className="mt-1 text-xs text-muted-foreground">
              Customer sees {formatGHS(offerNum)} (final after inspection).
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`nt-${r.id}`} className="text-xs font-semibold text-muted-foreground">
            Internal notes
          </label>
          <textarea
            id={`nt-${r.id}`}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background p-3 outline-none focus:border-primary/60"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !offerOk}
          className="h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
