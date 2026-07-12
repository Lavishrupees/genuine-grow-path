import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, TrendingUp, ShieldCheck, GraduationCap, BarChart3, Lock, BadgeCheck, Globe2, Sparkles, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PLANS, TESTIMONIALS, buildSeries } from "@/lib/data";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Genuine Investment — Together we succeed" },
      { name: "description", content: "Trusted investment platform offering plans across stocks, crypto and long-term portfolios. Together we succeed." },
      { property: "og:title", content: "Genuine Investment — Together we succeed" },
      { property: "og:description", content: "Trusted investment platform offering plans across stocks, crypto and long-term portfolios." },
    ],
  }),
  component: Home,
});

function Home() {
  const series = buildSeries(10000, 30);
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-gradient text-primary-foreground">
        <img src={hero} alt="" width={1920} height={1280} className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.18),transparent_60%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-wider text-gold">
              <Sparkles className="h-3 w-3" /> Trusted by 120,000+ investors
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              Together we <span className="text-gold">succeed</span>.
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/75 sm:text-lg">
              A premium investing platform for stocks, crypto, and long-term portfolios — backed by education, transparency and bank-grade security.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gold-gradient text-gold-foreground shadow-gold hover:opacity-95">
                <Link to="/auth">Open free account <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10">
                <Link to="/education">Explore education</Link>
              </Button>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-6 text-sm">
              {[["$2.4B","Assets tracked"],["120k+","Investors"],["4.9★","App rating"]].map(([n,l]) => (
                <div key={l}><div className="font-display text-2xl font-bold text-gold">{n}</div><div className="text-white/60">{l}</div></div>
              ))}
            </div>
          </div>

          {/* hero chart card */}
          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-elegant backdrop-blur">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wider text-white/60">Portfolio</div>
                  <div className="truncate font-display text-3xl font-bold">$13,847.21</div>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">+38.4%</span>
              </div>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.82 0.15 88)" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="oklch(0.82 0.15 88)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" hide />
                    <YAxis hide domain={["dataMin", "dataMax"]} />
                    <Tooltip contentStyle={{ background: "rgba(20,30,55,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
                    <Area type="monotone" dataKey="portfolio" stroke="oklch(0.82 0.15 88)" strokeWidth={2} fill="url(#g1)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs text-white/70">
                <div><div className="text-white">Stocks</div><div>42%</div></div>
                <div><div className="text-white">Crypto</div><div>28%</div></div>
                <div><div className="text-white">Bonds/ETF</div><div>30%</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-border bg-secondary/50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-6 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:px-6">
          <span className="inline-flex items-center gap-2"><Lock className="h-4 w-4 text-gold" /> 256-bit SSL</span>
          <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold" /> 2FA Login</span>
          <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-gold" /> KYC Verified</span>
          <span className="inline-flex items-center gap-2"><Globe2 className="h-4 w-4 text-gold" /> Global Custodians</span>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Everything you need to invest with confidence</h2>
          <p className="mt-3 text-muted-foreground">From your first $100 to your first million, our tools grow with you.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: BarChart3, title: "Portfolio tracking", desc: "Real-time charts, allocation insights and goal progress at a glance." },
            { icon: TrendingUp, title: "Demo plans", desc: "Four tiers from Starter to VIP — model returns before committing capital." },
            { icon: GraduationCap, title: "Education library", desc: "Stocks, crypto, ETFs and long-term investing — guided by experts." },
            { icon: ShieldCheck, title: "Bank-grade security", desc: "TLS 1.3, 2FA, KYC verification and segregated custody." },
            { icon: Lock, title: "Easy deposits", desc: "Bank transfer, debit card or crypto wallet — fund in minutes." },
            { icon: Sparkles, title: "Live support", desc: "Real humans (and a smart bot) ready 24/7 from the chat widget." },
          ].map((f) => (
            <Card key={f.title} className="group border-border/70 p-6 transition hover:-translate-y-0.5 hover:shadow-elegant">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-navy-gradient text-gold transition group-hover:scale-105">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Plans preview */}
      <section className="bg-secondary/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">Investment plans</h2>
              <p className="mt-2 text-muted-foreground">Pick a tier that matches your goals — all figures are illustrative.</p>
            </div>
            <Button asChild variant="ghost"><Link to="/dashboard">Compare in dashboard <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map(p => (
              <Card key={p.name} className={`relative p-6 ${p.highlight ? "border-gold/60 shadow-gold" : ""}`}>
                {p.highlight && <span className="absolute -top-3 left-6 rounded-full bg-gold-gradient px-2 py-0.5 text-xs font-semibold text-gold-foreground">Most popular</span>}
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.name}</div>
                <div className="mt-2 font-display text-3xl font-bold">{p.roiDaily}<span className="text-base font-medium text-muted-foreground">/day</span></div>
                <div className="mt-1 text-sm text-muted-foreground">{p.duration} · From ${p.min.toLocaleString()}{p.max ? `–$${p.max.toLocaleString()}` : "+"}</div>
                <ul className="mt-5 space-y-2 text-sm">
                  {p.features.slice(0,3).map(f => <li key={f} className="flex gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{f}</li>)}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Investor success stories</h2>
          <p className="mt-3 text-sm text-muted-foreground">Examples for illustration purposes only — not real performance.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.map(t => (
            <Card key={t.name} className="p-6">
              <Quote className="h-6 w-6 text-gold" />
              <p className="mt-3 text-sm leading-relaxed">{t.text}</p>
              <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-4">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{t.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{t.role}</div>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{t.gain}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-navy-gradient p-10 text-center text-primary-foreground sm:p-14">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Start investing in minutes</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/75">Open an account, complete verification, and explore the demo plans risk-free.</p>
          <Button asChild size="lg" className="mt-7 bg-gold-gradient text-gold-foreground shadow-gold"><Link to="/auth">Create account <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </section>
    </>
  );
}
