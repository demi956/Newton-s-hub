import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS, whatsappLink } from "@/lib/business";
import { submitContactMessage } from "@/lib/requests.functions";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Newton's Hub" },
      {
        name: "description",
        content:
          "Reach Newton's Hub on WhatsApp, phone or email. Pickup at UMaT Campus, Tarkwa and Breman Essiam, with delivery across Ghana.",
      },
      { property: "og:title", content: "Contact Newton's Hub" },
      { property: "og:description", content: "WhatsApp, call or email Newton's Hub." },
    ],
  }),
  component: Contact,
});

const mapsLink = (place: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place + ", Ghana")}`;

function Contact() {
  const { user, loading } = useAuth();
  const send = useServerFn(submitContactMessage);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const errors = {
    name: form.name.trim().length < 2 ? "Enter your name." : undefined,
    email:
      form.email && !/^\S+@\S+\.\S+$/.test(form.email)
        ? "Enter a valid email or leave it empty."
        : undefined,
    message:
      form.message.trim().length < 5 ? "Write a short message (at least 5 characters)." : undefined,
  };
  const valid = !errors.name && !errors.email && !errors.message;

  const mutation = useMutation({
    mutationFn: () => send({ data: { ...form, email: form.email || user?.email || "" } }),
    onSuccess: () => {
      setSent(true);
      toast.success("Message sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 pt-6 sm:px-6 sm:pt-10 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
      <div>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Talk to us</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          WhatsApp is the fastest way to reach {BUSINESS.name}. Calls and emails work too.
        </p>

        <Button
          asChild
          className="mt-6 h-12 rounded-full bg-whatsapp px-6 text-[15px] font-semibold text-[#04170b] hover:bg-whatsapp/90"
        >
          <a href={whatsappLink(`Hello ${BUSINESS.name}!`)} target="_blank" rel="noreferrer">
            <MessageCircle className="mr-1 size-5" /> Chat on WhatsApp
          </a>
        </Button>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          <Item
            icon={Phone}
            label="Phone / WhatsApp"
            href={`tel:${BUSINESS.phone}`}
            value={BUSINESS.phone}
          />
          <Item
            icon={Phone}
            label="Second line"
            href={`tel:${BUSINESS.secondaryPhone}`}
            value={BUSINESS.secondaryPhone}
          />
          <Item
            icon={Mail}
            label="Email"
            href={`mailto:${BUSINESS.email}`}
            value={BUSINESS.email}
          />
          <Item
            icon={Instagram}
            label="Instagram"
            href={BUSINESS.instagramUrl}
            value={BUSINESS.instagram}
            external
          />
        </ul>

        <h2 className="mt-10 font-display text-xl font-semibold">Pickup points</h2>
        <ul className="mt-3 space-y-3">
          {BUSINESS.pickupLocations.map((p) => (
            <li
              key={p}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <span className="flex items-center gap-3 text-sm font-medium">
                <MapPin className="size-5 text-primary" /> {p}
              </span>
              <a
                href={mapsLink(p)}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-sm font-medium text-primary hover:underline"
              >
                Open map
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Delivery across Ghana. {BUSINESS.deliveryNote} Message us before visiting to make sure
          your item is ready.
        </p>
      </div>

      <div className="h-fit rounded-3xl border border-border bg-card p-5 sm:p-7">
        {sent ? (
          <div className="py-6 text-center animate-in fade-in zoom-in-95">
            <CheckCircle2 className="mx-auto size-10 text-success" />
            <h2 className="mt-3 font-display text-xl font-semibold">Message sent</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll get back to you soon. For anything urgent, use WhatsApp.
            </p>
            <Button
              variant="outline"
              className="mt-5 rounded-full"
              onClick={() => {
                setSent(false);
                setForm({ name: "", email: "", phone: "", subject: "", message: "" });
                setTouched(false);
              }}
            >
              Send another message
            </Button>
          </div>
        ) : !loading && !user ? (
          <div className="py-6 text-center">
            <h2 className="font-display text-xl font-semibold">Send us a message</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              Sign in to send us a message, or reach us right away on WhatsApp.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild className="rounded-full">
                <Link to="/auth" search={{ redirect: "/contact" }}>
                  Sign in to message
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <a href={whatsappLink(`Hello ${BUSINESS.name}!`)} target="_blank" rel="noreferrer">
                  Use WhatsApp instead
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <form
            noValidate
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setTouched(true);
              if (valid && !mutation.isPending) mutation.mutate();
            }}
          >
            <h2 className="font-display text-xl font-semibold">Send a message</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Row
                id="name"
                label="Your name"
                value={form.name}
                onChange={set("name")}
                error={touched ? errors.name : undefined}
                autoComplete="name"
              />
              <Row
                id="phone"
                label="Phone (optional)"
                value={form.phone}
                onChange={set("phone")}
                inputMode="tel"
                autoComplete="tel"
              />
              <Row
                id="email"
                label="Email (optional)"
                value={form.email}
                onChange={set("email")}
                error={touched ? errors.email : undefined}
                inputMode="email"
                autoComplete="email"
                placeholder={user?.email ?? ""}
              />
              <Row
                id="subject"
                label="Subject (optional)"
                value={form.subject}
                onChange={set("subject")}
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                className="mt-1.5"
                rows={5}
                maxLength={2000}
                value={form.message}
                onChange={(e) => set("message")(e.target.value)}
                aria-invalid={touched && !!errors.message}
              />
              {touched && errors.message && (
                <p className="mt-1 text-xs text-destructive">{errors.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="h-12 w-full rounded-full text-[15px] font-semibold"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Sending…" : "Send message"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function Item({
  icon: Icon,
  label,
  value,
  href,
  external,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  href: string;
  external?: boolean;
}) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
      >
        <Icon className="size-5 shrink-0 text-primary" />
        <span className="min-w-0">
          <span className="block text-xs text-muted-foreground">{label}</span>
          <span className="block truncate text-sm font-semibold">{value}</span>
        </span>
      </a>
    </li>
  );
}

function Row({
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
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "id">) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className="mt-1.5 h-11"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
