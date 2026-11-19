import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { whatsappShareLink } from "@/lib/business";
import { cn } from "@/lib/utils";

/** Native share sheet on phones (WhatsApp, Instagram, SMS…); copies the link elsewhere. */
export function ShareButton({
  title,
  text,
  url,
  className,
}: {
  title: string;
  text: string;
  url: string;
  className?: string;
}) {
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        /* shopper closed the share sheet */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied — paste it anywhere to share.");
    } catch {
      window.open(whatsappShareLink(`${text} ${url}`), "_blank", "noopener");
    }
  }
  return (
    <button
      type="button"
      onClick={share}
      aria-label="Share this product"
      className={cn(
        "flex size-11 items-center justify-center rounded-full bg-background/70 backdrop-blur transition-transform active:scale-90",
        className,
      )}
    >
      <Share2 className="size-5" />
    </button>
  );
}
