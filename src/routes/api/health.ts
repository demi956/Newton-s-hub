import { createFileRoute } from "@tanstack/react-router";
import { publicClient } from "@/lib/supabase-public.server";

// Health check, also called daily by the Vercel cron in vercel.json. The tiny query counts as
// database activity, which stops Supabase's free plan from pausing the project after a quiet
// week (a paused project takes the catalog, sign-in and sign-up offline).
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        const { error } = await publicClient().from("products").select("id").limit(1);
        const body = { ok: !error, db: error ? "unreachable" : "ok", ms: Date.now() - started };
        return Response.json(body, {
          status: error ? 503 : 200,
          headers: { "cache-control": "no-store" },
        });
      },
    },
  },
});
