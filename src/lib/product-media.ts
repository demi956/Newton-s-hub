// Newton's Hub's own product photography, shipped with the site under /public/products.
// Each SKU has a 480px and a 900px WebP. Database image rows (product_images) always win;
// these local files cover products whose image rows have not been added yet.
import placeholder from "@/assets/phone-placeholder.jpg";

/** Average colour of each photo, used as the loading placeholder background. */
const LOCAL_PHOTOS: Record<string, string> = {
  "NWH-001": "#8d6751",
  "NWH-002": "#807564",
  "NWH-003": "#786e68",
  "NWH-004": "#837c6f",
  "NWH-005": "#655c72",
  "NWH-006": "#7a7163",
  "NWH-007": "#7a7488",
  "NWH-008": "#7c6c72",
  "NWH-009": "#62625c",
  "NWH-010": "#86807c",
  "NWH-011": "#586732",
  "NWH-012": "#7c827d",
  "NWH-013": "#7f7957",
  "NWH-014": "#7a706d",
  "NWH-015": "#867168",
  "NWH-016": "#756d5f",
  "NWH-017": "#7b726a",
  "NWH-018": "#77736f",
  "NWH-019": "#776a67",
  "NWH-020": "#6a6a69",
  "NWH-021": "#958f85",
  "NWH-022": "#716a63",
  "NWH-023": "#7b675a",
  "NWH-024": "#837970",
  "NWH-025": "#938e7f",
  "NWH-026": "#797069",
  "NWH-027": "#52573c",
  "NWH-028": "#525b44",
  "NWH-029": "#78685c",
  "NWH-030": "#943f37",
  "NWH-031": "#77716e",
  "NWH-032": "#685d5a",
  "NWH-033": "#7c6b63",
};

/**
 * Reference photos for phone models (by product slug), under /public/products/phones.
 * These are freely licensed Wikimedia Commons photos of the model, not Newton's Hub's own
 * stock, so they are flagged as reference images in the UI. Credits: /photo-credits.
 */
const PHONE_PHOTOS: Record<string, string> = {
  "galaxy-a06": "#7c7d7e",
  "galaxy-a07": "#86769b",
  "galaxy-a16": "#608b8e",
  "galaxy-a17": "#7c8ca3",
  "iphone-11": "#897768",
  "iphone-11-pro": "#6a6b6a",
  "iphone-12": "#eceef1",
  "iphone-12-pro": "#9d8d83",
  "iphone-12-pro-max": "#7a7f7d",
  "iphone-13": "#9e9f99",
  "iphone-13-pro": "#954147",
  "iphone-13-pro-max": "#2f2428",
  "iphone-14": "#bc515e",
  "iphone-14-plus": "#8b8983",
  "iphone-14-pro": "#8f8d87",
  "iphone-14-pro-max": "#676276",
  "iphone-15": "#a4a2ae",
  "iphone-15-pro": "#955466",
  "iphone-15-pro-max": "#a2a3aa",
  "iphone-16": "#71615a",
  "iphone-16-plus": "#ac929d",
  "iphone-16-pro": "#96867f",
  "iphone-16-pro-max": "#91919c",
  "iphone-17": "#797370",
  "iphone-17-pro": "#9f8b77",
  "iphone-17-pro-max": "#8d6345",
  "iphone-xr": "#996f66",
};

export const PLACEHOLDER_IMAGE = placeholder;

export type ImageRow = {
  image_url: string;
  is_primary: boolean | null;
  sort_order: number | null;
};

export type ResolvedImage = {
  src: string;
  srcSet?: string | undefined;
  color?: string | undefined;
  isPlaceholder: boolean;
  /** A model reference photo rather than a photo of the shop's own stock. */
  isReference?: boolean | undefined;
};

/** Local photo for a SKU, if Newton's Hub supplied one. */
export function localPhoto(sku: string | null | undefined): ResolvedImage | null {
  if (!sku) return null;
  const key = sku.toUpperCase();
  const color = LOCAL_PHOTOS[key];
  if (!color) return null;
  const base = `/products/${key.toLowerCase()}`;
  return {
    src: `${base}-900.webp`,
    srcSet: `${base}-480.webp 480w, ${base}-900.webp 900w`,
    color,
    isPlaceholder: false,
  };
}

/** Reference photo for a phone model, by product slug. */
export function phonePhoto(slug: string | null | undefined): ResolvedImage | null {
  if (!slug) return null;
  const color = PHONE_PHOTOS[slug];
  if (!color) return null;
  const base = `/products/phones/${slug}`;
  return {
    src: `${base}-900.webp`,
    srcSet: `${base}-480.webp 480w, ${base}-900.webp 900w`,
    color,
    isPlaceholder: false,
    isReference: true,
  };
}

function fromUrl(url: string, sku?: string | null): ResolvedImage {
  // Database rows that point at our own /products files get the responsive set too.
  const match = /^\/products\/(nwh-\d{3})-\d+\.webp$/i.exec(url);
  if (match) {
    const local = localPhoto(match[1]);
    if (local) return local;
  }
  return {
    src: url,
    color: sku ? LOCAL_PHOTOS[sku.toUpperCase()] : undefined,
    isPlaceholder: false,
  };
}

/** All images for a product, primary first, falling back to the local photo, then a placeholder. */
export function productImages(product: {
  sku?: string | null;
  slug?: string | null;
  images?: ImageRow[] | null;
}): ResolvedImage[] {
  const rows = [...(product.images ?? [])]
    .filter((row) => typeof row.image_url === "string" && row.image_url.trim() !== "")
    .sort(
      (a, b) =>
        Number(b.is_primary) - Number(a.is_primary) || (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
  const resolved = rows.map((row) => fromUrl(row.image_url, product.sku));
  const seen = new Set<string>();
  const unique = resolved.filter((img) => (seen.has(img.src) ? false : (seen.add(img.src), true)));
  if (unique.length) return unique;
  const local = localPhoto(product.sku) ?? phonePhoto(product.slug);
  if (local) return [local];
  return [{ src: placeholder, isPlaceholder: true }];
}

export function primaryImage(product: {
  sku?: string | null;
  slug?: string | null;
  images?: ImageRow[] | null;
}): ResolvedImage {
  return productImages(product)[0] ?? { src: placeholder, isPlaceholder: true };
}
