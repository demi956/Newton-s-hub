import { Link } from "@tanstack/react-router";
import { Box, Inbox, LayoutDashboard, Package, Repeat2, Wifi } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const ADMIN_TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "orders", label: "Orders", icon: Package },
  { key: "requests", label: "Sell & swap", icon: Repeat2 },
  { key: "products", label: "Products & stock", icon: Box },
  { key: "data", label: "Data requests", icon: Wifi },
  { key: "messages", label: "Messages", icon: Inbox },
] as const;
export type AdminTab = (typeof ADMIN_TABS)[number]["key"];

export function AdminLayout({ tab, children }: { tab: AdminTab; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-16 pt-6 sm:px-6 md:grid-cols-[13rem_1fr] md:gap-8 md:pt-10">
      <aside className="md:sticky md:top-24 md:self-start">
        <h1 className="font-display text-lg font-bold">
          Newton&apos;s Hub <span className="text-primary">Admin</span>
        </h1>
        <nav
          aria-label="Admin sections"
          className="no-scrollbar -mx-4 mt-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0"
        >
          {ADMIN_TABS.map((t) => (
            <Link
              key={t.key}
              to="/admin"
              search={{ tab: t.key }}
              aria-current={tab === t.key ? "page" : undefined}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <t.icon className="size-4" /> {t.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
