# Product images

## Completed — 33 accessory photos (Newton's Hub's own photography)

Source: `NEWTONS_HUB_IMAGE_SUPPLEMENT.zip` (the shop's photos of its actual stock).
Each was converted to WebP at 480px and 900px wide (3:4) and lives in `public/products/`:

`nwh-001` … `nwh-033` → `/products/nwh-0XX-480.webp` and `/products/nwh-0XX-900.webp`

| SKU | Product | SKU | Product |
|---|---|---|---|
| NWH-001 | Design Covers (iPhone Cases) | NWH-018 | Samsung Android Charger |
| NWH-002 | AirPod Pro (Earbuds) | NWH-019 | Ring Light (12 inch) |
| NWH-003 | iPhone Earpiece | NWH-020 | Type-C Complete Charger |
| NWH-004 | AirPod Case | NWH-021 | JBL Pro 12s (Wireless Earbuds) |
| NWH-005 | Silicon Cover (Samsung & iPhone) | NWH-022 | Power Bank (10000mAh) |
| NWH-006 | Cat Headset (Big) | NWH-023 | Type-C Earpiece |
| NWH-007 | iPhone Complete Charger (100W & 120W) | NWH-024 | Selfie Stick (Medium) |
| NWH-008 | AKG Android Earpiece | NWH-025 | Oraimo Neckband (Big) |
| NWH-009 | 3-in-1 USB Cable | NWH-026 | Pro 5s (Earbuds) |
| NWH-010 | Type-C to Type-C Cord | NWH-027 | Keypad Charger |
| NWH-011 | Oraimo Headset (Over-Ear) | NWH-028 | Camera Lens (Clip-on) |
| NWH-012 | Wireless Mouse | NWH-029 | Design Covers (iPhone Cases) |
| NWH-013 | Oraimo Air 12 Pro (Earbuds) | NWH-030 | Android USB Cable |
| NWH-014 | Type-C iPhone Cord | NWH-031 | Smart 2030 Sim Watch |
| NWH-015 | V13 Phone Gamepad | NWH-032 | Charger Head |
| NWH-016 | D96 Plus (Smart Watch, AirPod, Fan) | NWH-033 | Android Earpiece |
| NWH-017 | Samsung AirPod | | |

They appear on the site immediately (matched by SKU in `src/lib/product-media.ts`). Migration
`20261008090000` also writes matching `product_images` rows so the database is complete.

## Outstanding — 27 phone models (no photos supplied)

Phones currently show an honest branded "Photo coming soon" tile. Manufacturer marketing
images were **not** used: the listings don't record colour, and a press photo in the wrong
finish would misrepresent a new-in-box unit.

Galaxy A06 · Galaxy A07 · Galaxy A16 · Galaxy A17 · iPhone XR · iPhone 11 · iPhone 11 Pro ·
iPhone 12 · iPhone 12 Pro · iPhone 12 Pro Max · iPhone 13 · iPhone 13 Pro · iPhone 13 Pro Max ·
iPhone 14 · iPhone 14 Plus · iPhone 14 Pro · iPhone 14 Pro Max · iPhone 15 · iPhone 15 Pro ·
iPhone 15 Pro Max · iPhone 16 · iPhone 16 Plus · iPhone 16 Pro · iPhone 16 Pro Max ·
iPhone 17 · iPhone 17 Pro · iPhone 17 Pro Max

**Best option:** photograph the boxed units in stock (same style as the accessories), or use
the official image only for the exact colour you hold.

## Adding or replacing a photo

1. Upload the image somewhere stable — e.g. a public Supabase Storage bucket — and copy its
   `https://` URL. (Or add the file to `public/products/` in the repo.)
2. Admin → *Products & stock* → open the product → paste the URL in **Add main photo** → Save.

The new image becomes the primary photo everywhere (cards, product page, AI recommendations).
Broken links fall back to the branded tile automatically.
