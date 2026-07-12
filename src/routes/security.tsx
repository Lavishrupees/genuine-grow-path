import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { Lock, ShieldCheck, BadgeCheck, KeyRound, Server, FileCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/security")({
  head: () => ({ meta: [{ title: "Security — Genuine Investment" }, { name: "description", content: "SSL encryption, 2FA login, KYC verification and how we protect your account." }] }),
  component: Security,
});

function Security() {
  const { user, update } = useAuth();

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">Security you can verify</h1>
        <p className="mt-3 text-muted-foreground">Genuine Investment is built on layered security — encryption, authentication and human verification.</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Badge icon={Lock} label="256-bit SSL / TLS 1.3" />
        <Badge icon={ShieldCheck} label="Two-factor authentication" />
        <Badge icon={BadgeCheck} label="KYC verification" />
        <Badge icon={Server} label="Segregated custodian accounts" />
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {[
          { icon: Lock, t: "Encryption everywhere", d: "All traffic uses TLS 1.3. Sensitive data at rest is AES-256 encrypted with rotating keys." },
          { icon: KeyRound, t: "Strong authentication", d: "Optional 2FA via authenticator app or SMS. Suspicious sign-ins trigger device review." },
          { icon: FileCheck, t: "Identity verification", d: "KYC checks (ID + selfie) protect against fraud and meet global regulatory standards." },
          { icon: Server, t: "Segregated custody", d: "Client assets are held in segregated accounts at regulated custodians — not on our balance sheet." },
          { icon: ShieldCheck, t: "Continuous monitoring", d: "24/7 anomaly detection, automated alerts and quarterly penetration tests." },
          { icon: BadgeCheck, t: "Insurance coverage", d: "Eligible accounts are protected by SIPC-style coverage up to applicable limits." },
        ].map(b => (
          <Card key={b.t} className="p-6">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-navy-gradient text-gold"><b.icon className="h-5 w-5" /></span>
            <h3 className="mt-4 font-display text-lg font-semibold">{b.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{b.d}</p>
          </Card>
        ))}
      </div>

      {user && (
        <Card className="mt-12 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold">Your account security</h2>
          <p className="mt-1 text-sm text-muted-foreground">Strengthen your account in seconds.</p>
          <div className="mt-6 space-y-4">
            <Row
              title="Two-factor authentication"
              desc="Require a code from your authenticator app on every sign-in."
              checked={user.twoFactor}
              onChange={(v) => { update({ twoFactor: v }); toast.success(v ? "2FA enabled" : "2FA disabled"); }}
            />
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <div className="font-semibold">Identity verification</div>
                <div className="text-sm text-muted-foreground">{user.verified ? "Your identity has been verified." : "Verify to unlock higher limits and withdrawals."}</div>
              </div>
              {user.verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><BadgeCheck className="h-3 w-3" /> Verified</span>
              ) : (
                <Button onClick={() => { update({ verified: true }); toast.success("Verification complete"); }} className="bg-gold-gradient text-gold-foreground">Start verification</Button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Badge({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-sm">
      <Icon className="h-4 w-4 text-gold" /> {label}
    </span>
  );
}

function Row({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4">
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
