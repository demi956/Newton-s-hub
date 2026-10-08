import { createFileRoute, Link, Outlet, useMatch, useNavigate } from "@tanstack/react-router";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ProductCard } from "@/components/ProductCard";
import { listProducts } from "@/lib/catalog.functions";
import {
  CATEGORY_ORDER,
  priceRange,
  productAvailability,
  type CatalogProduct,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { primaryImage } from "@/lib/product-media";

const SORTS = {
  featured: "Recommended",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  name: "Name A–Z",
} as const;
type Sort = keyof typeof SORTS;

const searchSchema = z.object({
  q: z.string().max(80).optional().catch(undefined),
  category: z.string().max(80).optional().catch(undefined),
  sort: z.enum(["featured", "price-asc", "price-desc", "name"]).optional().catch(undefined),
  instock: z.boolean().optional().catch(undefined),
});

export const Route = createFileRoute("/shop")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Shop phones & accessories — Newton's Hub" },
      {
        name: "description",
        content:
          "Browse earbuds, chargers, cables, cases, gadgets and new-in-box phones at Newton's Hub, with prices in Ghana cedis and live availability.",
      },
      { property: "og:title", content: "Shop phones & accessories — Newton's Hub" },
      {
        property: "og:description",
        content: "Phones, earbuds, cables, covers and more from Newton's Hub.",
      },
    ],
  }),
  loader: async () => {
    try {
      return {
        products: (await listProducts({ data: {} })) as unknown as CatalogProduct[],
        error: false,
      };
    } catch {
      return { products: [] as CatalogProduct[], error: true };
    }
  },
  staleTime: 60_000,
  component: ShopLayout,
});

// /shop/$slug renders inside this route, so only show the listing on /shop itself.
function ShopLayout() {
  const child = useMatch({ from: "/shop/$slug", shouldThrow: false });
  return child ? <Outlet /> : <Shop />;
}

function Shop() {
  const { products, error } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const [term, setTerm] = useState(search.q ?? "");
  const sort: Sort = search.sort ?? "featured";
  const category =
    search.category && CATEGORY_ORDER.includes(search.category as never)
      ? search.category
      : undefined;

  // Debounce typing into the URL so results update smoothly without a history entry per key.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if ((search.q ?? "") !== term.trim())
        void navigate({
          search: (prev) => ({ ...prev, q: term.trim() || undefined }),
          replace: true,
        });
    }, 250);
    return () => window.clearTimeout(t);
  }, [term, search.q, navigate]);

  useEffect(() => setTerm(search.q ?? ""), [search.q]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) map.set(p.subcategory ?? "", (map.get(p.subcategory ?? "") ?? 0) + 1);
    return map;
  }, [products]);

  const results = useMemo(() => {
    let rows = products;
    if (category) rows = rows.filter((p) => p.subcategory === category);
    const q = (search.q ?? "").toLowerCase().trim();
    if (q) {
      const words = q.split(/\s+/);
      rows = rows.filter((p) => {
        const hay =
          `${p.name} ${p.brand ?? ""} ${p.model ?? ""} ${p.subcategory ?? ""}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      });
    }
    if (search.instock) rows = rows.filter((p) => productAvailability(p).purchasable);
    const price = (p: CatalogProduct) => priceRange(p)?.min ?? Number.POSITIVE_INFINITY;
    const sorted = [...rows];
    if (sort === "price-asc") sorted.sort((a, b) => price(a) - price(b));
    else if (sort === "price-desc") sorted.sort((a, b) => price(b) - price(a));
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else
      sorted.sort(
        (a, b) =>
          Number(productAvailability(b).purchasable) - Number(productAvailability(a).purchasable) ||
          Number(primaryImage(a).isPlaceholder) - Number(primaryImage(b).isPlaceholder) ||
          Number(b.featured) - Number(a.featured) ||
          CATEGORY_ORDER.indexOf((a.subcategory ?? "") as never) - CATEGORY_ORDER.indexOf((b.subcategory ?? "") as never),
      );
    return sorted;
  }, [products, category, search.q, search.instock, sort]);

  const filtersActive = !!(category || search.q || search.instock);
  const setSearch = (patch: Partial<z.infer<typeof searchSchema>>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), resetScroll: false });

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{category ?? "Shop"}</h1>
        <p className="text-sm text-muted-foreground">
          Prices in Ghana cedis. Accessory photos are of our real stock.
        </p>
      </div>

      {/* Sticky filter bar */}
      <div className="z-20 -mx-4 mt-5 border-b border-border bg-background/90 px-4 pb-3 pt-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-4 md:sticky md:top-16">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search products or brands"
              aria-label="Search products"
              className="h-11 w-full rounded-full border border-input bg-card pl-10 pr-10 text-[15px] outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60"
            />
            {term && (
              <button
                type="button"
                onClick={() => setTerm("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-input bg-card px-4 text-sm">
              <input
                type="checkbox"
                checked={!!search.instock}
                onChange={(e) => setSearch({ instock: e.target.checked || undefined })}
                className="size-4 accent-[#f6c21c]"
              />
              In stock
            </label>
            <div className="relative flex-1 md:flex-none">
              <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={sort}
                onChange={(e) =>
                  setSearch({
                    sort: e.target.value === "featured" ? undefined : (e.target.value as Sort),
                  })
                }
                aria-label="Sort products"
                className="h-11 w-full appearance-none rounded-full border border-input bg-card pl-10 pr-8 text-sm outline-none focus:border-primary/60 md:w-56"
              >
                {Object.entries(SORTS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div
          className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
          role="tablist"
          aria-label="Categories"
        >
          <Chip
            active={!category}
            onClick={() => setSearch({ category: undefined })}
            count={products.length}
          >
            All
          </Chip>
          {CATEGORY_ORDER.filter((c) => counts.has(c)).map((c) => (
            <Chip
              key={c}
              active={category === c}
              onClick={() => setSearch({ category: c })}
              count={counts.get(c) ?? 0}
            >
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <div
        className="mt-4 flex items-center justify-between text-sm text-muted-foreground"
        aria-live="polite"
      >
        <span>
          {results.length} {results.length === 1 ? "product" : "products"}
          {search.q ? ` for “${search.q}”` : ""}
        </span>
        {filtersActive && (
          <Link to="/shop" className="font-medium text-primary hover:underline">
            Clear filters
          </Link>
        )}
      </div>

      {error ? (
        <EmptyState
          title="The catalog didn't load"
          text="Check your connection and refresh the page. You can still order on WhatsApp."
        />
      ) : results.length === 0 ? (
        <EmptyState
          title="Nothing matches yet"
          text="Try a shorter search or another category. Newton's AI can also help you find something similar."
        />
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {results.map((p, i) => (
            <div
              key={p.id}
              className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
              style={{ animationDelay: `${Math.min(i, 11) * 35}ms` }}
            >
              <ProductCard product={p} priority={i < 4} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-all duration-200 active:scale-95",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-white/25 hover:text-foreground",
      )}
    >
      {children}
      <span
        className={cn(
          "text-xs",
          active ? "text-primary-foreground/70" : "text-muted-foreground/70",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto mt-16 max-w-sm text-center">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      <Link
        to="/shop"
        className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Show all products
      </Link>
    </div>
  );
}
