import { requireRouteAuth } from "@/lib/auth-guard";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { submitBuySwapRequest } from "@/lib/requests.functions";

import { BUSINESS } from "@/lib/business";

export const Route = createFileRoute("/buy-sell-swap")({
  ssr: false,
  beforeLoad: requireRouteAuth,
  head: () => ({
    meta: [
      { title: "Sell or swap your phone — Newton's Hub" },
      {
        name: "description",
        content:
          "Tell Newton's Hub about your phone and we'll review it. Every sell or swap offer is agreed in person after we inspect the device.",
      },
      { property: "og:title", content: "Sell or swap your phone — Newton's Hub" },
      {
        property: "og:description",
        content: "Submit your device details and we'll come back with an offer.",
      },
    ],
  }),
  component: BuySellSwap,
});

function BuySellSwap() {
  const send = useServerFn(submitBuySwapRequest);
  const [type, setType] = useState<"sell" | "swap">("sell");
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    current_brand: "",
    current_model: "",
    current_storage: "",
    current_condition: "",
    imei_or_serial: "",
    customer_notes: "",
  });
  const [owned, setOwned] = useState(false);
  const [ref, setRef] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      send({
        data: {
          request_type: type,
          ownership_confirmed: owned,

          ...form,
        },
      }),
    onSuccess: (res) => setRef(res.request_number),
    onError: (e: Error) => toast.error(e.message),
  });

  if (ref) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Request {ref} received</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {BUSINESS.name} will review your device and contact you on {form.customer_phone}. Final
          value is agreed after we inspect the phone in person.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Sell or swap your phone</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We don&apos;t quote prices online. Send your device details and we&apos;ll come back to you
        with an offer after inspection.
      </p>

      <div className="mt-6 flex gap-2">
        <Button variant={type === "sell" ? "default" : "outline"} onClick={() => setType("sell")}>
          Sell to us
        </Button>
        <Button variant={type === "swap" ? "default" : "outline"} onClick={() => setType("swap")}>
          Swap for another phone
        </Button>
      </div>

      <div className="surface-card mt-6 grid gap-4 p-6 sm:grid-cols-2">
        <F
          id="customer_name"
          label="Your name"
          value={form.customer_name}
          set={(v) => setForm({ ...form, customer_name: v })}
        />
        <F
          id="customer_phone"
          label="Phone number"
          value={form.customer_phone}
          set={(v) => setForm({ ...form, customer_phone: v })}
        />
        <F
          id="current_brand"
          label="Phone brand"
          value={form.current_brand}
          set={(v) => setForm({ ...form, current_brand: v })}
        />
        <F
          id="current_model"
          label="Model"
          value={form.current_model}
          set={(v) => setForm({ ...form, current_model: v })}
        />
        <F
          id="current_storage"
          label="Storage"
          value={form.current_storage}
          set={(v) => setForm({ ...form, current_storage: v })}
        />
        <F
          id="current_condition"
          label="Condition"
          value={form.current_condition}
          set={(v) => setForm({ ...form, current_condition: v })}
        />
        <div className="sm:col-span-2">
          <F
            id="imei_or_serial"
            label="IMEI or serial (optional)"
            value={form.imei_or_serial}
            set={(v) => setForm({ ...form, imei_or_serial: v })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Anything else we should know?</Label>
          <Textarea
            id="notes"
            className="mt-1"
            rows={4}
            value={form.customer_notes}
            onChange={(e) => setForm({ ...form, customer_notes: e.target.value })}
          />
        </div>
        <label className="flex items-start gap-3 text-sm sm:col-span-2">
          <Checkbox
            checked={owned}
            onCheckedChange={(v) => setOwned(v === true)}
            className="mt-0.5"
          />
          <span>
            I confirm this device belongs to me and I can show proof of ownership. Newton&apos;s Hub
            may ask for a witness before completing a swap.
          </span>
        </label>
        <Button
          className="sm:col-span-2"
          size="lg"
          disabled={
            !owned ||
            form.customer_name.trim().length < 2 ||
            form.customer_phone.trim().length < 6 ||
            mutation.isPending
          }
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Sending…" : "Submit request"}
        </Button>
      </div>
    </div>
  );
}

function F({
  id,
  label,
  value,
  set,
}: {
  id: string;
  label: string;
  value: string;
  set: (v: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="mt-1" value={value} onChange={(e) => set(e.target.value)} />
    </div>
  );
}
