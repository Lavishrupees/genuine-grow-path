import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Search, Loader2, Pencil, Eye, Copy } from "lucide-react";

export type ProfileRow = {
  id: string; name: string; email: string; plan: string;
  balance: number; invested: number; total_deposits: number; total_withdrawals: number;
  verified: boolean; two_factor: boolean; created_at: string;
};

export type PortfolioRow = {
  portfolio_id: string; user_id: string; balance: number;
  total_invested: number; total_profit: number; status: string;
  created_at: string; updated_at: string;
};

const usd = (n: number) => `$${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export function UsersPanel({
  users, portfolios, onChanged,
}: { users: ProfileRow[]; portfolios: PortfolioRow[]; onChanged: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q));
  }, [users, query]);

  const selected = users.find(u => u.id === selectedId) ?? null;
  const selectedPf = portfolios.find(p => p.user_id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email or user ID…"
            className="pl-8"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} account{filtered.length === 1 ? "" : "s"}</span>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3">Joined</th><th>Name</th><th>Email</th><th>Plan</th>
              <th>Invested</th><th>Portfolio value</th><th>Profit</th><th>Status</th>
              <th className="pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const pf = portfolios.find(p => p.user_id === u.id);
              const invested = Number(pf?.total_invested ?? u.invested ?? 0);
              const profit = Number(pf?.total_profit ?? 0);
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="font-semibold">{u.name}</td>
                  <td className="text-xs">{u.email}</td>
                  <td>{u.plan}</td>
                  <td className="font-semibold">{usd(invested)}</td>
                  <td className="font-semibold">{usd(invested + profit)}</td>
                  <td className="text-emerald-600 dark:text-emerald-400">{usd(profit)}</td>
                  <td className="text-xs">
                    <span className="rounded-full bg-secondary px-2 py-0.5">{pf?.status ?? "Active"}</span>
                    {u.verified && <span className="ml-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">KYC</span>}
                  </td>
                  <td className="pr-3 text-right">
                    <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => setSelectedId(u.id)}>
                      <Eye className="h-3.5 w-3.5" /> View profile
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-sm text-muted-foreground">No accounts found.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <UserProfileDialog
        user={selected}
        portfolio={selectedPf}
        onClose={() => setSelectedId(null)}
        onSaved={onChanged}
      />
    </div>
  );
}

function UserProfileDialog({
  user, portfolio, onClose, onSaved,
}: {
  user: ProfileRow | null;
  portfolio: PortfolioRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invested, setInvested] = useState("0");
  const [value, setValue] = useState("0");
  const [balance, setBalance] = useState("0");
  const [status, setStatus] = useState("Active");
  const [deposits, setDeposits] = useState("0");
  const [withdrawals, setWithdrawals] = useState("0");
  const [plan, setPlan] = useState("Starter");
  const [verified, setVerified] = useState(false);

  const pfInvested = Number(portfolio?.total_invested ?? 0);
  const pfProfit = Number(portfolio?.total_profit ?? 0);
  const pfValue = pfInvested + pfProfit;
  const pfRoi = pfInvested > 0 ? (pfProfit / pfInvested) * 100 : 0;

  useEffect(() => {
    if (!user) return;
    setEditing(false);
    setInvested(String(pfInvested));
    setValue(String(pfValue));
    setBalance(String(Number(portfolio?.balance ?? user.balance ?? 0)));
    setStatus(portfolio?.status ?? "Active");
    setDeposits(String(Number(user.total_deposits ?? 0)));
    setWithdrawals(String(Number(user.total_withdrawals ?? 0)));
    setPlan(user.plan ?? "Starter");
    setVerified(!!user.verified);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, portfolio?.portfolio_id, portfolio?.updated_at]);


  if (!user) return null;

  const nInvested = Number(invested);
  const nValue = Number(value);
  const nBalance = Number(balance);
  const nDeposits = Number(deposits);
  const nWithdrawals = Number(withdrawals);
  const errors: string[] = [];
  if (!Number.isFinite(nInvested) || nInvested < 0) errors.push("Amount invested must be a number of 0 or more.");
  if (!Number.isFinite(nValue) || nValue < 0) errors.push("Current portfolio value must be a number of 0 or more.");
  if (!Number.isFinite(nBalance) || nBalance < 0) errors.push("Account balance must be a number of 0 or more.");
  if (!Number.isFinite(nDeposits) || nDeposits < 0) errors.push("Total deposits must be a number of 0 or more.");
  if (!Number.isFinite(nWithdrawals) || nWithdrawals < 0) errors.push("Total withdrawals must be a number of 0 or more.");
  if (!status.trim()) errors.push("Status is required.");
  const newProfit = nValue - nInvested;
  const newRoi = nInvested > 0 ? (newProfit / nInvested) * 100 : 0;

  const save = async () => {
    setSaving(true);
    try {
      // Single source of truth: this customer's own portfolio row, keyed by their user ID.
      const { data: pfRows, error: pfErr } = await supabase
        .from("portfolios")
        .update({
          total_invested: nInvested,
          total_profit: newProfit,
          balance: nBalance,
          status: status.trim(),
        })
        .eq("user_id", user.id)
        .select("portfolio_id, user_id");
      if (pfErr) throw new Error(pfErr.message);
      if (!pfRows || pfRows.length === 0) throw new Error("No portfolio record found for this user.");
      if (pfRows.length > 1 || pfRows[0].user_id !== user.id) throw new Error("Refusing to save: portfolio record mismatch.");

      const { error: prErr } = await supabase
        .from("profiles")
        .update({
          invested: nInvested,
          balance: nBalance,
          total_deposits: nDeposits,
          total_withdrawals: nWithdrawals,
          plan,
          verified,
        })
        .eq("id", user.id);
      if (prErr) throw new Error(prErr.message);


      toast.success("Portfolio updated");
      setEditing(false);
      setConfirmOpen(false);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={!!user} onOpenChange={(o) => { if (!o) { setEditing(false); onClose(); } }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{user.name}</DialogTitle>
            <DialogDescription>Account & portfolio details</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" value={user.name} />
            <Field label="Email address" value={user.email} />
            <div className="rounded-lg border border-border p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">User ID</div>
              <div className="mt-1 flex items-center gap-2">
                <code className="truncate font-mono text-xs">{user.id}</code>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => { navigator.clipboard?.writeText(user.id); toast.success("User ID copied"); }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <Field label="Date joined" value={new Date(user.created_at).toLocaleString()} />
            <div className="rounded-lg border border-border p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Account status</div>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge variant="secondary">{portfolio?.status ?? "Active"}</Badge>
                <Badge variant={user.verified ? "default" : "outline"}>{user.verified ? "Verified" : "Unverified"}</Badge>
                {user.two_factor && <Badge variant="outline">2FA</Badge>}
              </div>
            </div>
            <Field label="Plan" value={user.plan} />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Portfolio</h3>
            {!editing && (
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Edit portfolio
              </Button>
            )}
          </div>

          {!editing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Amount invested" value={usd(pfInvested)} />
              <Field label="Current portfolio value" value={usd(pfValue)} />
              <Field label="Total profit" value={usd(pfProfit)} />
              <Field label="Return (ROI)" value={`${pfRoi.toFixed(2)}%`} />
              <Field label="Account balance" value={usd(Number(portfolio?.balance ?? user.balance ?? 0))} />
              <Field label="Total deposits" value={usd(user.total_deposits)} />
              <Field label="Total withdrawals" value={usd(user.total_withdrawals)} />
              <Field label="Portfolio status" value={portfolio?.status ?? "Active"} />
            </div>
          ) : (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => { e.preventDefault(); if (errors.length === 0) setConfirmOpen(true); }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="inv">Amount invested (USD)</Label>
                <Input id="inv" inputMode="decimal" value={invested} onChange={(e) => setInvested(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="val">Current portfolio value (USD)</Label>
                <Input id="val" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bal">Account balance (USD)</Label>
                <Input id="bal" inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="st">Portfolio status</Label>
                <Input id="st" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Active" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dep">Total deposits (USD)</Label>
                <Input id="dep" inputMode="decimal" value={deposits} onChange={(e) => setDeposits(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wd">Total withdrawals (USD)</Label>
                <Input id="wd" inputMode="decimal" value={withdrawals} onChange={(e) => setWithdrawals(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pl">Investment plan</Label>
                <select
                  id="pl"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {["Starter", "Silver", "Gold", "VIP"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input id="vf" type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="h-4 w-4" />
                <Label htmlFor="vf">Verified (KYC)</Label>
              </div>

              <div className="sm:col-span-2 rounded-lg border border-border bg-secondary/40 p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total profit (calculated)</span><span className="font-semibold">{usd(newProfit)}</span></div>
                <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Return / ROI (calculated)</span><span className="font-semibold">{Number.isFinite(newRoi) ? newRoi.toFixed(2) : "0.00"}%</span></div>
              </div>
              {errors.length > 0 && (
                <ul className="sm:col-span-2 list-disc space-y-0.5 pl-5 text-xs text-destructive">
                  {errors.map(er => <li key={er}>{er}</li>)}
                </ul>
              )}
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
                <Button type="submit" disabled={saving || errors.length > 0} className="bg-gold-gradient text-gold-foreground">
                  {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm portfolio changes</AlertDialogTitle>
            <AlertDialogDescription>
              {user.name}'s portfolio will be set to {usd(nInvested)} invested, {usd(nValue)} current value
              ({usd(newProfit)} profit) and a balance of {usd(nBalance)}. This is visible to the client immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); save(); }} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
