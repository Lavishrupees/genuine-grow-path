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

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Smooth 12-month curve from the client's own starting capital to their current value. */
function buildGrowth(start: number, end: number) {
  const from = start > 0 ? start : end > 0 ? end / 3 : 0;
  return MONTH_LABELS.map((month, i) => {
    const t = i / (MONTH_LABELS.length - 1);
    return { month, value: Math.round(from + (end - from) * Math.pow(t, 1.35)) };
  });
}


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
  const { user, session, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState<InvestmentRow | null>(null);

  useEffect(() => { if (!loading && !session) navigate({ to: "/auth" }); }, [session, loading, navigate]);
  // Always pull the latest portfolio record from the database on open.
  useEffect(() => { if (session) void refresh(); }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every figure below comes from the authenticated client's own RLS-protected rows.
  const investments: InvestmentRow[] = useMemo(() => {
    const own = (user?.investments ?? []).map((i) => ({
      id: i.id,
      plan: i.plan,
      amountInvested: i.amountInvested,
      currentValue: i.currentValue,
      profit: i.profit,
      roi: i.roi,
      startDate: i.startDate,
      maturityDate: i.maturityDate ?? i.startDate,
      status: (["Active", "Completed", "Pending"].includes(i.status) ? i.status : "Active") as InvestmentRow["status"],
    }));
    if (own.length > 0 || !user?.portfolio) return own;
    // Single summary position when the client has no itemised records yet.
    const invested = user.invested;
    const value = user.portfolio.value;
    return invested > 0 || value > 0
      ? [{
          id: (user.portfolioId ?? user.id).slice(0, 8).toUpperCase(),
          plan: user.plan,
          amountInvested: invested,
          currentValue: value,
          profit: user.portfolio.profit,
          roi: user.portfolio.roi,
          startDate: new Date().toISOString().slice(0, 10),
          maturityDate: new Date().toISOString().slice(0, 10),
          status: "Active" as const,
        }]
      : [];
  }, [user]);

  const summary: PortfolioSummary = useMemo(() => ({
    clientName: user?.name ?? "Investor",
    amountInvested: user?.invested ?? 0,
    currentValue: user?.portfolio?.value ?? 0,
    totalProfit: user?.portfolio?.profit ?? 0,
    roi: user?.portfolio?.roi ?? 0,
    status: (user?.portfolio?.status as PortfolioSummary["status"]) ?? "Active",
  }), [user]);

  const growth = useMemo(
    () => buildGrowth(summary.amountInvested, summary.currentValue),
    [summary.amountInvested, summary.currentValue],
  );
  const monthlyProfit = useMemo(
    () => growth.map((g, i) => ({ month: g.month, profit: i === 0 ? 0 : g.value - growth[i - 1].value })),
    [growth],
  );
  const allocation = useMemo(
    () => investments.map((i) => ({ name: i.plan, value: i.currentValue })),
    [investments],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return investments.filter((r) => {
      if (status !== "All" && r.status !== status) return false;
      if (q && !r.id.toLowerCase().includes(q) && !r.plan.toLowerCase().includes(q)) return false;
      if (from && r.startDate < from) return false;
      if (to && r.startDate > to) return false;
      return true;
    });
  }, [investments, query, status, from, to]);


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
            {summary.clientName.split(" ").map((s) => s[0]).join("")}
          </span>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Client name</div>
            <div className="truncate font-display text-lg font-semibold">{summary.clientName}</div>
          </div>
          <Badge className="ml-auto bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" /> {summary.status}
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
            <div className="mt-3 font-display text-5xl font-bold leading-none sm:text-6xl">{usd(summary.currentValue)}</div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/75">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
                <TrendingUp className="h-4 w-4 text-gold" /> +{summary.roi.toFixed(2)}% all-time
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">Profit {usd(summary.totalProfit)}</span>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <MiniStat label="Amount invested" value={usd(summary.amountInvested)} icon={PiggyBank} />
          <MiniStat label="Total profit" value={usd(summary.totalProfit)} icon={TrendingUp} positive />
          <MiniStat label="ROI" value={`${summary.roi.toFixed(2)}%`} icon={Percent} positive />
          <MiniStat label="Status" value={summary.status} icon={ShieldCheck} />
        </div>
      </div>

      {/* Analytics */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-display text-xl font-semibold">Portfolio growth</h2>
          <p className="text-sm text-muted-foreground">Value progression over the last 12 months.</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth}>
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
                <Pie data={allocation} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="80%" paddingAngle={3}>
                  {allocation.map((_, i) => <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />)}
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
              <BarChart data={monthlyProfit}>
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
            <DialogDescription>Investment details for {summary.clientName}.</DialogDescription>
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
