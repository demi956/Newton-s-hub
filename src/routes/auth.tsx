import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import mark from "@/assets/brand-mark.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { loginHref, safeReturnTo } from "@/lib/auth-redirect";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: safeReturnTo(search["redirect"]),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Newton's Hub" },
      {
        name: "description",
        content:
          "Sign in to your Newton's Hub account to check out, track orders, swaps and data requests.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

/** Google sign-in runs through Lovable's broker on Lovable hosting, or Supabase OAuth when enabled. */
function googleMode(): "lovable" | "supabase" | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (/\.lovable\.(app|dev)$|\.lovableproject\.com$/.test(host)) return "lovable";
  if (import.meta.env["VITE_ENABLE_GOOGLE_AUTH"] === "true") return "supabase";
  return null;
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect: returnTo } = Route.useSearch();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [google, setGoogle] = useState<ReturnType<typeof googleMode>>(null);

  useEffect(() => setGoogle(googleMode()), []);
  useEffect(() => {
    if (user) void navigate({ href: returnTo, replace: true });
  }, [user, navigate, returnTo]);

  const emailOk = /^\S+@\S+\.\S+$/.test(email);
  const passwordOk = password.length >= 6;
  const canSubmit =
    emailOk &&
    (mode === "forgot" || passwordOk) &&
    (mode !== "signup" || firstName.trim().length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + loginHref(returnTo),
            data: { first_name: firstName.trim() },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success(`Welcome to Newton's Hub, ${firstName.trim()}!`);
        } else {
          setNotice(
            `We've sent a confirmation link to ${email}. Open it to activate your account, then sign in.`,
          );
          setMode("signin");
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset`,
        });
        if (error) throw error;
        setNotice(`If an account exists for ${email}, a password reset link is on its way.`);
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void navigate({ href: returnTo, replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(
        /invalid login/i.test(msg)
          ? "That email and password don't match. Try again or reset your password."
          : /not confirmed/i.test(msg)
            ? "Please confirm your email first — check your inbox for the link."
            : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const redirectTo = window.location.origin + loginHref(returnTo);
    if (google === "lovable") {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirectTo });
      if (result.error) return void toast.error("Google sign-in didn't work. Please try again.");
      if (result.redirected) return;
      void navigate({ href: returnTo, replace: true });
    } else if (google === "supabase") {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) toast.error("Google sign-in didn't work. Please try again.");
    }
  }

  const title =
    mode === "signin"
      ? "Welcome back"
      : mode === "signup"
        ? "Create your account"
        : "Reset your password";
  const subtitle =
    mode === "signin"
      ? "Sign in to check out, track orders and swaps."
      : mode === "signup"
        ? "Save your wishlist, track orders and submit swaps."
        : "We'll email you a link to choose a new password.";

  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md items-start px-4 py-10 sm:items-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-64 max-w-sm rounded-full bg-[conic-gradient(from_200deg,#2e9bf033,#8b5cf633,#e83f9a26,#f6c21c26,#2e9bf033)] blur-3xl"
      />
      <div className="relative w-full rounded-3xl border border-border bg-card/95 p-6 backdrop-blur sm:p-8">
        <img src={mark} alt="" width={56} height={56} className="mx-auto size-14" />
        <h1
          key={title}
          className="mt-4 text-center font-display text-2xl font-bold animate-in fade-in slide-in-from-bottom-1"
        >
          {title}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">{subtitle}</p>

        {notice && (
          <p
            role="status"
            className="mt-5 flex gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-sm animate-in fade-in"
          >
            <MailCheck className="mt-0.5 size-4 shrink-0 text-success" /> {notice}
          </p>
        )}

        <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300",
              mode === "signup" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
            aria-hidden={mode !== "signup"}
          >
            <div className="overflow-hidden">
              <Label htmlFor="first">First name</Label>
              <Input
                id="first"
                className="mt-1.5 h-11"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                tabIndex={mode === "signup" ? 0 : -1}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              className="mt-1.5 h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {mode !== "forgot" && (
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="h-11 pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {mode === "signup" && (
                <p
                  className={cn(
                    "mt-1 text-xs",
                    password && !passwordOk ? "text-warning" : "text-muted-foreground",
                  )}
                >
                  At least 6 characters.
                </p>
              )}
            </div>
          )}
          <Button
            type="submit"
            className="h-12 w-full rounded-full text-[15px] font-semibold"
            disabled={busy || !canSubmit}
          >
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </Button>
        </form>

        {google && mode !== "forgot" && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or{" "}
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="h-12 w-full rounded-full" onClick={handleGoogle}>
              Continue with Google
            </Button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>
              New to Newton&apos;s Hub?{" "}
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => setMode("signup")}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              {mode === "signup" ? "Already have an account? " : "Remembered it? "}
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => setMode("signin")}
              >
                Sign in
              </button>
            </>
          )}
        </p>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/shop" className="hover:text-foreground">
            Keep browsing without an account
          </Link>
        </p>
      </div>
    </div>
  );
}
