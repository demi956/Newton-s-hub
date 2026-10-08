import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "./auth-middleware";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const DEVICE_TYPES = ["Phone", "Tablet", "Laptop", "Smart watch", "Earbuds / audio", "Other"] as const;

export const submitBuySwapRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        request_type: z.enum(["sell", "swap"]),
        device_type: z.enum(DEVICE_TYPES).optional(),
        customer_name: z.string().trim().min(2).max(120),
        customer_phone: z
          .string()
          .trim()
          .min(9)
          .max(20)
          .regex(/^[+\d][\d\s-]+$/, "Enter a valid phone number."),
        current_brand: optionalText(60),
        current_model: optionalText(120),
        current_storage: optionalText(60),
        current_condition: optionalText(60),
        battery_health_percent: z.number().min(0).max(100).nullable().optional(),
        imei_or_serial: optionalText(60),
        desired_device: optionalText(160),
        desired_product_id: z.string().uuid().nullable().optional(),
        customer_notes: optionalText(1000),
        ownership_confirmed: z.boolean(),
      })
      .refine((d) => d.request_type === "sell" || (d.desired_device ?? "").length > 1 || !!d.desired_product_id, {
        message: "Tell us which device you'd like to swap for.",
        path: ["desired_device"],
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (!data.ownership_confirmed) {
      throw new Error("Please confirm that the device belongs to you.");
    }
    // Structured extras without schema changes: kept at the top of customer_notes.
    const notes = [
      data.device_type ? `Device type: ${data.device_type}` : null,
      data.request_type === "swap" && data.desired_device ? `Wants: ${data.desired_device}` : null,
      data.customer_notes || null,
    ]
      .filter(Boolean)
      .join("\n");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("buy_swap_requests")
      .insert({
        request_type: data.request_type,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        current_brand: data.current_brand || null,
        current_model: data.current_model || null,
        current_storage: data.current_storage || null,
        current_condition: data.current_condition || null,
        battery_health_percent: data.battery_health_percent ?? null,
        imei_or_serial: data.imei_or_serial || null,
        desired_product_id: data.desired_product_id ?? null,
        customer_notes: notes || null,
        ownership_confirmed: true,
        customer_id: userId,
        admin_status: "pending_review",
        photo_urls: [],
      })
      .select("id, request_number")
      .single();
    if (error)
      throw new Error("Unable to submit your request. Please try again or contact the shop.");
    return row;
  });

export const listMyRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Row-level security limits this to the signed-in customer's own requests.
    const { data, error } = await context.supabase
      .from("buy_swap_requests")
      .select(
        "id, request_number, request_type, current_brand, current_model, admin_status, admin_offer, created_at",
      )
      .eq("customer_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("Unable to load your requests right now.");
    return data ?? [];
  });

export const submitContactMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        email: z.string().trim().email().optional().or(z.literal("")),
        phone: optionalText(30),
        subject: optionalText(160),
        message: z.string().trim().min(5).max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_messages").insert({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      subject: data.subject || null,
      message: data.message,
      customer_id: userId,
      status: "new",
    });
    if (error)
      throw new Error("Unable to submit your request. Please try again or contact the shop.");
    return { ok: true };
  });
