import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const sections = [
  "Products",
  "Inventory",
  "Orders",
  "Bundle Orders",
  "Customers",
  "Buy/Sell/Swap",
  "Payments",
  "Messages",
  "Settings",
];
export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[200px_1fr]">
      <aside>
        <h1 className="mb-5 font-display text-xl font-semibold">Newton's Hub Admin</h1>
        <nav aria-label="Admin navigation" className="flex flex-col gap-2">
          <Link to="/admin" className="rounded-lg bg-secondary px-3 py-2 font-semibold">
            Dashboard
          </Link>
          {sections.map((section) => (
            <span
              key={section}
              aria-disabled="true"
              className="px-3 py-2 text-sm text-muted-foreground"
            >
              {section}
              <span className="block text-xs">Coming soon</span>
            </span>
          ))}
        </nav>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
