import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileTabBar } from "@/components/MobileTabBar";
import { FloatingDock } from "@/components/assistant/NewtonAssistant";
import { WishlistProvider } from "@/lib/wishlist";
import { CartProvider } from "@/lib/cart";
import { Toaster } from "@/components/ui/sonner";
import { BUSINESS } from "@/lib/business";
import { SITE_URL, absoluteUrl } from "@/lib/site";

// Tells Google this is a real local shop (name, phone, towns, Instagram), which helps it show
// up in local searches and Maps panels for "phone shop Tarkwa" and similar.
const LOCAL_BUSINESS_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "MobilePhoneStore",
  name: BUSINESS.name,
  slogan: "We buy. We sell. We swap.",
  url: SITE_URL,
  logo: absoluteUrl("/icons/icon-512.png"),
  image: absoluteUrl("/og-image.jpg"),
  telephone: "+233" + BUSINESS.phone.replace(/^0/, ""),
  email: BUSINESS.email,
  priceRange: "GH₵",
  currenciesAccepted: "GHS",
  paymentAccepted: "Mobile money",
  areaServed: { "@type": "Country", name: "Ghana" },
  address: [
    {
      "@type": "PostalAddress",
      addressLocality: "Tarkwa",
      addressRegion: "Western",
      addressCountry: "GH",
      streetAddress: "UMaT Campus",
    },
    {
      "@type": "PostalAddress",
      addressLocality: "Breman Essiam",
      addressRegion: "Central",
      addressCountry: "GH",
    },
  ],
  sameAs: [BUSINESS.instagramUrl],
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#050e17" },
      { name: "color-scheme", content: "dark" },
      { name: "author", content: "Newton's Hub" },
      { name: "application-name", content: "Newton's Hub" },
      { name: "apple-mobile-web-app-title", content: "Newton's Hub" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "format-detection", content: "telephone=no" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Newton's Hub" },
      { property: "og:locale", content: "en_GH" },
      // Default share preview (WhatsApp, Instagram, X, Facebook); pages may override it.
      { property: "og:image", content: absoluteUrl("/og-image.jpg") },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Newton's Hub — where quality meets affordability" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: absoluteUrl("/og-image.jpg") },
    ],
    scripts: [{ type: "application/ld+json", children: LOCAL_BUSINESS_JSON_LD }],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preload",
        href: "/fonts/sora-latin-var.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/manrope-latin-var.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    let identity: string | null | undefined;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextIdentity = session?.user.id ?? null;
      if (identity !== undefined && identity !== nextIdentity) {
        queryClient.clear();
        void router.invalidate();
      }
      identity = nextIdentity;
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient, router]);

  // Register the service worker (installable app + offline page). Production only, so local
  // development never serves stale files.
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    const register = () => void navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <WishlistProvider>
          <a
            href="#main"
            className="sr-only z-[60] rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
          >
            Skip to content
          </a>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main id="main" className="flex-1">
              {/* Required: nested routes render here. */}
              <Outlet />
            </main>
            <SiteFooter />
            <MobileTabBar />
          </div>
          <FloatingDock />
          <Toaster position="top-center" theme="dark" richColors closeButton />
        </WishlistProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}
