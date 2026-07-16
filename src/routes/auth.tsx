import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Genuine Investment" }, { name: "description", content: "Sign in or create your Genuine Investment account." }] }),
  component: AuthPage,
});

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(120),
});

function AuthPage() {
  const { signIn, signUp, session } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">("signin");
  const [loading, setLoading] = useState(false);

  const showAuthError = (err: unknown) => {
    const message = err instanceof Error ? err.message : "Unable to complete this request.";
    toast.error(message);
  };

  useEffect(() => { if (session) navigate({ to: "/dashboard" }); }, [session, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await signIn(String(fd.get("email")), String(fd.get("password")));
      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } catch (err) { showAuthError(err); }
    finally { setLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({ name: fd.get("name"), email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    try {
      await signUp(parsed.data.name, parsed.data.email, parsed.data.password);
      toast.success("Account created — signing you in…");
      // Try to sign in immediately (auto-confirm is enabled)
      try { await signIn(parsed.data.email, parsed.data.password); navigate({ to: "/dashboard" }); }
      catch (signInErr) { showAuthError(signInErr); setTab("signin"); }
    } catch (err) { showAuthError(err); }
    finally { setLoading(false); }
  };

  const handleForgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined,
    });
    if (error) toast.error(error.message);
    else toast.success("If an account exists, a reset link has been sent.");
    setTab("signin");
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
      <div className="hidden lg:block">
        <h1 className="font-display text-4xl font-bold leading-tight">Invest with clarity.<br /><span className="text-gold">Together we succeed.</span></h1>
        <p className="mt-4 text-muted-foreground">Real accounts, real database, real security. Your data is encrypted and protected.</p>
        <ul className="mt-8 space-y-3 text-sm">
          {["Bank-grade encryption", "Two-factor authentication", "Identity verification (KYC)", "24/7 live support"].map(f => (
            <li key={f} className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-gold" /> {f}</li>
          ))}
        </ul>
      </div>
      <Card className="p-6 sm:p-8">
        <div className="mb-6 flex justify-center">
          <Logo imgClassName="h-14 w-auto animate-logo-fade-in" priority />
        </div>
        <div className="grid w-full grid-cols-3 rounded-lg bg-muted p-1 text-muted-foreground">
          {(["signin", "signup", "forgot"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all ${tab === value ? "bg-background text-foreground shadow" : "hover:text-foreground"}`}
            >
              {value === "signin" ? "Sign in" : value === "signup" ? "Sign up" : "Forgot"}
            </button>
          ))}
        </div>
          {tab === "signin" && (
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" onClick={() => setTab("forgot")} className="text-xs text-gold hover:underline">Forgot password?</button>
                </div>
                <Input id="password" name="password" type="password" required autoComplete="current-password" />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-navy-gradient text-primary-foreground hover:opacity-95">{loading ? "Signing in…" : "Sign in"}</Button>
            </form>
          )}
          {tab === "signup" && (
            <form onSubmit={handleSignUp} className="mt-6 space-y-4">
              <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" name="name" required maxLength={80} /></div>
              <div className="space-y-2"><Label htmlFor="email2">Email</Label><Input id="email2" name="email" type="email" required maxLength={255} autoComplete="email" /></div>
              <div className="space-y-2"><Label htmlFor="password2">Password</Label><Input id="password2" name="password" type="password" required minLength={8} autoComplete="new-password" /></div>
              <Button type="submit" disabled={loading} className="w-full bg-gold-gradient text-gold-foreground">{loading ? "Creating…" : "Create account"}</Button>
              <p className="text-center text-xs text-muted-foreground">By continuing you agree to our <Link to="/faq" className="underline">terms</Link>.</p>
            </form>
          )}
          {tab === "forgot" && (
            <form onSubmit={handleForgot} className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">Enter your account email and we'll send a secure reset link.</p>
              <div className="space-y-2"><Label htmlFor="femail">Email</Label><Input id="femail" name="email" type="email" required maxLength={255} /></div>
              <Button type="submit" className="w-full bg-navy-gradient text-primary-foreground">Send reset link</Button>
            </form>
          )}
      </Card>
    </div>
  );
}
