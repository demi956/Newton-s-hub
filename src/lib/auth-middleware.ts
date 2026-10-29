import { createMiddleware } from "@tanstack/react-start";
import { requireRouteAuth } from "./auth-guard";

export const requireSupabaseAuth = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    await requireRouteAuth({
      location: { href: window.location.pathname + window.location.search + window.location.hash },
    });
    return next();
  })
  .server(async ({ next }) => {
    const { requireRequestAuth } = await import("./request-auth.server");
    return next({ context: await requireRequestAuth() });
  });
