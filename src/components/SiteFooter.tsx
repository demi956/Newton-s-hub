import { Link } from "@tanstack/react-router";
import { Instagram, Mail, MapPin, Phone } from "lucide-react";
import mark from "@/assets/brand-mark.webp";
import { BUSINESS, whatsappLink } from "@/lib/business";

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-border bg-[#040b12]">
      <div className="spectrum-line absolute inset-x-0 top-0 h-px opacity-60" aria-hidden />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <img src={mark} alt="" width={36} height={36} className="size-9" />
            <span className="font-display text-lg font-bold">
              Newton&apos;s <span className="text-primary">Hub</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {BUSINESS.tagline}
          </p>
          <a
            href={BUSINESS.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-hub-magenta/60 hover:text-hub-magenta"
          >
            <Instagram className="size-4" /> {BUSINESS.instagram}
          </a>
        </div>

        <FooterList title="Shop">
          <FooterLink to="/shop">All products</FooterLink>
          <FooterLink to="/shop" search={{ category: "Phones" }}>
            Phones
          </FooterLink>
          <FooterLink to="/shop" search={{ category: "Earbuds & Earpieces" }}>
            Earbuds
          </FooterLink>
          <FooterLink to="/bundles">Data bundles & AFA</FooterLink>
        </FooterList>

        <FooterList title="Help">
          <FooterLink to="/buy-sell-swap">Sell or swap a device</FooterLink>
          <FooterLink to="/account">Track my orders</FooterLink>
          <FooterLink to="/contact">Contact us</FooterLink>
          <li>
            <a
              href={whatsappLink(`Hello ${BUSINESS.name}, I need some help.`)}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              WhatsApp support
            </a>
          </li>
        </FooterList>

        <div>
          <h2 className="text-sm font-semibold">Visit or call</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {BUSINESS.pickupLocations.map((p) => (
              <li key={p} className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" /> {p}
              </li>
            ))}
            <li className="flex gap-2.5">
              <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <a href={`tel:${BUSINESS.phone}`} className="hover:text-foreground">
                  {BUSINESS.phone}
                </a>
                {" / "}
                <a href={`tel:${BUSINESS.secondaryPhone}`} className="hover:text-foreground">
                  {BUSINESS.secondaryPhone}
                </a>
              </span>
            </li>
            <li className="flex gap-2.5">
              <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
              <a href={`mailto:${BUSINESS.email}`} className="break-all hover:text-foreground">
                {BUSINESS.email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {BUSINESS.name}. Prices in Ghana cedis (GH₵).
          </p>
          <p>
            {BUSINESS.returnPolicy} {BUSINESS.deliveryNote}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-4 space-y-3 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({
  to,
  search,
  children,
}: {
  to: "/shop" | "/bundles" | "/buy-sell-swap" | "/account" | "/contact";
  search?: { category: string };
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        to={to}
        search={search as never}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        {children}
      </Link>
    </li>
  );
}
