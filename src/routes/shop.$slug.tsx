import { createFileRoute, getRouteApi, Link, notFound, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AvailabilityPill, ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { getProductBySlug } from "@/lib/catalog.functions";
import {
  activeVariants,
  maxOrderable,
  unitPrice,
  variantAvailability,
  variantLabel,
  visibleSpecs,
  type CatalogProduct,
} from "@/lib/catalog";
import { productImages } from "@/lib/product-media";
import { formatGHS } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { BUSINESS, whatsappLink } from "@/lib/business";
import { cn } from "@/lib/utils";

const shopRoute = getRouteApi("/shop");

export const Route = createFileRoute("/shop/$slug")({
  loader: async ({ params }) => {
    const product = (await getProductBySlug({
      data: { slug: params.slug },
    })) as unknown as CatalogProduct | null;
    if (!product) throw notFound();
    return { product };
  },
  staleTime: 30_000,
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    const title = p ? `${p.name} — Newton's Hub` : "Product — Newton's Hub";
    const price = p ? activeVariants(p).map(unitPrice)[0] : undefined;
    const description = p
      ? `${p.name}${price !== undefined ? ` for ${formatGHS(price)}` : ""} at Newton's Hub. Pickup at UMaT Campus, Tarkwa or Breman Essiam, or delivery across Ghana.`
      : "Product details at Newton's Hub.";
    const image = p ? productImages(p)[0] : undefined;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(image && !image.isPlaceholder ? [{ property: "og:image", content: image.src }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-semibold">We couldn&apos;t find that product</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        It may have sold out or been removed from the catalog.
      </p>
      <Button asChild className="mt-6 rounded-full">
        <Link to="/shop">Back to the shop</Link>
      </Button>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { products: all } = shopRoute.useLoaderData();
  const navigate = useNavigate();
  const cart = useCart();
  const wishlist = useWishlist();
  const variants = activeVariants(product);
  const [variantId, setVariantId] = useState<string | undefined>(
    () => variants.find((v) => variantAvailability(v).purchasable)?.id ?? variants[0]?.id,
  );
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [added, setAdded] = useState(false);

  const selected = variants.find((v) => v.id === variantId) ?? variants[0];
  const availability = variantAvailability(selected);
  const max = maxOrderable(selected);
  const images = productImages(product);
  const image = images[Math.min(imageIndex, images.length - 1)]!;
  const specs = visibleSpecs(product.specifications);
  const saved = wishlist.has(product.id);
  const inCart = cart.lines.find((l) => l.variantId === selected?.id)?.quantity ?? 0;
  const related = all
    .filter((p) => p.subcategory === product.subcategory && p.id !== product.id)
    .slice(0, 4);

  useEffect(() => {
    setQty(1);
    setImageIndex(0);
  }, [product.id]);
  useEffect(() => setQty((q) => Math.max(1, Math.min(q, max || 1))), [max]);

  function addToCart(goToCheckout = false) {
    if (!selected) return false;
    const room = max - inCart;
    if (room <= 0) {
      toast.info("You already have all available units of this item in your cart.");
      return false;
    }
    const finalQty = cart.add({
      variantId: selected.id,
      productSlug: product.slug,
      name: product.name,
      variantLabel: variantLabel(selected),
      unitPrice: unitPrice(selected),
      quantity: Math.min(qty, room),
      imageUrl: images[0]?.isPlaceholder ? null : (images[0]?.src ?? null),
      maxQuantity: max,
    });
    if (goToCheckout) {
      void navigate({ to: "/checkout" });
      return true;
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
    toast.success(`${product.name} added to cart`, {
      description: `${finalQty} in your cart`,
      action: { label: "View cart", onClick: () => void navigate({ to: "/cart" }) },
    });
    return true;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-4 sm:px-6 sm:pt-8 md:pb-10">
      <Link
        to="/shop"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Shop
        {product.subcategory && (
          <>
            <span className="px-1 text-muted-foreground/50">/</span>
            <span>{product.subcategory}</span>
          </>
        )}
      </Link>

      <div className="mt-4 grid gap-6 md:mt-6 md:grid-cols-[1.05fr_1fr] md:gap-12">
        {/* Gallery */}
        <div className="md:sticky md:top-24 md:self-start">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
            <ProductImage
              key={image.src}
              image={image}
              alt={product.name}
              name={product.name}
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="aspect-[4/5] sm:aspect-square md:aspect-[4/5]"
              imgClassName="animate-in fade-in duration-500"
            />
            <button
              type="button"
              onClick={() => wishlist.toggle(product.id, product.name)}
              aria-pressed={saved}
              aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
              className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full bg-background/70 backdrop-blur transition-transform active:scale-90"
            >
              <Heart
                className={cn(
                  "size-5 transition-all",
                  saved ? "fill-hub-magenta text-hub-magenta" : "",
                )}
              />
            </button>
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  onClick={() => setImageIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                  aria-current={i === imageIndex}
                  className={cn(
                    "size-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors",
                    i === imageIndex
                      ? "border-primary"
                      : "border-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  <ProductImage image={img} alt="" sizes="64px" className="size-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <p className="text-sm text-muted-foreground">{product.brand ?? product.subcategory}</p>
          <h1 className="mt-1 font-display text-3xl font-bold leading-tight sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="font-display text-3xl font-bold text-primary">
              {selected ? formatGHS(unitPrice(selected)) : "Ask for price"}
            </span>
            {selected?.sale_price !== null &&
              selected?.sale_price !== undefined &&
              Number(selected.sale_price) < Number(selected.price) && (
                <span className="text-base text-muted-foreground line-through">
                  {formatGHS(selected.price)}
                </span>
              )}
            <AvailabilityPill status={availability.status} label={availability.label} />
          </div>

          {variants.length > 1 && (
            <fieldset className="mt-7">
              <legend className="text-sm font-semibold">Choose an option</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {variants.map((v) => {
                  const a = variantAvailability(v);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariantId(v.id)}
                      aria-pressed={selected?.id === v.id}
                      className={cn(
                        "rounded-xl border px-4 py-2.5 text-left text-sm transition-all duration-200 active:scale-[0.97]",
                        selected?.id === v.id
                          ? "border-primary bg-primary/10 text-foreground shadow-[0_0_0_1px_var(--color-primary)]"
                          : "border-border bg-card text-muted-foreground hover:border-white/25 hover:text-foreground",
                        !a.purchasable && "opacity-50",
                      )}
                    >
                      <span className="block font-semibold">{variantLabel(v)}</span>
                      <span className="text-xs">
                        {formatGHS(unitPrice(v))}
                        {!a.purchasable ? " · sold out" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {selected && (
            <dl className="mt-6 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {selected.condition && <Detail label="Condition" value={selected.condition} />}
              {selected.storage && <Detail label="Storage" value={selected.storage} />}
              {selected.color && <Detail label="Colour" value={selected.color} />}
              {selected.network_lock && <Detail label="Network" value={selected.network_lock} />}
              {selected.battery_health_percent != null && (
                <Detail label="Battery health" value={`${selected.battery_health_percent}%`} />
              )}
            </dl>
          )}

          {/* Purchase controls (desktop & tablet) */}
          <div className="mt-8 hidden items-center gap-3 md:flex">
            <QtyStepper qty={qty} setQty={setQty} max={max} />
            <Button
              size="lg"
              className={cn(
                "h-12 flex-1 rounded-full text-[15px] font-semibold transition-colors",
                added && "bg-success text-success-foreground",
              )}
              disabled={!availability.purchasable}
              onClick={() => addToCart()}
            >
              <ShoppingBag className="mr-1 size-4" />
              {!availability.purchasable ? "Out of stock" : added ? "Added to cart" : "Add to cart"}
            </Button>
          </div>
          <div className="mt-3 hidden gap-3 md:flex">
            <Button
              variant="secondary"
              size="lg"
              className="h-12 flex-1 rounded-full"
              disabled={!availability.purchasable}
              onClick={() => addToCart(true)}
            >
              Buy now
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 flex-1 rounded-full border-white/15 bg-transparent"
            >
              <a
                href={whatsappLink(
                  `Hello ${BUSINESS.name}, I'm interested in the ${product.name}${selected ? ` (${variantLabel(selected)})` : ""}.`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                Ask on WhatsApp
              </a>
            </Button>
          </div>
          {inCart > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              {inCart} already in your cart.{" "}
              <Link to="/cart" className="font-medium text-primary hover:underline">
                View cart
              </Link>
            </p>
          )}

          <ul className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card text-sm">
            <InfoRow
              icon={Store}
              title="Pickup"
              text={`Collect at ${BUSINESS.pickupLocations.join(" or ")}.`}
            />
            <InfoRow icon={Truck} title="Delivery across Ghana" text={BUSINESS.deliveryNote} />
            <InfoRow icon={ShieldCheck} title="Returns" text={BUSINESS.returnPolicy} />
          </ul>

          {product.description && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold">About this item</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}

          {specs.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold">Specifications</h2>
              <dl className="mt-3 divide-y divide-border text-sm">
                {specs.map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[9rem_1fr] gap-3 py-2.5">
                    <dt className="capitalize text-muted-foreground">{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {product.subcategory === "Phones" && (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Manufacturer reference specifications. SIM support, finishes and some features
                  vary by region — confirm the exact unit with us before paying.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl font-semibold">
            More {product.subcategory?.toLowerCase()}
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Thumb-friendly sticky purchase bar on phones */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-3 pr-[4.5rem]">
          <QtyStepper qty={qty} setQty={setQty} max={max} compact />
          <Button
            className={cn(
              "h-12 flex-1 rounded-full text-[15px] font-semibold",
              added && "bg-success text-success-foreground",
            )}
            disabled={!availability.purchasable}
            onClick={() => addToCart()}
          >
            {!availability.purchasable
              ? "Out of stock"
              : added
                ? "Added ✓"
                : `Add · ${selected ? formatGHS(unitPrice(selected) * qty) : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function QtyStepper({
  qty,
  setQty,
  max,
  compact,
}: {
  qty: number;
  setQty: (n: number) => void;
  max: number;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center rounded-full border border-border bg-card",
        compact ? "h-12" : "h-12",
      )}
    >
      <button
        type="button"
        onClick={() => setQty(Math.max(1, qty - 1))}
        disabled={qty <= 1}
        aria-label="Decrease quantity"
        className="flex size-11 items-center justify-center rounded-full disabled:opacity-30"
      >
        <Minus className="size-4" />
      </button>
      <span
        className="w-6 text-center text-sm font-semibold tabular-nums"
        aria-live="polite"
        aria-label={`Quantity ${qty}`}
      >
        {qty}
      </span>
      <button
        type="button"
        onClick={() => setQty(Math.min(max || 1, qty + 1))}
        disabled={qty >= max}
        aria-label="Increase quantity"
        className="flex size-11 items-center justify-center rounded-full disabled:opacity-30"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium capitalize">{value}</dd>
    </div>
  );
}

function InfoRow({ icon: Icon, title, text }: { icon: typeof Store; title: string; text: string }) {
  return (
    <li className="flex gap-3 p-4">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-muted-foreground">{text}</p>
      </div>
    </li>
  );
}
