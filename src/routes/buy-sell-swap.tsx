import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Banknote, CheckCircle2, Repeat2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { requireRouteAuth } from "@/lib/auth-guard";
import { DEVICE_TYPES, submitBuySwapRequest } from "@/lib/requests.functions";
import { BUSINESS, whatsappLink } from "@/lib/business";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/buy-sell-swap")({
  ssr: false,
  beforeLoad: requireRouteAuth,
  head: () => ({
    meta: [
      { title: "Sell or swap your phone — Newton's Hub" },
      {
        name: "description",
        content:
          "Tell Newton's Hub about your phone or gadget. Every sell or swap offer is agreed in person after we inspect the device.",
      },
      { property: "og:title", content: "Sell or swap your phone — Newton's Hub" },
      {
        property: "og:description",
        content: "Submit your device details and we'll come back with an offer after inspection.",
      },
    ],
  }),
  component: BuySellSwap,
});

const CONDITIONS = [
  "Like new",
  "Good — light marks",
  "Fair — visible wear",
  "Cracked or faulty",
] as const;

type Form = {
  device_type: (typeof DEVICE_TYPES)[number];
  customer_name: string;
  customer_phone: string;
  current_brand: string;
  current_model: string;
  current_storage: string;
  current_condition: string;
  battery: string;
  imei_or_serial: string;
  desired_device: string;
  customer_notes: string;
};

const PHONE_RE = /^(\+?233|0)\d{9}$/;

function BuySellSwap() {
  const send = useServerFn(submitBuySwapRequest);
  const [type, setType] = useState<"sell" | "swap">("sell");
  const [form, setForm] = useState<Form>({
    device_type: "Phone",
    customer_name: "",
    customer_phone: "",
    current_brand: "",
    current_model: "",
    current_storage: "",
    current_condition: "",
    battery: "",
    imei_or_serial: "",
    desired_device: "",
    customer_notes: "",
  });
  const [owned, setOwned] = useState(false);
  const [touched, setTouched] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const set = (key: keyof Form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const battery = form.battery.trim() === "" ? null : Number(form.battery);
  const errors: Partial<Record<keyof Form | "owned", string>> = {};
  if (form.customer_name.trim().length < 2) errors.customer_name = "Enter your name.";
  if (!PHONE_RE.test(form.customer_phone.replace(/[\s-]/g, "")))
    errors.customer_phone = "Enter a Ghana number, e.g. 0244123456.";
  if (form.current_brand.trim().length < 2) errors.current_brand = "Which brand is it?";
  if (form.current_model.trim().length < 1) errors.current_model = "Which model is it?";
  if (!form.current_condition) errors.current_condition = "Choose the condition.";
  if (battery !== null && (!Number.isFinite(battery) || battery < 0 || battery > 100))
    errors.battery = "Use a number from 0 to 100.";
  if (type === "swap" && form.desired_device.trim().length < 2)
    errors.desired_device = "Tell us what you'd like in exchange.";
  if (!owned) errors.owned = "Please confirm the device is yours.";
  const show = (k: keyof typeof errors) => (touched ? errors[k] : undefined);

  const mutation = useMutation({
    mutationFn: () =>
      send({
        data: {
          request_type: type,
          ownership_confirmed: owned,
          device_type: form.device_type,
          customer_name: form.customer_name,
          customer_phone: form.customer_phone.replace(/[\s-]/g, ""),
          current_brand: form.current_brand,
          current_model: form.current_model,
          current_storage: form.current_storage,
          current_condition: form.current_condition,
          battery_health_percent: battery,
          imei_or_serial: form.imei_or_serial,
          desired_device: type === "swap" ? form.desired_device : "",
          customer_notes: form.customer_notes,
        },
      }),
    onSuccess: (res) => {
      setRef(res.request_number);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (ref) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14 sm:py-20">
        <div className="rounded-3xl border border-border bg-card p-6 text-center sm:p-8 animate-in fade-in zoom-in-95 duration-500">
          <CheckCircle2 className="mx-auto size-12 text-success" />
          <h1 className="mt-4 font-display text-2xl font-bold">Request {ref} received</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We&apos;ll contact you on {form.customer_phone}. The final{" "}
            {type === "swap" ? "swap value" : "offer"} is agreed only after we inspect your{" "}
            {form.current_model || "device"} in person — bring proof of ownership.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              asChild
              className="h-11 rounded-full bg-whatsapp text-[#04170b] hover:bg-whatsapp/90"
            >
              <a
                href={whatsappLink(
                  `Hello ${BUSINESS.name}, I submitted ${type} request ${ref} for my ${form.current_brand} ${form.current_model}. Here are some photos:`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                Send photos on WhatsApp
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-full border-white/15 bg-transparent"
            >
              <Link to="/account" hash="requests">
                View my requests
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Sell or swap your device</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        We don&apos;t quote prices online. Send your device details and we&apos;ll get back to you —
        the final offer is agreed after we inspect it at {BUSINESS.pickupLocations.join(" or ")}.
      </p>

      <div
        role="radiogroup"
        aria-label="Request type"
        className="relative mt-6 grid grid-cols-2 rounded-2xl border border-border bg-card p-1"
      >
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-primary transition-transform duration-300 ease-[cubic-bezier(0.3,1.2,0.5,1)]",
            type === "swap" && "translate-x-full",
          )}
        />
        {(
          [
            { key: "sell", label: "Sell to us", icon: Banknote },
            { key: "swap", label: "Swap for another", icon: Repeat2 },
          ] as const
        ).map((o) => (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={type === o.key}
            onClick={() => setType(o.key)}
            className={cn(
              "relative z-10 flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors duration-300",
              type === o.key
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <o.icon className="size-4" /> {o.label}
          </button>
        ))}
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (Object.keys(errors).length) {
            toast.error("Please check the highlighted fields.");
            return;
          }
          if (!mutation.isPending) mutation.mutate();
        }}
        className="mt-6 space-y-6"
      >
        <Section title="Your device">
          <div className="sm:col-span-2">
            <Label>Device type</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {DEVICE_TYPES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => set("device_type")(d)}
                  aria-pressed={form.device_type === d}
                  className={cn(
                    "h-10 rounded-full border px-4 text-sm transition-all active:scale-95",
                    form.device_type === d
                      ? "border-primary bg-primary/10 font-semibold text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <F
            id="current_brand"
            label="Brand"
            placeholder="e.g. Apple, Samsung, Tecno"
            value={form.current_brand}
            set={set("current_brand")}
            error={show("current_brand")}
          />
          <F
            id="current_model"
            label="Model"
            placeholder="e.g. iPhone 12, Galaxy A15"
            value={form.current_model}
            set={set("current_model")}
            error={show("current_model")}
          />
          <F
            id="current_storage"
            label="Storage (optional)"
            placeholder="e.g. 128GB"
            value={form.current_storage}
            set={set("current_storage")}
          />
          <F
            id="battery"
            label="Battery health % (optional)"
            inputMode="numeric"
            placeholder="e.g. 86"
            value={form.battery}
            set={set("battery")}
            error={show("battery")}
          />
          <div className="sm:col-span-2">
            <Label>Condition</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("current_condition")(c)}
                  aria-pressed={form.current_condition === c}
                  className={cn(
                    "min-h-11 rounded-xl border px-3 py-2 text-left text-[13px] leading-tight transition-all active:scale-[0.98]",
                    form.current_condition === c
                      ? "border-primary bg-primary/10 font-semibold"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            {show("current_condition") && (
              <p className="mt-1 text-xs text-destructive">{show("current_condition")}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <F
              id="imei_or_serial"
              label="IMEI or serial number (optional)"
              value={form.imei_or_serial}
              set={set("imei_or_serial")}
            />
          </div>
        </Section>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300",
            type === "swap" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
          aria-hidden={type !== "swap"}
        >
          <div className="overflow-hidden">
            <Section title="What would you like instead?">
              <div className="sm:col-span-2">
                <F
                  id="desired_device"
                  label="Device you want"
                  placeholder="e.g. iPhone 13 128GB, or a Galaxy A-series"
                  value={form.desired_device}
                  set={set("desired_device")}
                  error={show("desired_device")}
                  tabIndex={type === "swap" ? 0 : -1}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Browse{" "}
                  <Link
                    to="/shop"
                    search={{ category: "Phones" }}
                    className="text-primary hover:underline"
                    tabIndex={type === "swap" ? 0 : -1}
                  >
                    available phones
                  </Link>{" "}
                  for ideas. Any price difference is settled after inspection.
                </p>
              </div>
            </Section>
          </div>
        </div>

        <Section title="How we reach you">
          <F
            id="customer_name"
            label="Your name"
            autoComplete="name"
            value={form.customer_name}
            set={set("customer_name")}
            error={show("customer_name")}
          />
          <F
            id="customer_phone"
            label="Phone / WhatsApp"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0244123456"
            value={form.customer_phone}
            set={set("customer_phone")}
            error={show("customer_phone")}
          />
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Anything else? (optional)</Label>
            <Textarea
              id="notes"
              className="mt-1.5"
              rows={3}
              maxLength={1000}
              placeholder="Repairs, accessories included, box, receipts…"
              value={form.customer_notes}
              onChange={(e) => set("customer_notes")(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              You can send photos on WhatsApp after submitting.
            </p>
          </div>
        </Section>

        <label
          className={cn(
            "flex items-start gap-3 rounded-2xl border p-4 text-sm",
            show("owned") ? "border-destructive/60" : "border-border",
          )}
        >
          <Checkbox
            checked={owned}
            onCheckedChange={(v) => setOwned(v === true)}
            className="mt-0.5"
          />
          <span className="leading-relaxed">
            I confirm this device belongs to me and I can show proof of ownership. Newton&apos;s Hub
            may ask for a witness before completing a swap.
          </span>
        </label>

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-full text-[15px] font-semibold"
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? "Sending…"
            : type === "sell"
              ? "Submit sell request"
              : "Submit swap request"}
        </Button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function F({
  id,
  label,
  value,
  set,
  error,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  set: (v: string) => void;
  error?: string | undefined;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "id">) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className={cn("mt-1.5 h-11", error && "border-destructive")}
        value={value}
        onChange={(e) => set(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
