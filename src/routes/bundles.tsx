import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Wifi } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listBundles, listServices } from "@/lib/catalog.functions";
import { createBundleOrder } from "@/lib/orders.functions";
import { formatGHS } from "@/lib/format";
import { BUSINESS, whatsappLink } from "@/lib/business";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bundles")({
  head: () => ({
    meta: [
      { title: "Data bundles & MTN AFA — Newton's Hub" },
      {
        name: "description",
        content:
          "Buy MTN, AirtelTigo and Telecel data bundles and MTN AFA registration from Newton's Hub. Choose a bundle, confirm on WhatsApp, pay by mobile money.",
      },
      { property: "og:title", content: "Data bundles & MTN AFA — Newton's Hub" },
      {
        property: "og:description",
        content: "MTN, AirtelTigo and Telecel data, activated by Newton's Hub.",
      },
    ],
  }),
  loader: async () => {
    const [bundles, services] = await Promise.all([
      listBundles().catch(() => null),
      listServices().catch(() => null),
    ]);
    return { bundles, services };
  },
  staleTime: 60_000,
  component: Bundles,
});

type Bundle = {
  id: string;
  network: string;
  name: string;
  data_gb: number;
  price: number;
  validity: string | null;
  activation_time: string | null;
};
type Service = {
  id: string;
  name: string;
  network: string | null;
  price: number;
  description: string | null;
};
type Selection = { kind: "bundle"; item: Bundle } | { kind: "service"; item: Service };

const NETWORK_STYLE: Record<string, string> = {
  MTN: "#ffcb05",
  "AT (AirtelTigo)": "#e4002b",
  Telecel: "#e60000",
};

const PHONE_RE = /^(\+?233|0)\d{9}$/;

function Bundles() {
  const { bundles, services } = Route.useLoaderData();
  const { user } = useAuth();
  const list = useMemo(() => (bundles ?? []) as unknown as Bundle[], [bundles]);
  const networks = useMemo(() => [...new Set(list.map((b) => b.network))], [list]);
  const [network, setNetwork] = useState<string | undefined>(undefined);
  const active = network ?? networks[0];
  const shown = list.filter((b) => b.network === active);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const submit = useServerFn(createBundleOrder);
  const record = useMutation({
    mutationFn: (bundleId: string) =>
      submit({ data: { bundle_id: bundleId, receiving_phone: phone.replace(/[\s-]/g, "") } }),
  });

  const phoneOk = PHONE_RE.test(phone.replace(/[\s-]/g, ""));
  const isAfa = selection?.kind === "service";
  const nameOk = !isAfa || name.trim().length >= 2;

  function close() {
    setSelection(null);
    setReady(false);
    setReference(null);
    setTouched(false);
  }

  async function confirm() {
    setTouched(true);
    if (!selection || !phoneOk || !nameOk) return;
    // Signed-in customers also get a tracked request in their account.
    if (user && selection.kind === "bundle") {
      try {
        const res = await record.mutateAsync(selection.item.id);
        setReference(res.order_number);
      } catch {
        toast.message("We'll continue on WhatsApp", {
          description:
            "Your request couldn't be saved to your account, but the shop can still process it.",
        });
      }
    }
    setReady(true);
  }

  const message = selection
    ? selection.kind === "bundle"
      ? [
          `Hello ${BUSINESS.name}, I'd like to buy a data bundle.`,
          `Network: ${selection.item.network}`,
          `Bundle: ${selection.item.name}`,
          `Price: ${formatGHS(selection.item.price)}`,
          `Number to receive it: ${phone.trim()}`,
          reference ? `Reference: ${reference}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      : [
          `Hello ${BUSINESS.name}, I'd like ${selection.item.name} (${formatGHS(selection.item.price)}).`,
          `Name: ${name.trim()}`,
          `MTN number: ${phone.trim()}`,
          "Please tell me what details you need to complete the registration.",
        ].join("\n")
    : "";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Data bundles &amp; MTN AFA</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Pick your network and bundle, enter the number to receive it, and send the request to us
          on WhatsApp. Pay by mobile money to {BUSINESS.momo.number} ({BUSINESS.momo.accountName}) —
          we activate once your payment is confirmed.
        </p>
      </div>

      {bundles === null ? (
        <p className="mt-10 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Bundle prices couldn&apos;t load right now. Refresh, or{" "}
          <a
            className="font-semibold text-primary"
            href={whatsappLink(`Hello ${BUSINESS.name}, I'd like to buy data.`)}
            target="_blank"
            rel="noreferrer"
          >
            ask on WhatsApp
          </a>
          .
        </p>
      ) : (
        <>
          <div
            className="no-scrollbar -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
            role="tablist"
            aria-label="Network"
          >
            {networks.map((n) => (
              <button
                key={n}
                type="button"
                role="tab"
                aria-selected={active === n}
                onClick={() => setNetwork(n)}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-all duration-200 active:scale-95",
                  active === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: NETWORK_STYLE[n] ?? "#93a4b8" }}
                  aria-hidden
                />
                {n}
                <span className="text-xs opacity-70">
                  {list.filter((b) => b.network === n).length}
                </span>
              </button>
            ))}
          </div>

          <div key={active} className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setSelection({ kind: "bundle", item: b });
                  setReady(false);
                  setReference(null);
                }}
                style={{ animationDelay: `${i * 30}ms` }}
                className="group flex flex-col items-start rounded-2xl border border-border bg-card p-4 text-left transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 fill-mode-both hover:-translate-y-0.5 hover:border-primary/50 active:scale-[0.98] sm:p-5"
              >
                <span className="flex w-full items-center justify-between">
                  <Wifi className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  <span
                    className="size-2 rounded-full"
                    style={{ background: NETWORK_STYLE[b.network] ?? "#93a4b8" }}
                    aria-hidden
                  />
                </span>
                <span className="mt-3 font-display text-2xl font-bold sm:text-3xl">{b.name}</span>
                <span className="mt-1 text-base font-semibold text-primary">
                  {formatGHS(b.price)}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {b.validity ?? "Validity confirmed on activation"}
                </span>
                <span className="mt-3 text-xs font-semibold text-foreground/80 group-hover:text-primary">
                  Choose bundle
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {services && services.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Services</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(services as unknown as Service[]).map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">{formatGHS(s.price)}</span>
                    {s.description ? ` · ${s.description}` : ""}
                  </p>
                </div>
                <Button
                  className="rounded-full"
                  onClick={() => {
                    setSelection({ kind: "service", item: s });
                    setReady(false);
                  }}
                >
                  Request {s.name.replace(/registration/i, "").trim() || "service"}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <Dialog open={!!selection} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {selection?.kind === "bundle"
                ? `${selection.item.network} ${selection.item.name}`
                : selection?.item.name}
            </DialogTitle>
            <DialogDescription>
              {selection ? formatGHS(selection.item.price) : ""} · paid by mobile money after we
              confirm on WhatsApp.
            </DialogDescription>
          </DialogHeader>

          {!ready ? (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void confirm();
              }}
              className="space-y-4"
            >
              {isAfa && (
                <div>
                  <Label htmlFor="afa-name">Full name</Label>
                  <Input
                    id="afa-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="mt-1.5 h-11"
                    aria-invalid={touched && !nameOk}
                  />
                  {touched && !nameOk && (
                    <p className="mt-1 text-xs text-destructive">Enter the name to register.</p>
                  )}
                </div>
              )}
              <div>
                <Label htmlFor="receiving">
                  {isAfa ? "MTN number to register" : "Number to receive the bundle"}
                </Label>
                <Input
                  id="receiving"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0244123456"
                  className="mt-1.5 h-11"
                  aria-invalid={touched && !phoneOk}
                />
                {touched && !phoneOk && (
                  <p className="mt-1 text-xs text-destructive">Enter a 10-digit Ghana number.</p>
                )}
              </div>
              <Button
                type="submit"
                className="h-11 w-full rounded-full"
                disabled={record.isPending}
              >
                {record.isPending ? "Saving…" : "Continue"}
              </Button>
              {!user && selection?.kind === "bundle" && (
                <p className="text-center text-xs text-muted-foreground">
                  <Link
                    to="/auth"
                    search={{ redirect: "/bundles" }}
                    className="font-medium text-primary"
                  >
                    Sign in
                  </Link>{" "}
                  to keep a record of your data requests in your account.
                </p>
              )}
            </form>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  <Check className="size-4 text-success" /> Ready to send
                </p>
                {reference && (
                  <p className="mt-1 text-muted-foreground">
                    Saved to your account as {reference}.
                  </p>
                )}
              </div>
              <pre className="whitespace-pre-wrap rounded-xl bg-background/60 p-3 font-sans text-sm text-muted-foreground">
                {message}
              </pre>
              <Button
                asChild
                className="h-12 w-full rounded-full bg-whatsapp text-[15px] font-semibold text-[#04170b] hover:bg-whatsapp/90"
              >
                <a
                  href={whatsappLink(message)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => window.setTimeout(close, 400)}
                >
                  Send on WhatsApp
                </a>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Activation happens after Newton&apos;s Hub confirms your payment.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
