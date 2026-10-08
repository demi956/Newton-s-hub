import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Plus, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ProductImage } from "@/components/ProductImage";
import { cn } from "@/lib/utils";
import { formatGHS } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import {
  activeVariants,
  maxOrderable,
  priceRange,
  productAvailability,
  unitPrice,
  variantAvailability,
  variantLabel,
  type CatalogProduct,
} from "@/lib/catalog";
import { primaryImage } from "@/lib/product-media";

export type { CatalogProduct } from "@/lib/catalog";

const STATUS_STYLE: Record<string, string> = {
  in_stock: "bg-success/15 text-success",
  low_stock: "bg-warning/15 text-warning",
  preorder: "bg-hub-blue/15 text-hub-blue",
  out_of_stock: "bg-white/5 text-muted-foreground",
  unknown: "bg-white/5 text-muted-foreground",
};

export function AvailabilityPill({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        STATUS_STYLE[status] ?? STATUS_STYLE["unknown"],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}

export function ProductCard({
  product,
  priority = false,
}: {
  product: CatalogProduct;
  priority?: boolean;
}) {
  const cart = useCart();
  const wishlist = useWishlist();
  const navigate = useNavigate();
  const [justAdded, setJustAdded] = useState(false);
  const range = priceRange(product);
  const availability = productAvailability(product);
  const image = primaryImage(product);
  const variants = activeVariants(product);
  const only = variants.length === 1 ? variants[0] : undefined;
  const saved = wishlist.has(product.id);
  const onSale = variants.some(
    (v) => v.sale_price !== null && Number(v.sale_price) < Number(v.price),
  );

  function quickAdd() {
    if (!only) return;
    const max = maxOrderable(only);
    const existing = cart.lines.find((l) => l.variantId === only.id)?.quantity ?? 0;
    if (existing >= max) {
      toast.info(`You already have the available quantity of ${product.name} in your cart.`);
      return;
    }
    cart.add({
      variantId: only.id,
      productSlug: product.slug,
      name: product.name,
      variantLabel: variantLabel(only),
      unitPrice: unitPrice(only),
      quantity: 1,
      imageUrl: image.isPlaceholder ? null : image.src,
      maxQuantity: max,
    });
    setJustAdded(true);
    toast.success(`${product.name} added to cart`, {
      action: { label: "View cart", onClick: () => void navigate({ to: "/cart" }) },
    });
    window.setTimeout(() => setJustAdded(false), 1400);
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-lift)] focus-within:border-primary/40">
      <Link
        to="/shop/$slug"
        params={{ slug: product.slug }}
        className="block focus-visible:outline-none"
        aria-label={`${product.name}, ${range ? formatGHS(range.min) : "ask for price"}`}
      >
        <ProductImage
          image={image}
          alt={product.name}
          priority={priority}
          className="aspect-[4/5]"
          imgClassName="group-hover:scale-[1.04]"
        />
      </Link>

      <button
        type="button"
        onClick={() => wishlist.toggle(product.id, product.name)}
        aria-pressed={saved}
        aria-label={
          saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`
        }
        className="absolute right-2.5 top-2.5 flex size-10 items-center justify-center rounded-full bg-background/70 backdrop-blur transition-transform active:scale-90"
      >
        <Heart
          className={cn(
            "size-[18px] transition-all duration-300",
            saved ? "scale-110 fill-hub-magenta text-hub-magenta" : "text-foreground",
          )}
        />
      </button>
      {onSale && (
        <span className="absolute left-2.5 top-2.5 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
          Sale
        </span>
      )}

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        <p className="truncate text-xs text-muted-foreground">
          {product.brand ?? product.subcategory}
        </p>
        <h3 className="line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-tight sm:text-[15px]">
          <Link to="/shop/$slug" params={{ slug: product.slug }} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <p className="whitespace-nowrap font-display text-[15px] font-semibold sm:text-lg">
          {range ? (
            <>
              {range.min !== range.max && (
                <span className="mr-1 text-xs font-medium text-muted-foreground">from</span>
              )}
              {formatGHS(range.min)}
            </>
          ) : (
            "Ask price"
          )}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2">
          <AvailabilityPill status={availability.status} label={availability.label} />
          {only && variantAvailability(only).purchasable ? (
            <button
              type="button"
              onClick={quickAdd}
              aria-label={`Add ${product.name} to cart`}
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full transition-all duration-300 active:scale-90",
                justAdded
                  ? "bg-success text-success-foreground"
                  : "bg-primary text-primary-foreground hover:brightness-110",
              )}
            >
              {justAdded ? <Check className="size-5" /> : <Plus className="size-5" />}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="skeleton-shimmer aspect-[4/5]" />
      <div className="space-y-2 p-4">
        <div className="skeleton-shimmer h-3 w-1/3 rounded" />
        <div className="skeleton-shimmer h-4 w-4/5 rounded" />
        <div className="skeleton-shimmer h-5 w-1/2 rounded" />
      </div>
    </div>
  );
}
