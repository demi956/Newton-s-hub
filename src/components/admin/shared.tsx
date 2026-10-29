import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Runs an admin write, toasts the outcome and refreshes the listed queries. */
export function useAdminAction<TArgs>(
  fn: (args: TArgs) => Promise<unknown>,
  invalidate: string[],
  success: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(success);
      for (const key of invalidate) void qc.invalidateQueries({ queryKey: [key] });
    },
    onError: (e: Error) => toast.error(e.message || "Something went wrong."),
  });
}

/** A button that needs a second tap within 4s before it acts — for irreversible actions. */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Tap again to confirm",
  disabled,
  tone = "primary",
  className,
}: {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: string;
  disabled?: boolean;
  tone?: "primary" | "danger" | "neutral";
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition-all active:scale-95 disabled:opacity-40",
        tone === "primary" && "bg-primary text-primary-foreground",
        tone === "danger" &&
          "border border-destructive/50 text-destructive hover:bg-destructive/10",
        tone === "neutral" && "border border-border hover:bg-secondary",
        armed && "ring-2 ring-offset-2 ring-offset-background",
        armed && (tone === "danger" ? "ring-destructive" : "ring-primary"),
        className,
      )}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}

export function Pill({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "gold" | "success" | "muted" | "danger" | "blue";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        tone === "gold" && "bg-primary/15 text-primary",
        tone === "success" && "bg-success/15 text-success",
        tone === "muted" && "bg-white/5 text-muted-foreground",
        tone === "danger" && "bg-destructive/15 text-destructive",
        tone === "blue" && "bg-hub-blue/15 text-hub-blue",
      )}
    >
      {children}
    </span>
  );
}

export function PanelHeader({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{title}</h2>
        {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
      </div>
      {children}
    </div>
  );
}

export function LoadState({
  loading,
  error,
  empty,
  retry,
}: {
  loading: boolean;
  error: boolean;
  empty: boolean;
  retry: () => void;
}) {
  if (loading)
    return (
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton-shimmer h-20 rounded-2xl" />
        ))}
      </div>
    );
  if (error)
    return (
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        Couldn&apos;t load this list.
        <button type="button" onClick={retry} className="font-semibold text-primary">
          Try again
        </button>
      </div>
    );
  if (empty)
    return (
      <p className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nothing here yet.
      </p>
    );
  return null;
}

export function ghPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("233") ? digits : "233" + digits.replace(/^0/, "");
}
