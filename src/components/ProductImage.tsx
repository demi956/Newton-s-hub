import { useEffect, useRef, useState } from "react";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLACEHOLDER_IMAGE, type ResolvedImage } from "@/lib/product-media";

type Props = {
  image: ResolvedImage;
  alt: string;
  /** Product name, shown on the branded tile when no photo exists yet. */
  name?: string;
  sizes?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  /** Show the "Photo coming soon" caption on the branded tile (default true). */
  caption?: boolean;
};

/**
 * Product photo with a colour placeholder, fade-in, responsive sources and a broken-link
 * fallback. Products without a supplied photo get an honest branded tile, never a stock image.
 */
export function ProductImage({
  image,
  alt,
  name,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw",
  className,
  imgClassName,
  priority = false,
  caption = true,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Server-rendered images can finish loading before React hydrates, in which case onLoad
  // never fires. Check the element directly once mounted.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete) {
      if (img.naturalWidth > 0) setLoaded(true);
      else if (img.currentSrc) setBroken(true);
    }
  }, [image.src]);
  const showTile = image.isPlaceholder || broken;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ backgroundColor: showTile ? undefined : (image.color ?? "#102030") }}
    >
      {showTile ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_50%_35%,#16304a,#0b1824_70%)] p-4 text-center">
          <span className="relative flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
            <Smartphone className="size-8 text-primary" strokeWidth={1.5} />
          </span>
          {name && (
            <span className="line-clamp-2 font-display text-sm font-semibold text-foreground/90">
              {name}
            </span>
          )}
          {caption && <span className="text-[11px] text-muted-foreground">Photo coming soon</span>}
        </div>
      ) : (
        <img
          ref={imgRef}
          src={image.src}
          srcSet={image.srcSet}
          sizes={image.srcSet ? sizes : undefined}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            if (e.currentTarget.src.endsWith(PLACEHOLDER_IMAGE)) return;
            setBroken(true);
          }}
          className={cn(
            "size-full object-cover transition-[opacity,transform] duration-500",
            loaded ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
        />
      )}
      {!showTile && image.isReference && caption && (
        <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white/85 backdrop-blur-sm">
          Reference photo
        </span>
      )}
    </div>
  );
}
