import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Repeat2, Store, User, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { showsTabBar } from "@/lib/tab-bar";

const TABS = [
  { to: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { to: "/shop", label: "Shop", icon: Store, match: (p: string) => p.startsWith("/shop") },
  { to: "/bundles", label: "Data", icon: Wifi, match: (p: string) => p.startsWith("/bundles") },
  {
    to: "/buy-sell-swap",
    label: "Swap",
    icon: Repeat2,
    match: (p: string) => p.startsWith("/buy-sell-swap"),
  },
  { to: "/account", label: "Account", icon: User, match: (p: string) => p.startsWith("/account") },
] as const;

/** App-style bottom navigation for phones (hidden from md up, where the header nav shows). */
export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!showsTabBar(pathname)) return null;
  return (
    <>
      {/* Spacer so the end of every page can scroll clear of the bar. */}
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom))] md:hidden" />
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#07131f]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <span aria-hidden className="spectrum-line absolute inset-x-0 top-0 h-px opacity-50" />
        <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
          {TABS.map(({ to, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <li key={to}>
                <Link
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground active:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-12 items-center justify-center rounded-full transition-all duration-300",
                      active ? "bg-primary/15" : "group-active:scale-90",
                    )}
                  >
                    <Icon className={cn("size-[1.2rem]", active && "stroke-[2.4]")} />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
