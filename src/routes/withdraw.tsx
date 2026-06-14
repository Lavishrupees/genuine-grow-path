import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowUpFromLine } from "lucide-react";

export const Route = createFileRoute("/withdraw")({
  head: () => ({ meta: [{ title: "Withdraw — Genuine Investment" }, { name: "description", content: "Request a withdrawal from your Genuine Investment account." }] }),
  component: Withdraw,
});

function Withdraw() {
  const { user, session, addTx, loading } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("bank");
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && !session) navigate({ to: "/auth" }); }, [session, loading, navigate]);
  if (!user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (amount > user.balance) { toast.error("Insufficient balance"); return; }
    if (!destination.trim()) { toast.error("Enter your payout destination"); return; }
    setSubmitting(true);
    try {
      await addTx({ type: "withdraw", method, amount, status: "pending", reference: destination.trim().slice(0, 200) });
      toast.success(`Withdrawal of $${amount.toLocaleString()} submitted — pending admin review.`);
      setAmount(0); setDestination("");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-navy-gradient text-gold"><ArrowUpFromLine className="h-5 w-5" /></span>
        <div>
          <h1 className="font-display text-3xl font-bold">Withdraw funds</h1>
          <p className="text-sm text-muted-foreground">Available balance: <span className="font-semibold text-foreground">${user.balance.toLocaleString()}</span></p>
        </div>
      </div>

      <Card className="mt-8 p-6 sm:p-8">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input id="amount" type="number" min={1} max={user.balance} value={amount || ""} onChange={e => setAmount(Number(e.target.value) || 0)} required />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank transfer (1-3 days)</SelectItem>
                  <SelectItem value="crypto">Crypto wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{method === "bank" ? "Bank account / IBAN" : "Wallet address"}</Label>
            <Input value={destination} onChange={e => setDestination(e.target.value)} required maxLength={200} placeholder={method === "bank" ? "Bank name, account number" : "bc1q…"} />
          </div>

          <div className="space-y-2"><Label>Note (optional)</Label><Textarea maxLength={500} placeholder="Anything we should know?" /></div>

          <div className="rounded-md bg-secondary/60 p-3 text-xs text-muted-foreground">
            Withdrawals are reviewed for security and typically processed within 24 business hours.
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-gold-gradient text-gold-foreground">Submit withdrawal request</Button>
        </form>
      </Card>

      <Card className="mt-8 p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold">Withdrawal history</h2>
        {user.history.filter(h => h.type === "withdraw").length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No withdrawals yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {user.history.filter(h => h.type === "withdraw").map(h => (
              <li key={h.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                <div className="min-w-0">
                  <div className="font-semibold">${h.amount.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">· {h.method}</span></div>
                  <div className="text-xs text-muted-foreground">{new Date(h.date).toLocaleString()}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold capitalize ${h.status === "completed" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : h.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>{h.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
