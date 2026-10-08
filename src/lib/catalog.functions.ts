import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { publicClient } from "./supabase-public.server";

// Public catalog columns only. cost_price and other internal fields are never selected here.
export const PRODUCT_SELECT = `
  id, sku, name, slug, brand, model, subcategory, description, specifications, featured,
  category:categories ( id, name, slug ),
  variants:product_variants ( id, sku, storage, color, condition, stock_type, sealed_in_box, network_lock, battery_health_percent, price, sale_price, stock_quantity, stock_tracking_mode, availability_status, active ),
  images:product_images ( id, image_url, is_primary, sort_order )
`;

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({
        category: z.string().max(80).optional(),
        search: z.string().max(80).optional(),
        featured: z.boolean().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    let query = supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("active", true)
      .order("name", { ascending: true });

    if (data.category) query = query.eq("subcategory", data.category);
    if (data.featured) query = query.eq("featured", true);
    if (data.search) {
      // PostgREST pattern characters are stripped so search text cannot change the filter.
      const term = data.search.replace(/[%_,().*\\]/g, " ").trim();
      if (term)
        query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%`);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error("We couldn't load the catalog right now. Please try again.");
    return rows ?? [];
  });

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1).max(160) }).parse(data))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: row, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error("We couldn't load this product right now. Please try again.");
    return row;
  });

export const listBundles = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("data_bundles")
    .select("id, network, name, data_gb, price, validity, activation_time")
    .eq("active", true)
    .order("network", { ascending: true })
    .order("data_gb", { ascending: true });
  if (error) throw new Error("We couldn't load data bundles right now. Please try again.");
  return data ?? [];
});

export const listServices = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("service_offers")
    .select("id, service_code, name, network, price, description")
    .eq("active", true);
  if (error) throw new Error("We couldn't load services right now. Please try again.");
  return data ?? [];
});

export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase.from("app_settings").select("key, value");
  if (error) throw new Error("We couldn't load shop settings right now.");
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = JSON.stringify(row.value);
  return map;
});
