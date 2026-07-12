import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, Bitcoin, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/deposit")({
  head: () => ({ meta: [{ title: "Deposit — Genuine Investment" }, { name: "description", content: "Fund your account via bank transfer or crypto wallet." }] }),
  component: Deposit,
});

function Deposit() {
  const { user, session, addTx, loading } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState(500);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && !session) navigate({ to: "/auth" }); }, [session, loading, navigate]);
  if (!user) return null;

  const submit = async (method: string, reference?: string) => {
    if (amount < 50) { toast.error("Minimum deposit is $50"); return; }
    if (amount > 1_000_000) { toast.error("Amount too large"); return; }
    setSubmitting(true);
    try {
      await addTx({ type: "deposit", method, amount, status: "pending", reference });
      toast.success(`Deposit request of $${amount.toLocaleString()} submitted — pending admin confirmation.`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-4xl font-bold">Deposit funds</h1>
      <p className="mt-2 text-muted-foreground">Choose your preferred method. Once we confirm receipt of funds, your balance is credited automatically.</p>

      <Card className="mt-8 p-6 sm:p-8">
        <div className="mb-6 grid gap-3 sm:max-w-sm">
          <Label htmlFor="amt">Amount (USD)</Label>
          <Input id="amt" type="number" min={50} max={1000000} value={amount} onChange={e => setAmount(Number(e.target.value) || 0)} />
          <div className="flex flex-wrap gap-2">
            {[100, 500, 1000, 5000].map(v => (
              <Button key={v} type="button" variant="outline" size="sm" onClick={() => setAmount(v)}>${v.toLocaleString()}</Button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="bank">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bank"><Landmark className="mr-2 h-4 w-4" />Bank transfer</TabsTrigger>
            <TabsTrigger value="crypto"><Bitcoin className="mr-2 h-4 w-4" />Crypto</TabsTrigger>
          </TabsList>

          <TabsContent value="bank" className="mt-6 space-y-4">
            <Detail label="Bank" value="Genuine Trust & Co." />
            <Detail label="Account" value="GI-839 220 4471" copy />
            <Detail label="Routing / SWIFT" value="GENUUS33" copy />
            <Detail label="Reference (include this)" value={`GI-${user.id.slice(0,8).toUpperCase()}`} copy />
            <Button disabled={submitting} onClick={() => submit("bank transfer", `GI-${user.id.slice(0,8).toUpperCase()}`)} className="bg-navy-gradient text-primary-foreground">I've sent the transfer</Button>
          </TabsContent>

          <TabsContent value="crypto" className="mt-6 space-y-4">
            <Tabs defaultValue="btc">
              <TabsList><TabsTrigger value="btc">BTC</TabsTrigger><TabsTrigger value="eth">ETH</TabsTrigger><TabsTrigger value="usdt">USDT (TRC-20)</TabsTrigger></TabsList>
              <TabsContent value="btc" className="mt-4 space-y-3">
                <Detail label="Network" value="Bitcoin (BTC)" />
                <Detail label="Wallet address" value="bc1qjdypmfjt5plsua4kdzx4f0ggu22uusn7ymz7w3" copy />
              </TabsContent>
              <TabsContent value="eth" className="mt-4 space-y-3">
                <Detail label="Network" value="Ethereum (ERC-20)" />
                <Detail label="Wallet address" value="0x8f3A9c2B4e5D6f7A8b9C0D1E2F3a4B5c6D7e8F90" copy />
              </TabsContent>
              <TabsContent value="usdt" className="mt-4 space-y-3">
                <Detail label="Network" value="Tether USDT (TRC-20)" />
                <Detail label="Wallet address" value="TQn9Y2khEsLJW1ChVWFMSMeRDow5oREqjK" copy />
              </TabsContent>
            </Tabs>
            <Detail label="Memo / tag" value={user.id.slice(0,8).toUpperCase()} copy />
            <p className="text-xs text-muted-foreground">After sending, click below. Funds are credited once the network confirms and an admin reviews the transaction.</p>
            <Button disabled={submitting} onClick={() => submit("crypto wallet", user.id.slice(0,8).toUpperCase())} className="bg-navy-gradient text-primary-foreground">I've sent the crypto</Button>
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="mt-8 p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold">Recent deposit requests</h2>
        {user.history.filter(h => h.type === "deposit").length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No deposits yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {user.history.filter(h => h.type === "deposit").slice(0, 10).map(h => (
              <li key={h.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                <div className="min-w-0">
                  <div className="font-semibold">${h.amount.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">· {h.method}</span></div>
                  <div className="text-xs text-muted-foreground">{new Date(h.date).toLocaleString()}</div>
                </div>
                <StatusPill status={h.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls = status === "completed" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
    : status === "rejected" ? "bg-destructive/15 text-destructive"
    : "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold capitalize ${cls}`}>{status}</span>;
}

function Detail({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3">
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-sm">{value}</div>
      </div>
      {copy && (
        <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button>
      )}
    </div>
  );
}
