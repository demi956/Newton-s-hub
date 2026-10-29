import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin, PackageCheck, Smartphone, Undo2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HubHero } from "@/components/HubHero";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { Reveal } from "@/components/Reveal";
import { listBundles, listProducts } from "@/lib/catalog.functions";
import { BUSINESS } from "@/lib/business";
import {
  CATEGORY_ORDER,
  priceRange,
  productAvailability,
  type CatalogProduct,
} from "@/lib/catalog";
import { primaryImage } from "@/lib/product-media";
import { formatGHS } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Newton's Hub — Phones, accessories & data bundles in Tarkwa" },
      {
        name: "description",
        content:
          "Buy, sell or swap phones with Newton's Hub. Earbuds, chargers, cases, gadgets, new-in-box iPhones and Samsung Galaxy phones, plus MTN, AirtelTigo and Telecel data. Pickup at UMaT Campus, Tarkwa and Breman Essiam, delivery across Ghana.",
      },
      { property: "og:title", content: "Newton's Hub — We buy. We sell. We swap." },
      {
        property: "og:description",
        content: "Where quality meets affordability. Phones, accessories and data in Ghana.",
      },
      { property: "og:image", content: "/products/nwh-013-900.webp" },
    ],
  }),
  loader: async () => {
    const [products, bundles] = await Promise.all([
      listProducts({ data: {} }).catch(() => null),
      listBundles().catch(() => null),
    ]);
    return { products: (products ?? null) as CatalogProduct[] | null, bundles };
  },
  staleTime: 60_000,
  component: Home,
});

function Home() {
  const { products, bundles } = Route.useLoaderData();
  const all = products ?? [];
  const accessories = all
    .filter((p) => p.subcategory !== "Phones")
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        Number(productAvailability(b).purchasable) - Number(productAvailability(a).purchasable),
    )
    .slice(0, 8);
  // A spread across the price range, cheapest to flagship.
  const phonePool = all
    .filter((p) => p.subcategory === "Phones")
    .sort((a, b) => (priceRange(a)?.min ?? 0) - (priceRange(b)?.min ?? 0));
  const phones =
    phonePool.length <= 4
      ? phonePool
      : [0, 1 / 3, 2 / 3, 1].map((f) => phonePool[Math.round(f * (phonePool.length - 1))]!);
  const categories = CATEGORY_ORDER.map((name) => {
    const items = all.filter((p) => p.subcategory === name);
    const withPhoto = items.find((p) => !primaryImage(p).isPlaceholder) ?? items[0];
    return { name, count: items.length, cover: withPhoto };
  }).filter((c) => c.count > 0);

  const networks = new Map<string, number>();
  for (const b of bundles ?? []) {
    const price = Number(b.price);
    networks.set(b.network, Math.min(networks.get(b.network) ?? Infinity, price));
  }

  return (
    <div>
      {/* ------------------------------------------------------------ Hero */}
      <section className="relative -mt-14 overflow-hidden pt-14 sm:-mt-16 sm:pt-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(60%_60%_at_70%_30%,rgba(46,155,240,0.12),transparent_70%),radial-gradient(40%_50%_at_15%_20%,rgba(246,194,28,0.08),transparent_70%)]"
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-4 pb-12 pt-6 sm:px-6 md:grid-cols-[1.05fr_1fr] md:gap-10 md:pb-20 md:pt-14">
          <div className="max-w-xl">
            <p
              className="rise flex items-center gap-2 text-sm text-muted-foreground"
              style={{ "--d": "0ms" } as React.CSSProperties}
            >
              <MapPin className="size-4 text-primary" />
              UMaT Campus, Tarkwa &amp; Breman Essiam
            </p>
            <h1 className="mt-5 font-display text-[clamp(2.75rem,9vw,5.25rem)] font-bold leading-[0.95] tracking-[-0.04em]">
              {["We buy.", "We sell.", "We swap."].map((line, i) => (
                <span
                  key={line}
                  className="rise block"
                  style={{ "--d": `${120 + i * 110}ms` } as React.CSSProperties}
                >
                  {line}
                </span>
              ))}
            </h1>
            <p
              className="rise mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg"
              style={{ "--d": "480ms" } as React.CSSProperties}
            >
              Phones, earbuds, chargers and gadgets at student-friendly prices, photographed on our
              own shelf. Trade in your old phone, or top up data in seconds.
            </p>
            <div
              className="rise mt-8 flex flex-wrap gap-3"
              style={{ "--d": "580ms" } as React.CSSProperties}
            >
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full px-7 text-[15px] font-semibold"
              >
                <Link to="/shop">Shop the shelf</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-white/15 bg-transparent px-6 text-[15px]"
              >
                <Link to="/buy-sell-swap">Sell or swap a phone</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-12 rounded-full px-4 text-[15px] text-muted-foreground hover:text-foreground"
              >
                <Link to="/bundles">Buy data</Link>
              </Button>
            </div>
          </div>
          <div className="relative -mx-2 sm:mx-0">
            <HubHero />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Promise strip */}
      <section
        aria-label="Shopping with Newton's Hub"
        className="border-y border-border bg-[#07121c]"
      >
        <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-0 sm:px-6 md:grid-cols-4">
          {[
            {
              icon: Wallet,
              title: "Pay with mobile money",
              text: "Confirmed by a real person before we ship.",
            },
            {
              icon: PackageCheck,
              title: "Pickup or delivery",
              text: "Collect in Tarkwa or Breman Essiam, or get it delivered.",
            },
            { icon: Undo2, title: "3-day returns", text: "Bring it back boxed within 3 days." },
            {
              icon: BadgeCheck,
              title: "Real photos",
              text: "Every accessory is shown as it sits on our shelf.",
            },
          ].map((f, i) => (
            <Reveal
              as="li"
              key={f.title}
              delay={i * 70}
              className="flex gap-3 px-4 py-5 sm:px-2 md:py-7"
            >
              <f.icon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
                  {f.text}
                </p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      {products === null && (
        <div className="mx-auto mt-10 max-w-3xl px-4 text-center text-sm text-muted-foreground">
          The catalog couldn&apos;t load right now. Refresh the page, or message us on WhatsApp.
        </div>
      )}

      {/* ------------------------------------------------------------ Categories */}
      {categories.length > 0 && (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
          <SectionHeading title="Shop by category" href="/shop" cta="Browse everything" />
          <div className="no-scrollbar -mx-4 mt-6 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
            {categories.map((c, i) => (
              <Reveal key={c.name} delay={i * 60} className="w-[42%] shrink-0 snap-start sm:w-auto">
                <Link
                  to="/shop"
                  search={{ category: c.name }}
                  className="group block overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-primary/40"
                >
                  {c.cover ? (
                    <ProductImage
                      image={primaryImage(c.cover)}
                      alt=""
                      caption={false}
                      sizes="(min-width: 1024px) 16vw, 42vw"
                      className="aspect-square"
                      imgClassName="group-hover:scale-105"
                    />
                  ) : null}
                  <div className="p-3">
                    <p className="text-sm font-semibold leading-tight">{c.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.count} {c.count === 1 ? "item" : "items"}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ Accessories */}
      {accessories.length > 0 && (
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
          <SectionHeading title="On the shelf now" href="/shop" cta="See all accessories" />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {accessories.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 70}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ Phones */}
      {phones.length > 0 && (
        <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-[linear-gradient(135deg,#0c1d2e,#08131e_60%)] p-5 sm:p-8">
            <div className="spectrum-line absolute inset-x-0 top-0 h-px opacity-50" aria-hidden />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-lg">
                <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                  New-in-box iPhones and Galaxies
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  From the iPhone XR to the latest Pro Max, plus Samsung Galaxy A-series. Prices by
                  storage option; ask us on WhatsApp to confirm colours before you pay.
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className="shrink-0 rounded-full border-white/15 bg-transparent"
              >
                <Link to="/shop" search={{ category: "Phones" }}>
                  <Smartphone className="mr-1 size-4" /> All phones
                </Link>
              </Button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {phones.map((p, i) => (
                <Reveal key={p.id} delay={i * 70}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ Swap + data */}
      <section className="mx-auto mt-20 grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-[1.25fr_1fr]">
        <Reveal className="rounded-3xl border border-border bg-card p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Trade your phone in</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Sell it to us for cash, or put its value towards something newer. We never quote blind —
            the offer comes after we see the phone.
          </p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                t: "Tell us about it",
                d: "Brand, model, storage and condition — two minutes online.",
              },
              {
                t: "We inspect it",
                d: "Bring it to UMaT Campus or Breman Essiam with proof of ownership.",
              },
              { t: "Agree the deal", d: "Take cash, or swap it towards the device you want." },
            ].map((s, i) => (
              <li key={s.t} className="rounded-2xl border border-border bg-background/40 p-4">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <p className="mt-3 text-sm font-semibold">{s.t}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
          <Button asChild className="mt-6 h-11 rounded-full px-6">
            <Link to="/buy-sell-swap">Start a sell or swap request</Link>
          </Button>
        </Reveal>

        <Reveal
          delay={100}
          className="flex flex-col rounded-3xl border border-border bg-[radial-gradient(120%_80%_at_100%_0%,rgba(246,194,28,0.12),transparent_60%),var(--color-card)] p-6 sm:p-8"
        >
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Data, sorted</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Pick a bundle, send it to WhatsApp, and we activate it once your MoMo lands. MTN AFA
            registration too.
          </p>
          {networks.size > 0 ? (
            <ul className="mt-6 space-y-2">
              {[...networks.entries()].map(([network, from]) => (
                <li
                  key={network}
                  className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-4 py-3"
                >
                  <span className="text-sm font-semibold">{network}</span>
                  <span className="text-sm text-muted-foreground">
                    from <span className="font-semibold text-foreground">{formatGHS(from)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              Bundle prices are shown on the Data &amp; AFA page.
            </p>
          )}
          <Button
            asChild
            variant="secondary"
            className="mt-auto h-11 rounded-full px-6 pt-0 [margin-top:1.5rem]"
          >
            <Link to="/bundles">See all bundles</Link>
          </Button>
        </Reveal>
      </section>

      {/* ------------------------------------------------------------ Visit */}
      <section className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <Reveal className="flex flex-col items-start gap-5 rounded-3xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="font-display text-xl font-semibold sm:text-2xl">
              Come see it before you buy
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Pickup at {BUSINESS.pickupLocations.join(" or ")}. Questions? We usually reply fastest
              on WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/15 bg-transparent"
            >
              <Link to="/contact">Contact &amp; directions</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/15 bg-transparent"
            >
              <a href={BUSINESS.instagramUrl} target="_blank" rel="noreferrer">
                Follow {BUSINESS.instagram}
              </a>
            </Button>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function SectionHeading({ title, href, cta }: { title: string; href: "/shop"; cta: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h2>
      <Link to={href} className="shrink-0 text-sm font-medium text-primary hover:underline">
        {cta}
      </Link>
    </div>
  );
}
