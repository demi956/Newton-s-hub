import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import mark from "@/assets/brand-mark.webp";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProductImage } from "@/components/ProductImage";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { useAuth } from "@/hooks/useAuth";
import { listProducts } from "@/lib/catalog.functions";
import { priceRange, type CatalogProduct } from "@/lib/catalog";
import { primaryImage } from "@/lib/product-media";
import { formatGHS } from "@/lib/format";

const NAV = [
  { to: "/shop", label: "Shop" },
  { to: "/bundles", label: "Data & AFA" },
  { to: "/buy-sell-swap", label: "Sell or swap" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const { count, addSignal } = useCart();
  const wishlist = useWishlist();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bump, setBump] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!addSignal) return;
    setBump(true);
    const t = window.setTimeout(() => setBump(false), 450);
    return () => window.clearTimeout(t);
  }, [addSignal]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !isTyping(e.target))) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300",
          scrolled || open
            ? "border-b border-border bg-background/85 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:h-16 sm:gap-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Newton's Hub home">
            <img src={mark} alt="" width={36} height={36} className="size-8 sm:size-9" />
            <span className="font-display text-[17px] font-bold tracking-tight sm:text-lg">
              Newton&apos;s <span className="text-primary">Hub</span>
            </span>
          </Link>

          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="relative rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground", "aria-current": "page" }}
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    <span
                      className={cn(
                        "absolute inset-x-3.5 -bottom-0.5 h-0.5 origin-left rounded-full bg-primary transition-transform duration-300",
                        isActive ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </>
                )}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <IconButton label="Search products" onClick={() => setSearchOpen(true)}>
              <Search className="size-5" />
            </IconButton>
            <IconLink
              to="/account"
              hash="wishlist"
              label={`Wishlist, ${wishlist.count} saved`}
              className="hidden sm:flex"
            >
              <Heart className="size-5" />
              <Badge value={wishlist.count} tone="magenta" />
            </IconLink>
            <IconLink to="/cart" label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
              <ShoppingBag className="size-5" />
              <Badge value={count} bump={bump} />
            </IconLink>
            <IconLink
              to={user ? "/account" : "/auth"}
              label={user ? "My account" : "Sign in"}
              className="hidden sm:flex"
            >
              <User className="size-5" />
            </IconLink>
            <IconButton
              label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden"
              expanded={open}
            >
              <span className="relative size-5">
                <Menu
                  className={cn(
                    "absolute inset-0 size-5 transition-all duration-300",
                    open ? "rotate-90 opacity-0" : "opacity-100",
                  )}
                />
                <X
                  className={cn(
                    "absolute inset-0 size-5 transition-all duration-300",
                    open ? "opacity-100" : "-rotate-90 opacity-0",
                  )}
                />
              </span>
            </IconButton>
          </div>
        </div>
      </header>

      {/* Mobile menu: slides down below the header, closes on navigation. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 top-14 z-30 bg-background/95 backdrop-blur-xl transition-[opacity,visibility] duration-300 sm:top-16 lg:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
        aria-hidden={!open}
      >
        <nav aria-label="Mobile" className="mx-auto flex max-w-md flex-col gap-1 px-4 pt-4">
          {NAV.map((item, i) => (
            <Link
              key={item.to}
              to={item.to}
              tabIndex={open ? 0 : -1}
              style={{ transitionDelay: open ? `${60 + i * 40}ms` : "0ms" }}
              className={cn(
                "rounded-xl px-4 py-3.5 font-display text-xl font-semibold transition-all duration-300",
                open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
              )}
              activeProps={{ className: "bg-secondary text-primary" }}
            >
              {item.label}
            </Link>
          ))}
          <div className="my-3 h-px bg-border" />
          <Link
            to={user ? "/account" : "/auth"}
            tabIndex={open ? 0 : -1}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium"
          >
            <User className="size-5 text-muted-foreground" />
            {user ? "My account" : "Sign in or create account"}
          </Link>
          <Link
            to="/account"
            hash="wishlist"
            tabIndex={open ? 0 : -1}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium"
          >
            <Heart className="size-5 text-muted-foreground" />
            Wishlist{" "}
            {wishlist.count > 0 && (
              <span className="text-muted-foreground">({wishlist.count})</span>
            )}
          </Link>
        </nav>
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function Badge({
  value,
  bump,
  tone = "gold",
}: {
  value: number;
  bump?: boolean;
  tone?: "gold" | "magenta";
}) {
  if (value <= 0) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
        tone === "gold" ? "bg-primary text-primary-foreground" : "bg-hub-magenta text-white",
        bump && "animate-bump",
      )}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

const iconClass =
  "relative flex size-11 items-center justify-center rounded-full text-foreground/85 transition-colors hover:bg-secondary hover:text-foreground";

function IconButton({
  label,
  onClick,
  children,
  className,
  expanded,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      onClick={onClick}
      className={cn(iconClass, className)}
    >
      {children}
    </button>
  );
}

function IconLink({
  to,
  hash,
  label,
  children,
  className,
}: {
  to: "/cart" | "/account" | "/auth";
  hash?: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      {...(hash ? { hash } : {})}
      aria-label={label}
      className={cn(iconClass, className)}
    >
      {children}
    </Link>
  );
}

function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const fetchProducts = useServerFn(listProducts);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => fetchProducts({ data: {} }),
    enabled: open,
    staleTime: 60_000,
  });

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return ((data ?? []) as unknown as CatalogProduct[])
      .filter((p) =>
        `${p.name} ${p.brand ?? ""} ${p.subcategory ?? ""}`.toLowerCase().includes(term),
      )
      .slice(0, 6);
  }, [data, q]);

  function go(e?: React.FormEvent) {
    e?.preventDefault();
    onOpenChange(false);
    void navigate({ to: "/shop", search: q.trim() ? { q: q.trim() } : {} });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setQ("");
      }}
    >
      <DialogContent
        className="top-[12%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 sm:top-[15%]"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Search Newton&apos;s Hub</DialogTitle>
        <DialogDescription className="sr-only">
          Search phones, accessories and gadgets.
        </DialogDescription>
        <form onSubmit={go} className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search earbuds, chargers, iPhone 13…"
            aria-label="Search products"
            className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </form>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {!q.trim() ? (
            <div className="flex flex-wrap gap-2 p-2">
              {["Earbuds", "Chargers", "iPhone", "Samsung", "Power bank", "Cases"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQ(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nothing matches “{q}”. Try a shorter word, or ask Newton&apos;s AI.
            </p>
          ) : (
            <ul>
              {results.map((p) => {
                const r = priceRange(p);
                return (
                  <li key={p.id}>
                    <Link
                      to="/shop/$slug"
                      params={{ slug: p.slug }}
                      onClick={() => onOpenChange(false)}
                      className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-secondary focus-visible:bg-secondary"
                    >
                      <ProductImage
                        image={primaryImage(p)}
                        alt=""
                        className="size-12 shrink-0 rounded-lg"
                        sizes="48px"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.subcategory}</span>
                      </span>
                      <span className="text-sm font-semibold">{r ? formatGHS(r.min) : ""}</span>
                    </Link>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  onClick={() => go()}
                  className="w-full rounded-xl p-3 text-left text-sm font-medium text-primary hover:bg-secondary"
                >
                  See all results for “{q.trim()}”
                </button>
              </li>
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
