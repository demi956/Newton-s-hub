import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRouteAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: requireRouteAuth,
  component: () => <Outlet />,
});
