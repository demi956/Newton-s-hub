import { describe, expect, mock, test } from "bun:test";

// The assistant module imports server-only helpers; stub the request accessor.
mock.module("@tanstack/react-start/server", () => ({
  getRequest: () => ({ headers: new Headers() }),
}));
const { catalogAnswer } = await import("../src/lib/assistant.server");

const variant = (price: number, stock: number | null, mode = "exact") => ({
  id: crypto.randomUUID(),
  price,
  sale_price: null,
  stock_quantity: stock,
  stock_tracking_mode: mode,
  availability_status: "available",
  active: true,
});
const product = (
  name: string,
  subcategory: string,
  price: number,
  stock: number | null,
  extra = {},
) => ({
  id: crypto.randomUUID(),
  sku: null,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  brand: null,
  subcategory,
  variants: [variant(price, stock, stock === null ? "status_only" : "exact")],
  images: [],
  ...extra,
});

const snapshot = {
  at: Date.now(),
  products: [
    product("Oraimo Air 12 Pro (Earbuds)", "Earbuds & Earpieces", 75, 5),
    product("JBL Pro 12s (Wireless Earbuds)", "Earbuds & Earpieces", 100, 3),
    product("Power Bank (10000mAh)", "Gadgets & Accessories", 120, 8),
    product("Ring Light (12 inch)", "Gadgets & Accessories", 150, 5),
    product("Smart 2030 Sim Watch", "Gadgets & Accessories", 250, 0),
    product("iPhone 13", "Phones", 3650, null),
  ],
  bundles: [
    { network: "MTN", name: "1GB", price: 5, validity: null },
    { network: "Telecel", name: "5GB", price: 27, validity: null },
  ],
  services: [{ name: "MTN AFA Registration", price: 20, description: null }],
} as never;

describe("Newton's AI catalog engine", () => {
  test("budget answers only include purchasable items within budget", () => {
    const r = catalogAnswer(snapshot, "I have GH₵150. What can I buy?");
    expect(r.products.length).toBeGreaterThan(0);
    for (const p of r.products)
      expect(Number(p.price.replace(/[^\d.]/g, ""))).toBeLessThanOrEqual(150);
    expect(r.products.some((p) => p.name.includes("Sim Watch"))).toBe(false); // out of stock / over budget
    expect(r.products[0]?.name).toBe("Ring Light (12 inch)"); // best value first
  });
  test("category search finds earbuds", () => {
    const r = catalogAnswer(snapshot, "I'm looking for affordable wireless earbuds");
    expect(r.products.map((p) => p.name)).toContain("Oraimo Air 12 Pro (Earbuds)");
  });
  test("phones never claim a stock count", () => {
    const r = catalogAnswer(snapshot, "Show me available phones");
    expect(r.products[0]?.availability).toBe("Available");
  });
  test("data bundle questions summarise networks and AFA from data", () => {
    const r = catalogAnswer(snapshot, "Help with data bundles");
    expect(r.reply).toContain("MTN");
    expect(r.reply).toContain("GH₵20");
    expect(r.links[0]?.to).toBe("/bundles");
  });
  test("support requests hand off to WhatsApp", () => {
    expect(catalogAnswer(snapshot, "I want to talk to a person").handoff).toBe(true);
  });
  test("swap questions explain inspection-based offers", () => {
    expect(catalogAnswer(snapshot, "How does swap work?").reply).toMatch(/inspect/i);
  });
  test("unknown requests admit the limitation instead of inventing", () => {
    const r = catalogAnswer(snapshot, "Do you sell lawn mowers?");
    expect(r.products).toHaveLength(0);
    expect(r.handoff).toBe(true);
  });
  test("comparisons use real prices", () => {
    const r = catalogAnswer(snapshot, "compare oraimo earbuds vs jbl earbuds");
    expect(r.reply).toContain("GH₵75");
    expect(r.reply).toContain("GH₵100");
  });
});
