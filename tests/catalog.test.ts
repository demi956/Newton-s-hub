import { describe, expect, test } from "bun:test";
import {
  maxOrderable,
  priceRange,
  productAvailability,
  variantAvailability,
  visibleSpecs,
  type CatalogVariant,
} from "../src/lib/catalog";
import { localPhoto, productImages } from "../src/lib/product-media";
import { PHONE_PHOTO_CREDITS } from "../src/lib/photo-credits";
import { existsSync } from "node:fs";
import { safeReturnTo } from "../src/lib/auth-redirect";
import { formatGHS } from "../src/lib/format";

const v = (over: Partial<CatalogVariant> = {}): CatalogVariant => ({
  id: "v1",
  price: 40,
  sale_price: null,
  stock_quantity: 5,
  stock_tracking_mode: "exact",
  availability_status: "available",
  active: true,
  ...over,
});

describe("availability", () => {
  test("exact stock above threshold is in stock", () => {
    expect(variantAvailability(v()).status).toBe("in_stock");
  });
  test("low stock shows remaining count", () => {
    expect(variantAvailability(v({ stock_quantity: 2 })).label).toBe("Only 2 left");
  });
  test("zero stock is out of stock even if status says available", () => {
    const a = variantAvailability(v({ stock_quantity: 0 }));
    expect(a.status).toBe("out_of_stock");
    expect(a.purchasable).toBe(false);
  });
  test("status-only variants (phones) claim no quantity", () => {
    const a = variantAvailability(v({ stock_quantity: null, stock_tracking_mode: "status_only" }));
    expect(a.label).toBe("Available");
    expect(a.quantity).toBeNull();
  });
  test("max orderable is capped by stock and by 20", () => {
    expect(maxOrderable(v({ stock_quantity: 3 }))).toBe(3);
    expect(maxOrderable(v({ stock_quantity: 99 }))).toBe(20);
    expect(maxOrderable(v({ stock_quantity: null, stock_tracking_mode: "status_only" }))).toBe(20);
    expect(maxOrderable(v({ stock_quantity: 0 }))).toBe(0);
  });
  test("product availability picks the best variant and ignores inactive ones", () => {
    const p = {
      variants: [
        v({ id: "a", stock_quantity: 0 }),
        v({ id: "b", stock_quantity: 4 }),
        v({ id: "c", active: false }),
      ],
    };
    expect(productAvailability(p).status).toBe("in_stock");
  });
  test("price range uses sale prices", () => {
    expect(priceRange({ variants: [v({ price: 50, sale_price: 45 }), v({ price: 30 })] })).toEqual({
      min: 30,
      max: 45,
    });
  });
});

describe("specs", () => {
  test("internal bookkeeping keys are hidden from shoppers", () => {
    const specs = visibleSpecs({
      chip: "A15",
      source_image_path: "x.png",
      source_url: "u",
      region_note: "r",
      display: "6.1",
    });
    expect(specs.map(([k]) => k)).toEqual(["chip", "display"]);
  });
});

describe("product images", () => {
  test("every supplied SKU maps to a responsive local photo", () => {
    for (let i = 1; i <= 33; i++) {
      const sku = `NWH-${String(i).padStart(3, "0")}`;
      const photo = localPhoto(sku);
      expect(photo?.src).toBe(`/products/${sku.toLowerCase()}-900.webp`);
      expect(photo?.srcSet).toContain("-480.webp 480w");
    }
  });
  test("database image rows win over the local fallback, primary first", () => {
    const imgs = productImages({
      sku: "NWH-001",
      images: [
        { image_url: "https://cdn.example/b.jpg", is_primary: false, sort_order: 1 },
        { image_url: "https://cdn.example/a.jpg", is_primary: true, sort_order: 5 },
      ],
    });
    expect(imgs.map((i) => i.src)).toEqual([
      "https://cdn.example/a.jpg",
      "https://cdn.example/b.jpg",
    ]);
  });
  test("rows pointing at our own files get the responsive set", () => {
    const [img] = productImages({
      sku: "NWH-002",
      images: [{ image_url: "/products/nwh-002-900.webp", is_primary: true, sort_order: 0 }],
    });
    expect(img?.srcSet).toBeDefined();
  });
  test("products without photos get the honest placeholder tile", () => {
    const [img] = productImages({ sku: null, images: [] });
    expect(img?.isPlaceholder).toBe(true);
  });
  test("every phone model has a credited reference photo on disk", () => {
    for (const c of PHONE_PHOTO_CREDITS) {
      const [img] = productImages({ sku: null, slug: c.slug, images: [] });
      expect(img?.isReference).toBe(true);
      expect(img?.src).toBe(`/products/phones/${c.slug}-900.webp`);
      for (const w of [480, 900])
        expect(existsSync(`public/products/phones/${c.slug}-${w}.webp`)).toBe(true);
    }
    expect(PHONE_PHOTO_CREDITS).toHaveLength(27);
  });
  test("accessory photos are never labelled as reference photos", () => {
    expect(localPhoto("NWH-013")?.isReference).toBeFalsy();
  });
});

describe("login redirect safety", () => {
  test("keeps local paths", () => {
    expect(safeReturnTo("/checkout")).toBe("/checkout");
    expect(safeReturnTo("/shop?category=Phones#top")).toBe("/shop?category=Phones#top");
  });
  test("rejects external, protocol-relative and auth-loop destinations", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/auth",
      "/auth/reset",
      "javascript:alert(1)",
      42,
    ])
      expect(safeReturnTo(bad)).toBe("/account");
  });
});

describe("money", () => {
  test("formats Ghana cedis", () => {
    expect(formatGHS(1500)).toBe("GH₵ 1,500.00");
    expect(formatGHS("12.5")).toBe("GH₵ 12.50");
  });
});
