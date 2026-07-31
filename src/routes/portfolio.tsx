import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Search, TrendingUp, Wallet, PiggyBank, Percent, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "My Portfolio — Genuine Investment" },
      { name: "description", content: "Track your investments, portfolio value and performance in one premium dashboard." },
      { property: "og:title", content: "My Portfolio — Genuine Investment" },
      { property: "og:description", content: "Track your investments, portfolio value and performance in one premium dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortfolioPage,
});

/* ---- Portfolio data (shaped for a future Supabase fetch) ---- */

export type PortfolioSummary = {
  clientName: string;
  amountInvested: number;
  currentValue: number;
  totalProfit: number;
  roi: number;
  status: "Active" | "Completed" | "Pending";
};

export type InvestmentRow = {
  id: string;
  plan: string;
  amountInvested: number;
  currentValue: number;
  profit: number;
  roi: number;
  startDate: string;
  maturityDate: string;
  status: "Active" | "Completed" | "Pending";
};

const SUMMARY: PortfolioSummary = {
  clientName: "Katrina James",
  amountInvested: 35000,
  currentValue: 647990,
  totalProfit: 622990,
  roi: 1779.97,
  status: "Active",
};

const INVESTMENTS: InvestmentRow[] = [
  { id: "INV-10041", plan: "VIP", amountInvested: 10000, currentValue: 318400, profit: 308400, roi: 3084.0, startDate: "2025-02-14", maturityDate: "2026-08-14", status: "Active" },
  { id: "INV-10042", plan: "Gold", amountInvested: 7500, currentValue: 196250, profit: 188750, roi: 2516.67, startDate: "2025-05-02", maturityDate: "2026-11-02", status: "Active" },
  { id: "INV-10043", plan: "Silver", amountInvested: 4500, currentValue: 88340, profit: 83840, roi: 1863.11, startDate: "2025-08-19", maturityDate: "2026-02-19", status: "Completed" },
  { id: "INV-10044", plan: "Starter", amountInvested: 3000, currentValue: 45000, profit: 42000, roi: 1400.0, startDate: "2026-01-08", maturityDate: "2026-07-08", status: "Pending" },
];

const GROWTH = [
  { month: "Jan", value: 25000 },
  { month: "Feb", value: 48200 },
  { month: "Mar", value: 91400 },
  { month: "Apr", value: 143900 },
  { month: "May", value: 208600 },
  { month: "Jun", value: 287100 },
  { month: "Jul", value: 361500 },
  { month: "Aug", value: 428700 },
  { month: "Sep", value: 495200 },
  { month: "Oct", value: 552800 },
  { month: "Nov", value: 604300 },
  { month: "Dec", value: 647990 },
];

const MONTHLY_PROFIT = GROWTH.map((g, i) => ({
  month: g.month,
  profit: i === 0 ? 0 : g.value - GROWTH[i - 1].value,
}));

const ALLOCATION = INVESTMENTS.map((i) => ({ name: i.plan, value: i.currentValue }));
const SLICE_COLORS = [
  "oklch(0.45 0.11 155)",
  "oklch(0.78 0.14 85)",
  "oklch(0.6 0.09 160)",
  "oklch(0.86 0.09 90)",
];

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const dateFmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

type StatusFilter = "All" | "Active" | "Completed" | "Pending";

function PortfolioPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState<InvestmentRow | null>(null);

  useEffect(() => { if (!loading && !session) navigate({ to: "/auth" }); }, [session, loading, navigate]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INVESTMENTS.filter((r) => {
      if (status !== "All" && r.status !== status) return false;
      if (q && !r.id.toLowerCase().includes(q) && !r.plan.toLowerCase().includes(q)) return false;
      if (from && r.startDate < from) return false;
      if (to && r.startDate > to) return false;
      return true;
    });
  }, [query, status, from, to]);

  if (!session) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Header */}
      <header className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">My Portfolio</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Track your investments, portfolio value, and investment performance.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-secondary/40 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-900 font-display text-sm font-bold text-white">
            {SUMMARY.clientName.split(" ").map((s) => s[0]).join("")}
          </span>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Client name</div>
            <div className="truncate font-display text-lg font-semibold">{SUMMARY.clientName}</div>
          </div>
          <Badge className="ml-auto bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" /> {SUMMARY.status}
          </Badge>
        </div>
      </header>

      {/* Summary cards — Current Value is hero */}
      <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="relative overflow-hidden border-gold/40 bg-emerald-950 p-7 text-white shadow-lg transition-transform duration-300 hover:-translate-y-0.5 sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">
              <Wallet className="h-4 w-4" /> Current value
            </div>
            <div className="mt-3 font-display text-5xl font-bold leading-none sm:text-6xl">{usd(SUMMARY.currentValue)}</div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/75">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
                <TrendingUp className="h-4 w-4 text-gold" /> +{SUMMARY.roi.toFixed(2)}% all-time
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">Profit {usd(SUMMARY.totalProfit)}</span>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <MiniStat label="Amount invested" value={usd(SUMMARY.amountInvested)} icon={PiggyBank} />
          <MiniStat label="Total profit" value={usd(SUMMARY.totalProfit)} icon={TrendingUp} positive />
          <MiniStat label="ROI" value={`${SUMMARY.roi.toFixed(2)}%`} icon={Percent} positive />
          <MiniStat label="Status" value={SUMMARY.status} icon={ShieldCheck} />
        </div>
      </div>

      {/* Analytics */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-display text-xl font-semibold">Portfolio growth</h2>
          <p className="text-sm text-muted-foreground">Value progression over the last 12 months.</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={GROWTH}>
                <defs>
                  <linearGradient id="pf-growth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.45 0.11 155)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="oklch(0.45 0.11 155)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.91 0.012 255)" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="oklch(0.5 0.03 255)" fontSize={11} />
                <YAxis stroke="oklch(0.5 0.03 255)" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v: number) => usd(v)} />
                <Area type="monotone" dataKey="value" stroke="oklch(0.45 0.11 155)" strokeWidth={2.5} fill="url(#pf-growth)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl font-semibold">Investment allocation</h2>
          <p className="text-sm text-muted-foreground">Split by plan.</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ALLOCATION} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="80%" paddingAngle={3}>
                  {ALLOCATION.map((_, i) => <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => usd(v)} contentStyle={{ borderRadius: 8 }} />
                <Legend verticalAlign="bottom" height={24} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 lg:col-span-3">
          <h2 className="font-display text-xl font-semibold">Monthly profit</h2>
          <p className="text-sm text-muted-foreground">Profit generated per month.</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_PROFIT}>
                <CartesianGrid stroke="oklch(0.91 0.012 255)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="oklch(0.5 0.03 255)" fontSize={11} />
                <YAxis stroke="oklch(0.5 0.03 255)" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v: number) => usd(v)} />
                <Bar dataKey="profit" radius={[6, 6, 0, 0]} fill="oklch(0.78 0.14 85)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="mt-8 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Investments</h2>
            <p className="text-sm text-muted-foreground">All positions across your plans.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Investment ID or plan"
              className="pl-9"
              aria-label="Search investments"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1">
            {(["All", "Active", "Completed", "Pending"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  status === s ? "border-gold bg-gold/10 text-foreground" : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <label className="text-xs text-muted-foreground">
              From
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 h-9 w-[9.5rem]" />
            </label>
            <label className="text-xs text-muted-foreground">
              To
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 h-9 w-[9.5rem]" />
            </label>
            {(from || to || status !== "All" || query) && (
              <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); setStatus("All"); setQuery(""); }}>
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 -mx-6 overflow-x-auto px-6">
          <table className="w-full min-w-[62rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Investment ID</th>
                <th className="py-3 pr-4 font-medium">Plan</th>
                <th className="py-3 pr-4 font-medium">Invested</th>
                <th className="py-3 pr-4 font-medium">Current value</th>
                <th className="py-3 pr-4 font-medium">Profit</th>
                <th className="py-3 pr-4 font-medium">ROI</th>
                <th className="py-3 pr-4 font-medium">Start date</th>
                <th className="py-3 pr-4 font-medium">Maturity date</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-secondary/50">
                  <td className="py-3 pr-4 font-medium">{r.id}</td>
                  <td className="py-3 pr-4">{r.plan}</td>
                  <td className="py-3 pr-4">{usd(r.amountInvested)}</td>
                  <td className="py-3 pr-4 font-semibold">{usd(r.currentValue)}</td>
                  <td className="py-3 pr-4 text-emerald-600 dark:text-emerald-400">+{usd(r.profit)}</td>
                  <td className="py-3 pr-4">{r.roi.toFixed(2)}%</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{dateFmt(r.startDate)}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{dateFmt(r.maturityDate)}</td>
                  <td className="py-3 pr-4"><StatusBadge status={r.status} /></td>
                  <td className="py-3">
                    <Button variant="outline" size="sm" onClick={() => setDetail(r)}>View details</Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={10} className="py-8 text-center text-muted-foreground">No investments match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.id} — {detail?.plan} plan</DialogTitle>
            <DialogDescription>Investment details for {SUMMARY.clientName}.</DialogDescription>
          </DialogHeader>
          {detail && (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Detail label="Amount invested" value={usd(detail.amountInvested)} />
              <Detail label="Current value" value={usd(detail.currentValue)} />
              <Detail label="Profit" value={`+${usd(detail.profit)}`} />
              <Detail label="ROI" value={`${detail.roi.toFixed(2)}%`} />
              <Detail label="Start date" value={dateFmt(detail.startDate)} />
              <Detail label="Maturity date" value={dateFmt(detail.maturityDate)} />
              <Detail label="Status" value={detail.status} />
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-lg font-semibold">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: InvestmentRow["status"] }) {
  if (status === "Active") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Active</Badge>;
  if (status === "Completed") return <Badge variant="secondary">Completed</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

function MiniStat({ label, value, icon: Icon, positive }: {
  label: string; value: string; positive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className={`mt-1 truncate font-display text-2xl font-bold ${positive ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{value}</div>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary text-foreground"><Icon className="h-4 w-4" /></span>
      </div>
    </Card>
  );
}
