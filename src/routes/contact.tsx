import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS, whatsappLink } from "@/lib/business";
import { submitContactMessage } from "@/lib/requests.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Newton's Hub" },
      {
        name: "description",
        content:
          "Reach Newton's Hub on WhatsApp, phone or email. Pickup in Breman Essiam and UMaT Campus, Tarkwa, with delivery across Ghana.",
      },
      { property: "og:title", content: "Contact Newton's Hub" },
      { property: "og:description", content: "WhatsApp, call or email Newton's Hub." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const send = useServerFn(submitContactMessage);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: () => send({ data: { ...form } }),
    onSuccess: () => {
      setSent(true);
      toast.success("Message sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-2">
      <div>
        <h1 className="font-display text-3xl font-semibold">Contact us</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          WhatsApp is the fastest way to reach {BUSINESS.name}.
        </p>

        <div className="mt-6 space-y-3 text-sm">
          <Info label="WhatsApp / Phone" value={BUSINESS.phone} />
          <Info label="Second number" value={BUSINESS.secondaryPhone} />
          <Info label="Email" value={BUSINESS.email} />
          <Info label="Instagram" value={BUSINESS.instagram} />
          <Info label="Pickup" value={BUSINESS.pickupLocations.join(" · ")} />
          <Info label="Delivery" value="Anywhere in Ghana. " />
        </div>

        <Button asChild className="mt-6">
          <a href={whatsappLink(`Hello ${BUSINESS.name}!`)} target="_blank" rel="noreferrer">
            Chat on WhatsApp
          </a>
        </Button>
      </div>

      <div className="surface-card h-fit p-6">
        {sent ? (
          <p className="text-sm">
            Thanks — we&apos;ve got your message and will get back to you.
          </p>
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Send a message</h2>
            <Row
              id="name"
              label="Your name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />
            <Row
              id="phone"
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
            />
            <Row
              id="email"
              label="Email (optional)"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />
            <Row
              id="subject"
              label="Subject"
              value={form.subject}
              onChange={(v) => setForm({ ...form, subject: v })}
            />
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                className="mt-1"
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            <Button
              className="w-full"
              disabled={
                form.name.trim().length < 2 || form.message.trim().length < 5 || mutation.isPending
              }
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Sending…" : "Send message"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Row({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
