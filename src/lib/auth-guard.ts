import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { loginHref } from "./auth-redirect";

// Protected routes disable SSR because browser sessions live in Supabase storage.
// Every data endpoint independently verifies the bearer token on the server.
export async function requireRouteAuth({ location }: { location: { href: string } }) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw redirect({ href: loginHref(location.href), replace: true });
  return { user: data.user };
}
