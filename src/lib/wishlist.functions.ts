import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "./auth-middleware";

// All wishlist reads and writes use the customer's own token, so row-level security
// (wishlist_owner_all) guarantees customers only ever touch their own rows.

export const listWishlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("wishlist_items")
      .select("product_id")
      .eq("customer_id", context.userId);
    if (error) throw new Error("Unable to load your saved items right now.");
    return (data ?? []).map((row) => row.product_id);
  });

export const setWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        add: z.array(z.string().uuid()).max(100).default([]),
        remove: z.array(z.string().uuid()).max(100).default([]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    if (data.add.length) {
      const { error } = await db.from("wishlist_items").upsert(
        data.add.map((product_id) => ({ customer_id: context.userId, product_id })),
        { onConflict: "customer_id,product_id", ignoreDuplicates: true },
      );
      if (error) throw new Error("Unable to save that item right now.");
    }
    if (data.remove.length) {
      const { error } = await db
        .from("wishlist_items")
        .delete()
        .eq("customer_id", context.userId)
        .in("product_id", data.remove);
      if (error) throw new Error("Unable to update your saved items right now.");
    }
    return { ok: true };
  });
