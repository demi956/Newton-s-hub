// Only local application URLs may be used as login return destinations.
export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/account";
  try {
    const url = new URL(value, "https://app.invalid");
    if (url.origin !== "https://app.invalid" || /^\/auth(?:\/|$)/.test(url.pathname)) return "/account";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/account";
  }
}

export function loginHref(returnTo: unknown): string {
  return "/auth?redirect=" + encodeURIComponent(safeReturnTo(returnTo));
}
