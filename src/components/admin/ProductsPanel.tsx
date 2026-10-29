import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import {
  adminListProducts,
  adminUpdateProduct,
  adminUpdateVariant,
  type AdminProductUpdate,
  type AdminVariantUpdate,
} from "@/lib/admin.functions";
import { primaryImage } from "@/lib/product-media";
import { formatGHS } from "@/lib/format";
import { variantLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { LoadState, PanelHeader, Pill, useAdminAction } from "./shared";

type Product = Awaited<ReturnType<typeof adminListProducts>>[number];
type Variant = Product["variants"][number];
const AVAIL = ["available", "out_of_stock", "preorder", "inactive"] as const;

export function ProductsPanel() {
  const list = useServerFn(adminListProducts);
  const q = useQuery({ queryKey: ["admin-products"], queryFn: () => list() });
  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const term = search.toLowerCase().trim();
    return (q.data ?? []).filter((p) => {
      if (
        term &&
        !`${p.name} ${p.sku ?? ""} ${p.brand ?? ""} ${p.subcategory ?? ""}`
          .toLowerCase()
          .includes(term)
      )
        return false;
      if (lowOnly)
        return p.variants.some(
          (v) => v.stock_tracking_mode === "exact" && (v.stock_quantity ?? 0) <= 2,
        );
      return true;
    });
  }, [q.data, search, lowOnly]);

  return (
    <div>
      <PanelHeader
        title="Products & stock"
        text="Edit prices, stock and visibility. Changes go live on the shop immediately."
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={lowOnly}
              onChange={(e) => setLowOnly(e.target.checked)}
              className="size-4 accent-[#f6c21c]"
            />
            Low stock only
          </label>
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">Search products</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, SKU or brand"
              className="h-10 w-full rounded-full border border-input bg-card pl-9 pr-4 text-sm outline-none focus:border-primary/60 sm:w-56"
            />
          </label>
        </div>
      </PanelHeader>
      <LoadState
        loading={q.isLoading}
        error={q.isError}
        empty={!q.isLoading && rows.length === 0}
        retry={() => void q.refetch()}
      />
      <ul className="mt-5 space-y-2">
        {rows.map((p) => {
          const stock = p.variants.reduce(
            (n, v) => n + (v.stock_tracking_mode === "exact" ? (v.stock_quantity ?? 0) : 0),
            0,
          );
          const exact = p.variants.some((v) => v.stock_tracking_mode === "exact");
          const min = Math.min(...p.variants.map((v) => Number(v.sale_price ?? v.price)));
          return (
            <li key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <button
                type="button"
                onClick={() => setOpen(open === p.id ? null : p.id)}
                aria-expanded={open === p.id}
                className="flex w-full items-center gap-3 p-3 text-left"
              >
                <ProductImage
                  image={primaryImage(p)}
                  alt=""
                  caption={false}
                  sizes="48px"
                  className="size-12 shrink-0 rounded-lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    <span className="truncate">{p.name}</span>
                    {!p.active && <Pill tone="danger">hidden</Pill>}
                    {p.featured && <Pill tone="gold">featured</Pill>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.sku ?? "No SKU"} · {p.subcategory} ·{" "}
                    {Number.isFinite(min) ? `from ${formatGHS(min)}` : "no price"}
                    {exact ? ` · ${stock} in stock` : " · stock by status"}
                  </p>
                </div>
                {exact && stock <= 2 && (
                  <Pill tone={stock === 0 ? "danger" : "gold"}>{stock === 0 ? "out" : "low"}</Pill>
                )}
                <ChevronDown
                  className={cn(
                    "size-5 shrink-0 text-muted-foreground transition-transform",
                    open === p.id && "rotate-180",
                  )}
                />
              </button>
              {open === p.id && (
                <div className="space-y-4 border-t border-border p-3 animate-in fade-in slide-in-from-top-1 sm:p-4">
                  <ProductEditor product={p} />
                  <div className="space-y-2">
                    {p.variants.map((v) => (
                      <VariantEditor key={v.id} variant={v} />
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProductEditor({ product: p }: { product: Product }) {
  const update = useServerFn(adminUpdateProduct);
  const save = useAdminAction(
    (args: AdminProductUpdate) => update({ data: args }),
    ["admin-products"],
    "Product saved",
  );
  const [active, setActive] = useState(p.active);
  const [featured, setFeatured] = useState(p.featured);
  const [description, setDescription] = useState(p.description ?? "");
  const [imageUrl, setImageUrl] = useState("");
  return (
    <form
      className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({
          id: p.id,
          active,
          featured,
          description: description.trim() || null,
          ...(imageUrl.trim() ? { image_url: imageUrl.trim() } : {}),
        });
      }}
    >
      <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-4 accent-[#f6c21c]"
          />{" "}
          Visible in shop
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="size-4 accent-[#f6c21c]"
          />{" "}
          Featured on homepage
        </label>
      </div>
      <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">
        Description
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm font-normal text-foreground outline-none focus:border-primary/60"
        />
      </label>
      <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">
        Add main photo (https:// link or /products/… path)
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
          className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus:border-primary/60"
        />
      </label>
      <button
        type="submit"
        disabled={save.isPending}
        className="h-10 w-fit rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
      >
        {save.isPending ? "Saving…" : "Save product"}
      </button>
    </form>
  );
}

function VariantEditor({ variant: v }: { variant: Variant }) {
  const update = useServerFn(adminUpdateVariant);
  const save = useAdminAction(
    (args: AdminVariantUpdate) => update({ data: args }),
    ["admin-products"],
    "Variant saved",
  );
  const [price, setPrice] = useState(String(v.price));
  const [sale, setSale] = useState(v.sale_price != null ? String(v.sale_price) : "");
  const [stock, setStock] = useState(v.stock_quantity != null ? String(v.stock_quantity) : "");
  const [availability, setAvailability] = useState<(typeof AVAIL)[number]>(
    (AVAIL as readonly string[]).includes(v.availability_status)
      ? (v.availability_status as (typeof AVAIL)[number])
      : "available",
  );
  const [active, setActive] = useState(v.active);

  const priceN = Number(price);
  const saleN = sale.trim() === "" ? null : Number(sale);
  const stockN = stock.trim() === "" ? null : Number(stock);
  const errors = [
    !(Number.isFinite(priceN) && priceN >= 0) && "Price must be a number.",
    saleN !== null &&
      !(Number.isFinite(saleN) && saleN >= 0 && saleN <= priceN) &&
      "Sale price must be below the price.",
    stockN !== null &&
      !(Number.isInteger(stockN) && stockN >= 0) &&
      "Stock must be a whole number.",
  ].filter(Boolean) as string[];

  const input =
    "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary/60";
  return (
    <form
      className="rounded-xl bg-secondary/40 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!errors.length)
          save.mutate({
            id: v.id,
            price: priceN,
            sale_price: saleN,
            stock_quantity: stockN,
            availability_status: availability,
            active,
          });
      }}
    >
      <p className="text-sm font-semibold">
        {variantLabel(v)}{" "}
        <span className="font-mono text-xs font-normal text-muted-foreground">{v.sku}</span>
        {v.cost_price != null && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            cost {formatGHS(v.cost_price)}
          </span>
        )}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <label className="text-xs text-muted-foreground">
          Price
          <input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={input}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Sale price
          <input
            inputMode="decimal"
            value={sale}
            onChange={(e) => setSale(e.target.value)}
            placeholder="—"
            className={input}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Stock {v.stock_tracking_mode !== "exact" && "(status only)"}
          <input
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="—"
            className={input}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          Availability
          <select
            value={availability}
            onChange={(e) => setAvailability(e.target.value as (typeof AVAIL)[number])}
            className={input}
          >
            {AVAIL.map((a) => (
              <option key={a} value={a}>
                {a.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <div className="col-span-2 flex items-end gap-3 sm:col-span-1">
          <label className="flex h-10 items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="size-4 accent-[#f6c21c]"
            />{" "}
            Active
          </label>
          <button
            type="submit"
            disabled={save.isPending || errors.length > 0}
            className="h-10 flex-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
      {errors.length > 0 && <p className="mt-2 text-xs text-destructive">{errors[0]}</p>}
    </form>
  );
}
