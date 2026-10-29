import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ProductImage";
import { useCart } from "@/lib/cart";
import { formatGHS } from "@/lib/format";
import { BUSINESS } from "@/lib/business";
import { PLACEHOLDER_IMAGE } from "@/lib/product-media";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Newton's Hub" },
      {
        name: "description",
        content: "Review the phones and accessories in your Newton's Hub cart before checking out.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, setQuantity, remove, add, subtotal, count, hydrated } = useCart();

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="skeleton-shimmer h-9 w-48 rounded-lg" />
        <div className="skeleton-shimmer mt-8 h-28 rounded-2xl" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card">
          <ShoppingBag className="size-7 text-primary" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Earbuds, chargers, cases and phones are waiting on the shelf.
        </p>
        <Button asChild className="mt-6 h-11 rounded-full px-6">
          <Link to="/shop">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 pt-6 sm:px-6 sm:pt-10 lg:grid-cols-[1fr_22rem]">
      <div>
        <h1 className="font-display text-3xl font-bold">
          Your cart <span className="text-lg font-medium text-muted-foreground">({count})</span>
        </h1>

        <ul className="mt-6 space-y-3">
          {lines.map((line) => {
            const atMax = line.quantity >= (line.maxQuantity ?? 20);
            return (
              <li
                key={line.variantId}
                className="flex gap-3 rounded-2xl border border-border bg-card p-3 animate-in fade-in slide-in-from-left-2 duration-300 sm:gap-4 sm:p-4"
              >
                <Link to="/shop/$slug" params={{ slug: line.productSlug }} className="shrink-0">
                  <ProductImage
                    image={
                      line.imageUrl
                        ? { src: line.imageUrl, isPlaceholder: false }
                        : { src: PLACEHOLDER_IMAGE, isPlaceholder: true }
                    }
                    alt={line.name}
                    caption={false}
                    sizes="96px"
                    className="size-20 rounded-xl sm:size-24"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to="/shop/$slug"
                        params={{ slug: line.productSlug }}
                        className="line-clamp-2 font-semibold hover:text-primary"
                      >
                        {line.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">{line.variantLabel}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => {
                        remove(line.variantId);
                        toast(`${line.name} removed`, {
                          action: { label: "Undo", onClick: () => add(line) },
                        });
                      }}
                      className="-mr-1 -mt-1 flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                    <div className="flex items-center rounded-full border border-border">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                        className="flex size-10 items-center justify-center rounded-full"
                      >
                        <Minus className="size-4" />
                      </button>
                      <span
                        className="w-6 text-center text-sm font-semibold tabular-nums"
                        aria-live="polite"
                      >
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={atMax}
                        onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                        className="flex size-10 items-center justify-center rounded-full disabled:opacity-30"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-semibold">
                        {formatGHS(line.unitPrice * line.quantity)}
                      </p>
                      {line.quantity > 1 && (
                        <p className="text-xs text-muted-foreground">
                          {formatGHS(line.unitPrice)} each
                        </p>
                      )}
                    </div>
                  </div>
                  {atMax && line.maxQuantity !== undefined && line.maxQuantity < 20 && (
                    <p className="mt-1 text-xs text-warning">That&apos;s all we have in stock.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <Link
          to="/shop"
          className="mt-5 inline-block text-sm font-medium text-primary hover:underline"
        >
          Continue shopping
        </Link>
      </div>

      <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-semibold">Summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Items ({count})</dt>
            <dd className="font-semibold">{formatGHS(subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Delivery</dt>
            <dd className="text-right text-muted-foreground">
              Free for pickup · confirmed after ordering for delivery
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
          <span className="text-sm font-semibold">Items total</span>
          <span className="font-display text-2xl font-bold text-primary">
            {formatGHS(subtotal)}
          </span>
        </div>
        <Button asChild className="mt-5 h-12 w-full rounded-full text-[15px] font-semibold">
          <Link to="/checkout">Continue to checkout</Link>
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Pay by mobile money to {BUSINESS.momo.number} after you place your order.
        </p>
      </aside>
    </div>
  );
}
