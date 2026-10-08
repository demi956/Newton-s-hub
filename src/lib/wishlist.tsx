import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { listWishlist, setWishlist } from "./wishlist.functions";

const STORAGE_KEY = "newtons-hub-wishlist-v1";

type WishlistValue = {
  ids: Set<string>;
  has: (productId: string) => boolean;
  toggle: (productId: string, name?: string) => void;
  count: number;
  synced: boolean;
};

const WishlistContext = createContext<WishlistValue | null>(null);

function readLocal(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeLocal(ids: Iterable<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable: the in-memory list still works for this visit */
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const fetchList = useServerFn(listWishlist);
  const save = useServerFn(setWishlist);
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [synced, setSynced] = useState(false);
  const syncedFor = useRef<string | null>(null);

  // Guests: device-local list.
  useEffect(() => {
    if (loading || user) return;
    syncedFor.current = null;
    setIds(new Set(readLocal()));
    setSynced(true);
  }, [loading, user]);

  // Signed in: merge anything saved on this device into the account, then use the account list.
  useEffect(() => {
    if (loading || !user || syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    let cancelled = false;
    (async () => {
      try {
        const local = readLocal();
        const remote = await fetchList();
        const missing = local.filter((id) => !remote.includes(id));
        if (missing.length) await save({ data: { add: missing, remove: [] } });
        writeLocal([]);
        if (!cancelled) setIds(new Set([...remote, ...missing]));
      } catch {
        if (!cancelled) setIds(new Set(readLocal()));
      } finally {
        if (!cancelled) setSynced(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, fetchList, save]);

  const toggle = useCallback(
    (productId: string, name?: string) => {
      const adding = !ids.has(productId);
      const next = new Set(ids);
      if (adding) next.add(productId);
      else next.delete(productId);
      setIds(next);
      if (!user) {
        writeLocal(next);
      } else {
        save({ data: adding ? { add: [productId], remove: [] } : { add: [], remove: [productId] } }).catch(
          () => {
            // Roll back so the heart reflects what is actually saved.
            setIds((current) => {
              const reverted = new Set(current);
              if (adding) reverted.delete(productId);
              else reverted.add(productId);
              return reverted;
            });
            toast.error("Couldn't update your wishlist. Please try again.");
          },
        );
      }
      toast.success(adding ? `Saved${name ? ` ${name}` : ""} to your wishlist` : "Removed from wishlist");
    },
    [ids, user, save],
  );

  const value = useMemo<WishlistValue>(
    () => ({ ids, has: (id) => ids.has(id), toggle, count: ids.size, synced }),
    [ids, toggle, synced],
  );
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
