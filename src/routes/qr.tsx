import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BUSINESS } from "@/lib/business";

const SITE_URL = "https://newton-s-hub.vercel.app";

export const Route = createFileRoute("/qr")({
  head: () => ({
    meta: [
      { title: "Scan to shop — Newton's Hub" },
      {
        name: "description",
        content: "Scan the QR code to open Newton's Hub on your phone, or download it for flyers.",
      },
    ],
  }),
  component: QrPage,
});

function QrPage() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link. Long-press it to copy instead.");
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: BUSINESS.name, text: BUSINESS.tagline, url: SITE_URL });
      } catch {
        /* share sheet dismissed */
      }
    } else {
      void copy();
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 pb-16 pt-10 text-center sm:pt-14">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">
        Scan to <span className="text-primary">shop</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Point your phone camera at the code to open Newton&apos;s Hub.
      </p>

      <div className="mt-8 w-full max-w-[20rem] rounded-3xl bg-white p-4 shadow-[0_0_60px_-15px_rgba(246,194,28,0.45)]">
        <img
          src="/qr/newtons-hub-qr.svg"
          alt={`QR code linking to ${SITE_URL}`}
          width={320}
          height={320}
          className="h-auto w-full"
        />
      </div>

      <button
        type="button"
        onClick={copy}
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 font-mono text-sm transition-colors hover:border-primary/60"
      >
        {SITE_URL.replace("https://", "")}
        {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
      </button>

      <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={share}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          <Share2 className="size-4" /> Share link
        </button>
        <a
          href="/qr/newtons-hub-qr.png"
          download="newtons-hub-qr.png"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-semibold hover:border-primary/60"
        >
          <Download className="size-4" /> Download PNG
        </a>
      </div>
      <a
        href="/qr/newtons-hub-qr.svg"
        download="newtons-hub-qr.svg"
        className="mt-3 text-xs text-muted-foreground hover:text-foreground"
      >
        Download SVG for large prints
      </a>

      <Link to="/shop" className="mt-10 text-sm font-semibold text-primary">
        Browse the shop →
      </Link>
    </div>
  );
}
