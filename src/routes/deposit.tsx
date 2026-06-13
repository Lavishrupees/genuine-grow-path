import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, CreditCard, Bitcoin, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/deposit")({
  head: () => ({ meta: [{ title: "Deposit — Genuine Investment" }, { name: "description", content: "Fund your account via bank transfer, card or crypto wallet." }] }),
  component: Deposit,
});

function Deposit() {
  const { user, update } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState(500);

  useEffect(() => { if (!user) navigate({ to: "/auth" }); }, [user, navigate]);
  if (!user) return null;

  const confirm = (method: string) => {
    if (amount < 50) { toast.error("Minimum deposit is $50"); return; }
    if (amount > 1_000_000) { toast.error("Amount too large"); return; }
    update({ balance: user.balance + amount, invested: user.invested + amount });
    toast.success(`Demo deposit of $${amount.toLocaleString()} via ${method} confirmed`);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-4xl font-bold">Deposit funds</h1>
      <p className="mt-2 text-muted-foreground">Choose your preferred method. All deposits in this demo are simulated.</p>

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bank"><Landmark className="mr-2 h-4 w-4" />Bank</TabsTrigger>
            <TabsTrigger value="card"><CreditCard className="mr-2 h-4 w-4" />Card</TabsTrigger>
            <TabsTrigger value="crypto"><Bitcoin className="mr-2 h-4 w-4" />Crypto</TabsTrigger>
          </TabsList>

          <TabsContent value="bank" className="mt-6 space-y-4">
            <Detail label="Bank" value="Genuine Trust & Co." />
            <Detail label="Account" value="GI-839 220 4471" copy />
            <Detail label="Routing / SWIFT" value="GENUUS33" copy />
            <Detail label="Reference" value={`GI-${user.id.slice(0,8).toUpperCase()}`} copy />
            <Button onClick={() => confirm("bank transfer")} className="bg-navy-gradient text-primary-foreground">I've sent the transfer</Button>
          </TabsContent>

          <TabsContent value="card" className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label>Card number</Label><Input placeholder="4242 4242 4242 4242" maxLength={19} /></div>
              <div className="space-y-2"><Label>Expiry</Label><Input placeholder="MM / YY" maxLength={7} /></div>
              <div className="space-y-2"><Label>CVC</Label><Input placeholder="123" maxLength={4} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Cardholder name</Label><Input placeholder={user.name} /></div>
            </div>
            <Button onClick={() => confirm("card")} className="bg-gold-gradient text-gold-foreground">Pay ${amount.toLocaleString()}</Button>
          </TabsContent>

          <TabsContent value="crypto" className="mt-6 space-y-4">
            <Detail label="Network" value="Bitcoin (BTC)" />
            <Detail label="Wallet address" value="bc1qgenuinedemoaddress0xabc1234567890def" copy />
            <Detail label="Memo / tag" value={user.id.slice(0,8).toUpperCase()} copy />
            <p className="text-xs text-muted-foreground">Send only BTC to this address. Other networks (ETH, USDT, USDC) available on request from your dashboard.</p>
            <Button onClick={() => confirm("crypto wallet")} className="bg-navy-gradient text-primary-foreground">I've sent the crypto</Button>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
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
