import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Genuine Investment" }, { name: "description", content: "Sign in or create your Genuine Investment account." }] }),
  component: AuthPage,
});

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Use at least 6 characters").max(120),
});

function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">("signin");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      await signIn(String(fd.get("email")), String(fd.get("password")));
      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } catch (err) { toast.error((err as Error).message); }
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
      toast.success("Account created");
      navigate({ to: "/dashboard" });
    } catch (err) { toast.error((err as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
      <div className="hidden lg:block">
        <h1 className="font-display text-4xl font-bold leading-tight">Invest with clarity.<br /><span className="text-gold">Together we succeed.</span></h1>
        <p className="mt-4 text-muted-foreground">Join 120,000+ investors using Genuine Investment to grow long-term wealth across stocks, crypto and ETFs.</p>
        <ul className="mt-8 space-y-3 text-sm">
          {["Bank-grade encryption", "Two-factor authentication", "Identity verification (KYC)", "24/7 live support"].map(f => (
            <li key={f} className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-gold" /> {f}</li>
          ))}
        </ul>
      </div>
      <Card className="p-6 sm:p-8">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
            <TabsTrigger value="forgot">Forgot</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
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
              <p className="text-center text-xs text-muted-foreground">Demo platform — accounts are stored locally on this device.</p>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="mt-6 space-y-4">
              <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" name="name" required maxLength={80} /></div>
              <div className="space-y-2"><Label htmlFor="email2">Email</Label><Input id="email2" name="email" type="email" required maxLength={255} autoComplete="email" /></div>
              <div className="space-y-2"><Label htmlFor="password2">Password</Label><Input id="password2" name="password" type="password" required minLength={6} autoComplete="new-password" /></div>
              <p className="rounded-md bg-secondary/60 p-2 text-xs text-muted-foreground">A verification email will be sent after sign up. 2FA can be enabled from the Security page.</p>
              <Button type="submit" disabled={loading} className="w-full bg-gold-gradient text-gold-foreground">{loading ? "Creating…" : "Create account"}</Button>
              <p className="text-center text-xs text-muted-foreground">By continuing you agree to our <Link to="/faq" className="underline">terms</Link>.</p>
            </form>
          </TabsContent>
          <TabsContent value="forgot">
            <form onSubmit={(e) => { e.preventDefault(); toast.success("If an account exists, a reset link has been sent."); setTab("signin"); }} className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">Enter your account email and we'll send a secure reset link.</p>
              <div className="space-y-2"><Label htmlFor="femail">Email</Label><Input id="femail" name="email" type="email" required maxLength={255} /></div>
              <Button type="submit" className="w-full bg-navy-gradient text-primary-foreground">Send reset link</Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
