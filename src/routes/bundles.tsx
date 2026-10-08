import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { BUSINESS } from "@/lib/business";

export const Route = createFileRoute("/bundles")({
  head: () => ({
    meta: [
      { title: "Data bundles & AFA registration — Newton's Hub" },
      {
        name: "description",
        content:
          "Order MTN data bundles and AFA registration from Newton's Hub. Pick a bundle, give us the number, pay by mobile money.",
      },
      { property: "og:title", content: "Data bundles & AFA registration — Newton's Hub" },
      {
        property: "og:description",
        content: "MTN data bundles and AFA registration, activated by Newton's Hub.",
      },
    ],
  }),
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

function Bundles() {
  const fetchBundles = useServerFn(listBundles);
  const fetchServices = useServerFn(listServices);

  const bundles = useQuery({ queryKey: ["bundles"], queryFn: () => fetchBundles() });
  const services = useQuery({ queryKey: ["services"], queryFn: () => fetchServices() });

  const [selected, setSelected] = useState<Bundle | null>(null);
  const [phone, setPhone] = useState("");
  const [placed, setPlaced] = useState<{ order_number: string; amount: number } | null>(null);

  const submit = useServerFn(createBundleOrder);
  const mutation = useMutation({
    mutationFn: () =>
      submit({
        data: {
          bundle_id: selected!.id,
          receiving_phone: phone,
        },
      }),
    onSuccess: (res) => {
      setPlaced({ order_number: res.order_number, amount: res.amount });
      setPhone("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Data bundles & AFA</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Choose a bundle, tell us the receiving number, then pay by mobile money to{" "}
        {BUSINESS.momo.number} ({BUSINESS.momo.accountName}). We confirm your payment before
        activation.
      </p>

      {services.data && services.data.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {services.data.map((s) => (
            <div key={s.id} className="surface-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">{s.name}</h2>
                <span className="font-semibold">{formatGHS(s.price)}</span>
              </div>
              {s.description && (
                <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bundles.isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          : (bundles.data ?? []).map((b) => (
              <div key={b.id} className="surface-card flex flex-col p-5">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{b.network}</Badge>
                  <span className="font-display text-lg font-semibold">{formatGHS(b.price)}</span>
                </div>
                <h3 className="mt-3 font-semibold">{b.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {b.validity ?? "Validity confirmed at activation"}
                  {b.activation_time ? ` · ${b.activation_time}` : ""}
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => {
                    setSelected(b as unknown as Bundle);
                    setPlaced(null);
                  }}
                >
                  Order this bundle
                </Button>
              </div>
            ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{placed ? "Bundle request received" : selected?.name}</DialogTitle>
            <DialogDescription>
              {placed
                ? `Reference ${placed.order_number}. Send ${formatGHS(placed.amount)} to ${BUSINESS.momo.number} (${BUSINESS.momo.accountName}). We activate after we confirm payment.`
                : "Which number should receive this bundle?"}
            </DialogDescription>
          </DialogHeader>

          {!placed && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="receiving">Receiving phone number</Label>
                <Input
                  id="receiving"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="mt-1"
                />
              </div>
              <Button
                className="w-full"
                disabled={phone.trim().length < 9 || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending
                  ? "Submitting…"
                  : `Request for ${formatGHS(selected?.price ?? 0)}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
