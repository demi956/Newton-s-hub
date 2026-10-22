import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

// Supabase's password-recovery email links here; the client picks up the recovery session
// from the URL, and the customer chooses a new password.
export const Route = createFileRoute("/auth_/reset")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Choose a new password — Newton's Hub" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    void supabase.auth.getSession().then(({ data: s }) => setReady((r) => r ?? !!s.session));
    const t = window.setTimeout(() => setReady((r) => r ?? false), 4000);
    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(t);
    };
  }, []);

  const ok = password.length >= 6 && password === confirm;

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold">Choose a new password</h1>
        {ready === false ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              This reset link has expired or was already used. Request a new one from the sign-in
              page.
            </p>
            <Button asChild className="mt-6 rounded-full">
              <Link to="/auth" search={{ redirect: "/account" }}>
                Back to sign in
              </Link>
            </Button>
          </>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!ok || busy) return;
              setBusy(true);
              const { error } = await supabase.auth.updateUser({ password });
              setBusy(false);
              if (error) return void toast.error(error.message);
              toast.success("Password updated. You're signed in.");
              void navigate({ to: "/account", replace: true });
            }}
          >
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                className="mt-1.5 h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                className="mt-1.5 h-11"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {confirm && password !== confirm && (
                <p className="mt-1 text-xs text-destructive">Passwords don&apos;t match.</p>
              )}
            </div>
            <Button
              type="submit"
              className="h-12 w-full rounded-full"
              disabled={!ok || busy || ready === null}
            >
              {ready === null ? "Checking link…" : busy ? "Saving…" : "Save new password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
