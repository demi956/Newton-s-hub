import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartLine = {
  variantId: string;
  productSlug: string;
  name: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string | null | undefined;
  /** Highest quantity the shop can currently fulfil for this line (stock or 20). */
  maxQuantity?: number | undefined;
};

type CartContextValue = {
  lines: CartLine[];
  /** Returns the quantity actually in the cart for this line after adding. */
  add: (line: CartLine) => number;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  /** Increments on every successful add, so the header can animate. */
  addSignal: number;
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "newtons-hub-cart-v1";
const HARD_MAX = 20;

function clampQty(quantity: number, max?: number) {
  return Math.max(0, Math.min(Math.floor(quantity), max ?? HARD_MAX, HARD_MAX));
}

function isLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const l = value as Record<string, unknown>;
  return (
    typeof l["variantId"] === "string" &&
    typeof l["name"] === "string" &&
    typeof l["productSlug"] === "string" &&
    typeof l["unitPrice"] === "number" &&
    typeof l["quantity"] === "number"
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [addSignal, setAddSignal] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(parsed)) setLines(parsed.filter(isLine));
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: CartLine[]) => {
    setLines(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<CartContextValue>(() => {
    return {
      lines,
      hydrated,
      addSignal,
      add: (line) => {
        const existing = lines.find((l) => l.variantId === line.variantId);
        const max = line.maxQuantity ?? existing?.maxQuantity;
        const quantity = clampQty((existing?.quantity ?? 0) + line.quantity, max);
        if (quantity === 0) return 0;
        persist(
          existing
            ? lines.map((l) =>
                l.variantId === line.variantId ? { ...l, ...line, quantity, maxQuantity: max } : l,
              )
            : [...lines, { ...line, quantity }],
        );
        setAddSignal((n) => n + 1);
        return quantity;
      },
      setQuantity: (variantId, quantity) => {
        const line = lines.find((l) => l.variantId === variantId);
        const next = clampQty(quantity, line?.maxQuantity);
        persist(
          next <= 0
            ? lines.filter((l) => l.variantId !== variantId)
            : lines.map((l) => (l.variantId === variantId ? { ...l, quantity: next } : l)),
        );
      },
      remove: (variantId) => persist(lines.filter((l) => l.variantId !== variantId)),
      clear: () => persist([]),
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    };
  }, [lines, persist, addSignal, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
