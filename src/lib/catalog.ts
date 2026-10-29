// Client-safe catalog helpers shared by the shop, product pages, cart and assistant.
import type { ImageRow } from "./product-media";

export type CatalogVariant = {
  id: string;
  sku?: string | null;
  storage?: string | null;
  color?: string | null;
  condition?: string | null;
  network_lock?: string | null;
  battery_health_percent?: number | null;
  price: number | string;
  sale_price: number | string | null;
  stock_quantity?: number | null;
  stock_tracking_mode?: string | null;
  availability_status: string | null;
  active: boolean | null;
};

export type CatalogProduct = {
  id: string;
  sku?: string | null;
  name: string;
  slug: string;
  brand: string | null;
  model?: string | null;
  subcategory: string | null;
  description?: string | null;
  specifications?: unknown;
  featured?: boolean | null;
  variants: CatalogVariant[];
  images: ImageRow[];
};

/** Accessory groupings used by the catalog seed, in display order. */
export const CATEGORY_ORDER = [
  "Phones",
  "Earbuds & Earpieces",
  "Headsets & Neckbands",
  "Chargers & Cables",
  "Cases & Covers",
  "Gadgets & Accessories",
] as const;

export function activeVariants(product: Pick<CatalogProduct, "variants">) {
  return (product.variants ?? []).filter(
    (v) => v.active !== false && v.availability_status !== "inactive",
  );
}

export function unitPrice(v: Pick<CatalogVariant, "price" | "sale_price">): number {
  return Number(v.sale_price ?? v.price);
}

export function priceRange(product: Pick<CatalogProduct, "variants">) {
  const prices = activeVariants(product).map(unitPrice).filter(Number.isFinite);
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export type Availability = {
  status: "in_stock" | "low_stock" | "out_of_stock" | "preorder" | "unknown";
  label: string;
  quantity: number | null;
  purchasable: boolean;
};

const LOW_STOCK = 2;

export function variantAvailability(v: CatalogVariant | undefined | null): Availability {
  if (!v)
    return { status: "unknown", label: "Ask availability", quantity: null, purchasable: false };
  const exact = (v.stock_tracking_mode ?? "exact") === "exact";
  const qty = exact && typeof v.stock_quantity === "number" ? v.stock_quantity : null;
  if (v.availability_status === "out_of_stock" || (qty !== null && qty <= 0))
    return { status: "out_of_stock", label: "Out of stock", quantity: 0, purchasable: false };
  if (v.availability_status === "preorder")
    return { status: "preorder", label: "Pre-order", quantity: qty, purchasable: true };
  if (qty !== null && qty <= LOW_STOCK)
    return { status: "low_stock", label: `Only ${qty} left`, quantity: qty, purchasable: true };
  // status_only variants (e.g. phones) have no exact count, so no quantity is claimed.
  return {
    status: "in_stock",
    label: qty === null ? "Available" : "In stock",
    quantity: qty,
    purchasable: true,
  };
}

/** Best availability across a product's variants (for cards and lists). */
export function productAvailability(product: Pick<CatalogProduct, "variants">): Availability {
  const list = activeVariants(product).map(variantAvailability);
  if (!list.length) return variantAvailability(null);
  const rank = { in_stock: 0, low_stock: 1, preorder: 2, out_of_stock: 3, unknown: 4 } as const;
  return list.sort((a, b) => rank[a.status] - rank[b.status])[0] ?? variantAvailability(null);
}

export function variantLabel(v: Pick<CatalogVariant, "storage" | "color" | "condition">) {
  return [v.storage, v.color, v.condition].filter(Boolean).join(" · ") || "Standard";
}

export function maxOrderable(v: CatalogVariant | undefined | null): number {
  const a = variantAvailability(v);
  if (!a.purchasable) return 0;
  return Math.min(20, a.quantity ?? 20);
}

/** Specification keys that are internal bookkeeping, never shown to shoppers. */
export const HIDDEN_SPEC_KEYS = new Set([
  "source_url",
  "region_note",
  "source_image_path",
  "source_page",
  "notes",
]);

export function visibleSpecs(specifications: unknown): Array<[string, string]> {
  if (!specifications || typeof specifications !== "object" || Array.isArray(specifications))
    return [];
  return Object.entries(specifications as Record<string, unknown>)
    .filter(([key, value]) => !HIDDEN_SPEC_KEYS.has(key) && value !== null && value !== "")
    .map(([key, value]) => [key.replace(/_/g, " "), String(value)]);
}
