import { getRequest } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { publicClient } from "./supabase-public.server";
import { loginHref } from "./auth-redirect";

export async function requireRequestAuth() {
  const request = getRequest();
  const token = /^Bearer (\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  const deny = (): never => {
    let destination = "/account";
    try {
      const referrer = new URL(request.headers.get("referer") ?? "");
      if (referrer.origin === new URL(request.url).origin)
        destination = referrer.pathname + referrer.search;
    } catch {
      /* Direct API requests have no return destination. */
    }
    throw redirect({ href: loginHref(destination), statusCode: 303 });
  };
  if (!token) return deny();
  const supabase = publicClient(token);
  // Ask Supabase Auth for the current user; never trust decoded JWTs or browser IDs.
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return deny();
  return { supabase, userId: data.user.id, user: data.user };
}

export async function authorizeOrder(order: { customer_id: string | null } | null, userId: string) {
  if (!userId || !order) throw new Error("Order unavailable or verification failed.");
  if (order.customer_id === userId) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || data !== true) throw new Error("Order unavailable or verification failed.");
}
