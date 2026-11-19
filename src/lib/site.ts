// Public site address, used for canonical links, the sitemap and social previews.
// Set SITE_URL / VITE_SITE_URL when Newton's Hub moves to its own domain.
export const SITE_URL = (
  (typeof process !== "undefined" ? process.env["SITE_URL"] : undefined) ||
  import.meta.env["VITE_SITE_URL"] ||
  "https://newton-s-hub.vercel.app"
).replace(/\/+$/, "");

export const absoluteUrl = (path: string) =>
  path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
