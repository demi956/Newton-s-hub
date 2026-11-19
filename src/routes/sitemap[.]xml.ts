import { createFileRoute } from "@tanstack/react-router";
import { publicClient } from "@/lib/supabase-public.server";
import { SITE_URL } from "@/lib/site";

const STATIC_PATHS = ["/", "/shop", "/bundles", "/buy-sell-swap", "/contact"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let products: Array<{ slug: string; updated_at: string | null }> = [];
        try {
          const { data } = await publicClient()
            .from("products")
            .select("slug, updated_at")
            .eq("active", true);
          products = (data ?? []) as typeof products;
        } catch {
          /* the static pages are still worth listing */
        }
        const urls = [
          ...STATIC_PATHS.map((p) => `<url><loc>${SITE_URL}${p}</loc></url>`),
          ...products.map(
            (p) =>
              `<url><loc>${SITE_URL}/shop/${encodeURIComponent(p.slug)}</loc>${
                p.updated_at ? `<lastmod>${p.updated_at.slice(0, 10)}</lastmod>` : ""
              }</url>`,
          ),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
