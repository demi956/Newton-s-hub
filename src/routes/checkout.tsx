import { requireRouteAuth } from "@/lib/auth-guard";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart } from "@/lib/cart";

import { formatGHS } from "@/lib/format";
import { BUSINESS } from "@/lib/business";
import { createOrder, submitMomoReference } from "@/lib/orders.functions";

export const Route = createFileRoute("/checkout")({
  ssr: false,
  beforeLoad: requireRouteAuth,
  head: () => ({
    meta: [
      { title: "Checkout — Newton's Hub" },
      {
        name: "description",
        content:
          "Place your Newton's Hub order: choose pickup or delivery, then pay by mobile money. Delivery fee is confirmed after you order.",
      },
      { property: "og:title", content: "Checkout — Newton's Hub" },
      { property: "og:description", content: "Place your order with Newton's Hub." },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const cart = useCart();

  const place = useServerFn(createOrder);
  const sendReference = useServerFn(submitMomoReference);

  const [method, setMethod] = useState<"delivery" | "pickup">("delivery");
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    region: "",
    city: "",
    delivery_address: "",
    landmark: "",
    notes: "",
  });
  const [placed, setPlaced] = useState<{
    id: string;
    order_number: string;
    subtotal: number;
  } | null>(null);
  const [reference, setReference] = useState("");
  const [referenceSent, setReferenceSent] = useState(false);

  const orderMutation = useMutation({
    mutationFn: () =>
      place({
        data: {
          items: cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
          fulfillment_method: method,

          ...form,
        },
      }),
    onSuccess: (res) => {
      setPlaced(res);
      cart.clear();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const referenceMutation = useMutation({
    mutationFn: () =>
      sendReference({
        data: { order_id: placed!.id, reference, phone: form.phone },
      }),
    onSuccess: () => {
      setReferenceSent(true);
      toast.success("Reference sent. We'll verify and confirm.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (placed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="surface-card p-8">
          <h1 className="font-display text-2xl font-semibold">
            Order {placed.order_number} received
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Items total {formatGHS(placed.subtotal)}.{" "}
            {method === "delivery"
              ? BUSINESS.deliveryNote
              : `Pickup at ${BUSINESS.pickupLocations.join(" or ")}.`}
          </p>

          <div className="mt-6 rounded-lg bg-secondary p-4 text-sm">
            <p className="font-semibold">Pay by mobile money</p>
            <p className="mt-1">
              {BUSINESS.momo.number} — {BUSINESS.momo.accountName}
            </p>
            <p className="mt-2 text-muted-foreground">
              Your payment stays pending until Newton&apos;s Hub confirms it.
            </p>
          </div>

          {!referenceSent ? (
            <div className="mt-6 space-y-3">
              <Label htmlFor="ref">Mobile money transaction reference</Label>
              <Input
                id="ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. 1234567890"
              />
              <Button
                className="w-full"
                disabled={reference.trim().length < 3 || referenceMutation.isPending}
                onClick={() => referenceMutation.mutate()}
              >
                {referenceMutation.isPending ? "Sending…" : "Submit payment reference"}
              </Button>
            </div>
          ) : (
            <p className="mt-6 rounded-lg bg-secondary p-4 text-sm">
              Payment submitted and awaiting verification by Newton&apos;s Hub.
            </p>
          )}

          <Button asChild variant="outline" className="mt-6 w-full">
            <Link to="/shop">Continue shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Your cart is empty</h1>
        <Button asChild className="mt-6">
          <Link to="/shop">Go to shop</Link>
        </Button>
      </div>
    );
  }

  const valid = form.full_name.trim().length > 1 && form.phone.trim().length > 5;

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1fr_320px]">
      <div>
        <h1 className="font-display text-3xl font-semibold">Checkout</h1>

        <div className="surface-card mt-6 p-6">
          <h2 className="text-sm font-semibold">How would you like to receive it?</h2>
          <RadioGroup
            value={method}
            onValueChange={(v) => setMethod(v as "delivery" | "pickup")}
            className="mt-3 space-y-2"
          >
            <label className="flex items-center gap-3 text-sm">
              <RadioGroupItem value="delivery" /> Delivery ({BUSINESS.deliveryNote})
            </label>
            <label className="flex items-center gap-3 text-sm">
              <RadioGroupItem value="pickup" /> Pickup — {BUSINESS.pickupLocations.join(" or ")}
            </label>
          </RadioGroup>
        </div>

        <div className="surface-card mt-6 space-y-4 p-6">
          <h2 className="text-sm font-semibold">Your details</h2>
          <Field
            label="Full name"
            value={form.full_name}
            onChange={(v) => setForm({ ...form, full_name: v })}
          />
          <Field
            label="Phone number"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
          />
          <Field
            label="Email (optional)"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
          />

          {method === "delivery" && (
            <>
              <Field
                label="Region"
                value={form.region}
                onChange={(v) => setForm({ ...form, region: v })}
              />
              <Field
                label="City or town"
                value={form.city}
                onChange={(v) => setForm({ ...form, city: v })}
              />
              <Field
                label="Delivery address"
                value={form.delivery_address}
                onChange={(v) => setForm({ ...form, delivery_address: v })}
              />
              <Field
                label="Landmark"
                value={form.landmark}
                onChange={(v) => setForm({ ...form, landmark: v })}
              />
            </>
          )}

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              className="mt-1"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
      </div>

      <aside className="surface-card h-fit p-6">
        <h2 className="text-sm font-semibold">Order summary</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {cart.lines.map((l) => (
            <li key={l.variantId} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate">{l.name}</span>
                <span className="text-xs text-muted-foreground">
                  {l.variantLabel} × {l.quantity}
                </span>
              </span>
              <span className="font-medium">{formatGHS(l.unitPrice * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-between border-t border-border pt-4 text-sm">
          <span className="text-muted-foreground">Items total</span>
          <span className="font-semibold">{formatGHS(cart.subtotal)}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {method === "delivery" ? BUSINESS.deliveryNote : "No delivery fee for pickup."}
        </p>
        <Button
          className="mt-5 w-full"
          size="lg"
          disabled={!valid || orderMutation.isPending}
          onClick={() => orderMutation.mutate()}
        >
          {orderMutation.isPending ? "Placing order…" : "Place order"}
        </Button>
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
