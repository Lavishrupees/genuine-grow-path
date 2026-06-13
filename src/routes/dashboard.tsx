import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { PLANS, buildSeries } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownToLine, ArrowUpFromLine, BadgeCheck, Wallet, TrendingUp, PiggyBank, Receipt, Calculator } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Genuine Investment" }, { name: "description", content: "Your portfolio, plans and growth at a glance." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, update } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (!user) navigate({ to: "/auth" }); }, [user, navigate]);
  if (!user) return null;

  const series = useMemo(() => buildSeries(Math.max(user.invested, 10000), 30), [user.invested]);
  const current = series[series.length - 1].portfolio;
  const benchmark = series[series.length - 1].benchmark;
  const pct = ((current - series[0].portfolio) / series[0].portfolio) * 100;

  const selectPlan = (name: typeof user.plan) => {
    update({ plan: name });
    toast.success(`Selected ${name} plan`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Top */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Welcome</div>
          <h1 className="truncate font-display text-3xl font-bold sm:text-4xl">Hi, {user.name.split(" ")[0]}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{user.plan} plan</Badge>
            {user.verified ? <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Verified</Badge> : <Badge variant="outline">Unverified</Badge>}
            {user.twoFactor && <Badge className="bg-gold/20 text-gold-foreground">2FA on</Badge>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/deposit"><ArrowDownToLine className="mr-1 h-4 w-4" /> Deposit</Link></Button>
          <Button asChild size="sm" className="bg-gold-gradient text-gold-foreground"><Link to="/withdraw"><ArrowUpFromLine className="mr-1 h-4 w-4" /> Withdraw</Link></Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Balance" value={`$${user.balance.toLocaleString()}`} hint="Available" icon={Wallet} />
        <Stat label="Invested" value={`$${user.invested.toLocaleString()}`} hint="Across plans" />
        <Stat label="Portfolio value" value={`$${current.toLocaleString()}`} hint={`${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`} positive={pct >= 0} />
        <Stat label="Benchmark" value={`$${benchmark.toLocaleString()}`} hint="S&P-style demo" />
      </div>

      {/* Chart */}
      <Card className="mt-6 p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold">Portfolio growth</h2>
            <p className="text-sm text-muted-foreground">Simulated 30-day performance vs. benchmark.</p>
          </div>
          <Badge variant="outline" className="shrink-0">Demo</Badge>
        </div>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="port" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.14 85)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.78 0.14 85)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(0.91 0.012 255)" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="oklch(0.5 0.03 255)" fontSize={11} />
              <YAxis stroke="oklch(0.5 0.03 255)" fontSize={11} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Area type="monotone" dataKey="portfolio" stroke="oklch(0.6 0.16 80)" strokeWidth={2.5} fill="url(#port)" />
              <Line type="monotone" dataKey="benchmark" stroke="oklch(0.55 0.15 240)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Plans */}
      <div className="mt-10">
        <h2 className="font-display text-2xl font-bold">Investment plans</h2>
        <p className="mt-1 text-sm text-muted-foreground">Switch your active plan anytime — figures are illustrative.</p>
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map(p => {
            const active = user.plan === p.name;
            return (
              <Card key={p.name} className={`relative flex flex-col p-6 ${p.highlight ? "border-gold/60" : ""} ${active ? "ring-2 ring-gold" : ""}`}>
                {p.highlight && <span className="absolute -top-3 left-6 rounded-full bg-gold-gradient px-2 py-0.5 text-xs font-semibold text-gold-foreground">Popular</span>}
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.name}</div>
                <div className="mt-2 font-display text-3xl font-bold">{p.roiDaily}<span className="text-base font-medium text-muted-foreground">/day</span></div>
                <div className="mt-1 text-sm text-muted-foreground">{p.duration}</div>
                <div className="mt-1 text-sm">From ${p.min.toLocaleString()}{p.max ? `–$${p.max.toLocaleString()}` : "+"}</div>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {p.features.map(f => <li key={f} className="flex gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{f}</li>)}
                </ul>
                <Button onClick={() => selectPlan(p.name)} disabled={active} className={`mt-5 w-full ${active ? "" : p.highlight ? "bg-gold-gradient text-gold-foreground" : "bg-navy-gradient text-primary-foreground"}`}>
                  {active ? "Active" : "Select plan"}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, positive, icon: Icon }: { label: string; value: string; hint?: string; positive?: boolean; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 truncate font-display text-2xl font-bold">{value}</div>
          {hint && <div className={`mt-1 text-xs ${positive === undefined ? "text-muted-foreground" : positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>{hint}</div>}
        </div>
        {Icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary text-foreground"><Icon className="h-4 w-4" /></span>}
      </div>
    </Card>
  );
}
