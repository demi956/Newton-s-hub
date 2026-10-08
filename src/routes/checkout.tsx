import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, CheckCircle2, Copy, Store, Truck } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireRouteAuth } from "@/lib/auth-guard";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/hooks/useAuth";
import { formatGHS } from "@/lib/format";
import { BUSINESS, whatsappLink } from "@/lib/business";
import { createOrder, submitMomoReference } from "@/lib/orders.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  ssr: false,
  beforeLoad: requireRouteAuth,
  head: () => ({
    meta: [
      { title: "Checkout — Newton's Hub" },
      {
        name: "description",
        content:
          "Place your Newton's Hub order: choose pickup or delivery, then pay by mobile money.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

type Form = {
  full_name: string;
  phone: string;
  email: string;
  region: string;
  city: string;
  delivery_address: string;
  landmark: string;
  notes: string;
};

const PHONE_RE = /^(\+?233|0)\d{9}$/;

function validate(form: Form, method: "delivery" | "pickup") {
  const errors: Partial<Record<keyof Form, string>> = {};
  if (form.full_name.trim().length < 2) errors.full_name = "Enter your full name.";
  if (!PHONE_RE.test(form.phone.replace(/[\s-]/g, "")))
    errors.phone = "Enter a Ghana number, e.g. 0244123456.";
  if (form.email && !/^\S+@\S+\.\S+$/.test(form.email))
    errors.email = "Enter a valid email or leave it empty.";
  if (method === "delivery") {
    if (form.city.trim().length < 2) errors.city = "Which town or city should we deliver to?";
    if (form.delivery_address.trim().length < 4)
      errors.delivery_address = "Add a street, hostel or house description.";
  }
  return errors;
}

function Checkout() {
  const cart = useCart();
  const { user } = useAuth();
  const place = useServerFn(createOrder);
  const sendReference = useServerFn(submitMomoReference);
  const requestId = useRef<string>(crypto.randomUUID());

  const [method, setMethod] = useState<"delivery" | "pickup">("pickup");
  const [form, setForm] = useState<Form>({
    full_name: (user?.user_metadata?.["first_name"] as string | undefined) ?? "",
    phone: "",
    email: user?.email ?? "",
    region: "",
    city: "",
    delivery_address: "",
    landmark: "",
    notes: "",
  });
  const [touched, setTouched] = useState(false);
  const [placed, setPlaced] = useState<{
    id: string;
    order_number: string;
    subtotal: number;
    method: "delivery" | "pickup";
    expected: number;
  } | null>(null);
  const [reference, setReference] = useState("");
  const [referenceSent, setReferenceSent] = useState(false);

  const errors = validate(form, method);
  const valid = Object.keys(errors).length === 0;
  const set = (key: keyof Form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const orderMutation = useMutation({
    mutationFn: () =>
      place({
        data: {
          items: cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
          fulfillment_method: method,
          client_request_id: requestId.current,
          ...form,
          phone: form.phone.replace(/[\s-]/g, ""),
          ...(method === "pickup"
            ? { region: "", city: "", delivery_address: "", landmark: "" }
            : {}),
        },
      }),
    onSuccess: (res) => {
      setPlaced({ ...res, method, expected: cart.subtotal });
      cart.clear();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const referenceMutation = useMutation({
    mutationFn: () =>
      sendReference({
        data: { order_id: placed!.id, reference: reference.trim(), phone: form.phone },
      }),
    onSuccess: () => {
      setReferenceSent(true);
      toast.success("Reference received. We'll confirm your payment shortly.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (placed) {
    const priceChanged = Math.abs(placed.subtotal - placed.expected) > 0.009;
    return (
      <div className="mx-auto max-w-xl px-4 py-10 sm:py-16">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-500">
          <CheckCircle2 className="size-12 text-success animate-in zoom-in-50 duration-700" />
          <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">Order received</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your order number is{" "}
            <span className="font-semibold text-foreground">{placed.order_number}</span>. Keep it
            handy.
          </p>
          {priceChanged && (
            <p className="mt-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
              Some prices changed since you added them. Your order uses the current price:{" "}
              {formatGHS(placed.subtotal)}.
            </p>
          )}

          <ol className="mt-6 space-y-4">
            <Step n={1} done title="Order placed" />
            <Step
              n={2}
              done={referenceSent}
              title={`Send ${formatGHS(placed.subtotal)} by mobile money`}
              body={
                <>
                  <p>
                    To <strong>{BUSINESS.momo.number}</strong> ({BUSINESS.momo.accountName}).
                  </p>
                  {placed.method === "delivery" && (
                    <p className="mt-1">
                      This is the items total. We&apos;ll message you to confirm the delivery fee
                      before dispatch.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(BUSINESS.momo.number).then(
                        () => toast.success("MoMo number copied"),
                        () => toast.error("Couldn't copy. The number is " + BUSINESS.momo.number),
                      );
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                  >
                    <Copy className="size-3.5" /> Copy MoMo number
                  </button>
                </>
              }
            />
            <Step
              n={3}
              done={referenceSent}
              title="Tell us your transaction ID"
              body={
                referenceSent ? (
                  <p>
                    Received — your payment is awaiting confirmation by Newton&apos;s Hub. It is not
                    marked paid until we verify it.
                  </p>
                ) : (
                  <form
                    className="mt-1 flex flex-col gap-2 sm:flex-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (reference.trim().length >= 3) referenceMutation.mutate();
                    }}
                  >
                    <Label htmlFor="ref" className="sr-only">
                      Mobile money transaction ID
                    </Label>
                    <Input
                      id="ref"
                      inputMode="numeric"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Transaction ID from your MoMo SMS"
                      className="h-11 flex-1 rounded-full"
                    />
                    <Button
                      type="submit"
                      className="h-11 rounded-full px-5"
                      disabled={reference.trim().length < 3 || referenceMutation.isPending}
                    >
                      {referenceMutation.isPending ? "Sending…" : "Submit"}
                    </Button>
                  </form>
                )
              }
            />
            <Step
              n={4}
              done={false}
              title={placed.method === "pickup" ? "Collect your order" : "We deliver"}
              body={
                <p>
                  {placed.method === "pickup"
                    ? `We'll message you when it's ready at ${BUSINESS.pickupLocations.join(" or ")}. ${BUSINESS.reservation}`
                    : "We confirm the delivery fee and arrange delivery with you."}
                </p>
              }
            />
          </ol>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-11 flex-1 rounded-full">
              <Link to="/account">Track this order</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 flex-1 rounded-full border-white/15 bg-transparent"
            >
              <a
                href={whatsappLink(
                  `Hello ${BUSINESS.name}, I just placed order ${placed.order_number}.`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                Message us on WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!cart.hydrated) return <div className="mx-auto h-96 max-w-5xl" />;

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add something from the shop to check out.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/shop">Go to the shop</Link>
        </Button>
      </div>
    );
  }

  const showError = (key: keyof Form) => (touched && errors[key] ? errors[key] : undefined);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!valid) {
          toast.error("Please check the highlighted details.");
          return;
        }
        if (!orderMutation.isPending) orderMutation.mutate();
      }}
      className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 pt-6 sm:px-6 sm:pt-10 lg:grid-cols-[1fr_22rem] lg:gap-8"
    >
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold">Checkout</h1>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold">How would you like to get it?</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <MethodCard
              active={method === "pickup"}
              onSelect={() => setMethod("pickup")}
              icon={Store}
              title="Pickup — free"
              text={BUSINESS.pickupLocations.join(" or ")}
            />
            <MethodCard
              active={method === "delivery"}
              onSelect={() => setMethod("delivery")}
              icon={Truck}
              title="Delivery across Ghana"
              text="Fee confirmed with you after ordering"
            />
          </div>
        </fieldset>

        <section className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-sm font-semibold">Your details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              id="full_name"
              label="Full name"
              value={form.full_name}
              onChange={set("full_name")}
              error={showError("full_name")}
              autoComplete="name"
            />
            <Field
              id="phone"
              label="Phone (MoMo number)"
              value={form.phone}
              onChange={set("phone")}
              error={showError("phone")}
              autoComplete="tel"
              inputMode="tel"
              placeholder="0244123456"
            />
            <div className="sm:col-span-2">
              <Field
                id="email"
                label="Email (optional)"
                value={form.email}
                onChange={set("email")}
                error={showError("email")}
                autoComplete="email"
                inputMode="email"
              />
            </div>
          </div>

          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300",
              method === "delivery"
                ? "mt-4 grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0",
            )}
            aria-hidden={method !== "delivery"}
          >
            <div className="overflow-hidden">
              <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                <Field
                  id="city"
                  label="Town or city"
                  value={form.city}
                  onChange={set("city")}
                  error={showError("city")}
                  autoComplete="address-level2"
                  tabIndex={method === "delivery" ? 0 : -1}
                />
                <Field
                  id="region"
                  label="Region (optional)"
                  value={form.region}
                  onChange={set("region")}
                  autoComplete="address-level1"
                  tabIndex={method === "delivery" ? 0 : -1}
                />
                <div className="sm:col-span-2">
                  <Field
                    id="delivery_address"
                    label="Address, hostel or house"
                    value={form.delivery_address}
                    onChange={set("delivery_address")}
                    error={showError("delivery_address")}
                    autoComplete="street-address"
                    tabIndex={method === "delivery" ? 0 : -1}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    id="landmark"
                    label="Nearby landmark (optional)"
                    value={form.landmark}
                    onChange={set("landmark")}
                    tabIndex={method === "delivery" ? 0 : -1}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="notes">Notes for the shop (optional)</Label>
            <Textarea
              id="notes"
              className="mt-1.5"
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              maxLength={1000}
            />
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-semibold">Order summary</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {cart.lines.map((l) => (
            <li key={l.variantId} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate font-medium">{l.name}</span>
                <span className="text-xs text-muted-foreground">
                  {l.variantLabel} × {l.quantity}
                </span>
              </span>
              <span className="shrink-0 font-medium">{formatGHS(l.unitPrice * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Items</dt>
            <dd>{formatGHS(cart.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{method === "pickup" ? "Pickup" : "Delivery"}</dt>
            <dd className="text-right">
              {method === "pickup" ? "Free" : "Confirmed after ordering"}
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
          <span className="text-sm font-semibold">
            {method === "pickup" ? "Total" : "Items total"}
          </span>
          <span className="font-display text-2xl font-bold text-primary">
            {formatGHS(cart.subtotal)}
          </span>
        </div>
        <Button
          type="submit"
          className="mt-5 h-12 w-full rounded-full text-[15px] font-semibold"
          disabled={orderMutation.isPending}
        >
          {orderMutation.isPending ? (
            <span className="inline-flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />{" "}
              Placing order…
            </span>
          ) : (
            "Place order"
          )}
        </Button>
        <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
          You&apos;ll pay by mobile money after placing the order. Final prices are checked on our
          server.
        </p>
      </aside>
    </form>
  );
}

function MethodCard({
  active,
  onSelect,
  icon: Icon,
  title,
  text,
}: {
  active: boolean;
  onSelect: () => void;
  icon: typeof Store;
  title: string;
  text: string;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer gap-3 rounded-2xl border p-4 transition-all duration-200",
        active
          ? "border-primary bg-primary/[0.07] shadow-[0_0_0_1px_var(--color-primary)]"
          : "border-border bg-card hover:border-white/25",
      )}
    >
      <input type="radio" name="method" checked={active} onChange={onSelect} className="sr-only" />
      <Icon
        className={cn("mt-0.5 size-5 shrink-0", active ? "text-primary" : "text-muted-foreground")}
      />
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{text}</span>
      </span>
      <span
        className={cn(
          "absolute right-3 top-3 flex size-5 items-center justify-center rounded-full border transition-colors",
          active ? "border-primary bg-primary text-primary-foreground" : "border-border",
        )}
      >
        {active && <Check className="size-3" />}
      </span>
    </label>
  );
}

function Step({
  n,
  title,
  done,
  body,
}: {
  n: number;
  title: string;
  done: boolean;
  body?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
          done
            ? "bg-success text-success-foreground"
            : "border border-border text-muted-foreground",
        )}
      >
        {done ? <Check className="size-4" /> : n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5 text-sm">
        <p className="font-semibold">{title}</p>
        {body && <div className="mt-1 text-muted-foreground">{body}</div>}
      </div>
    </li>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className={cn("mt-1.5 h-11", error && "border-destructive focus-visible:ring-destructive")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
      {error && (
        <p
          id={`${id}-error`}
          className="mt-1 text-xs text-destructive animate-in fade-in slide-in-from-top-1"
        >
          {error}
        </p>
      )}
    </div>
  );
}
