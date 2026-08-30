import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/site/Logo";
import { ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Administrator sign in — Genuine Investment" },
      { name: "description", content: "Secure administrator access for the Genuine Investment platform." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const { signIn, signOut, session, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Authorization is decided by the database role, never by the form.
  useEffect(() => {
    if (authLoading || !session || !checking) return;
    if (isAdmin) {
      navigate({ to: "/admin", replace: true });
    } else {
      setError("This account does not have administrator access.");
      setChecking(false);
      void signOut();
    }
  }, [authLoading, session, isAdmin, checking, navigate, signOut]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setBusy(true);
    try {
      await signIn(String(fd.get("email")).trim(), String(fd.get("password")));
      setChecking(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const pending = busy || checking;

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center px-4 py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--secondary))_0%,transparent_70%)]" />
      <Card className="relative w-full max-w-md border-border/70 p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <Logo imgClassName="h-14 w-auto" />
          <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-gold" /> Administrator access
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Restricted area. Authorized personnel only.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input id="admin-email" name="email" type="email" required autoComplete="username" placeholder="admin@company.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <div className="relative">
              <Input
                id="admin-password"
                name="password"
                type={show ? "text" : "password"}
                required
                autoComplete="current-password"
                className="pr-11"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow(v => !v)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full bg-navy-gradient text-primary-foreground hover:opacity-90">
            {pending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{checking ? "Verifying access…" : "Signing in…"}</>) : "Sign in to admin"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Client account?{" "}
          <Link to="/auth" className="font-medium text-foreground underline underline-offset-4">Sign in here</Link>
        </p>
      </Card>
    </div>
  );
}
