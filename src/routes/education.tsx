import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Bitcoin, LineChart, Clock, Globe2, ShieldAlert, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/education")({
  head: () => ({ meta: [{ title: "Education — Genuine Investment" }, { name: "description", content: "Learn stocks, crypto, forex, long-term wealth building and risk management with our free education library." }] }),
  component: Education,
});

const CATEGORIES = [
  { icon: LineChart, title: "Stock market investing", color: "text-blue-500", articles: [
    { t: "Reading a stock chart for beginners", time: "6 min" },
    { t: "Understanding P/E and valuation", time: "8 min" },
    { t: "How dividends actually work", time: "5 min" },
  ]},
  { icon: Bitcoin, title: "Cryptocurrency", color: "text-amber-500", articles: [
    { t: "Bitcoin vs Ethereum: a primer", time: "7 min" },
    { t: "Wallets, custody and security", time: "9 min" },
    { t: "Stablecoins explained simply", time: "5 min" },
  ]},
  { icon: Globe2, title: "Forex basics", color: "text-cyan-500", articles: [
    { t: "Currency pairs and pips explained", time: "6 min" },
    { t: "Leverage and margin — used safely", time: "8 min" },
    { t: "Reading economic calendars", time: "5 min" },
  ]},
  { icon: Clock, title: "Long-term wealth building", color: "text-emerald-500", articles: [
    { t: "The power of compounding over 30 years", time: "10 min" },
    { t: "Dollar-cost averaging without overthinking", time: "6 min" },
    { t: "Building a 3-fund portfolio", time: "8 min" },
  ]},
  { icon: ShieldAlert, title: "Risk management", color: "text-rose-500", articles: [
    { t: "Position sizing without losing sleep", time: "7 min" },
    { t: "Diversification across asset classes", time: "8 min" },
    { t: "When to rebalance your portfolio", time: "6 min" },
  ]},
  { icon: GraduationCap, title: "Beginner investment guide", color: "text-violet-500", articles: [
    { t: "Your first $500 — a step by step plan", time: "9 min" },
    { t: "Setting SMART financial goals", time: "5 min" },
    { t: "Avoiding common beginner mistakes", time: "7 min" },
  ]},
];

function Education() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="max-w-2xl">
        <Badge variant="outline" className="border-gold/50 text-gold">Free education</Badge>
        <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">Learn to invest with confidence</h1>
        <p className="mt-3 text-muted-foreground">Plain-English guides on stocks, crypto and long-term investing — written by analysts, no jargon.</p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {CATEGORIES.map(cat => (
          <Card key={cat.title} className="p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary"><cat.icon className={`h-5 w-5 ${cat.color}`} /></span>
              <h2 className="font-display text-xl font-semibold">{cat.title}</h2>
            </div>
            <ul className="mt-5 space-y-3">
              {cat.articles.map(a => (
                <li key={a.t} className="group flex cursor-pointer items-start gap-3 rounded-md p-2 transition hover:bg-secondary/60">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium leading-snug">{a.t}</div>
                    <div className="text-xs text-muted-foreground">{a.time} read</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div className="mt-14 rounded-2xl bg-navy-gradient p-8 text-primary-foreground sm:p-12">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">The Genuine Investing Principles</h2>
          <ol className="mt-5 space-y-3 text-white/85">
            <li><span className="font-semibold text-gold">1.</span> Time in the market beats timing the market.</li>
            <li><span className="font-semibold text-gold">2.</span> Diversify across assets, regions and time.</li>
            <li><span className="font-semibold text-gold">3.</span> Manage risk before chasing returns.</li>
            <li><span className="font-semibold text-gold">4.</span> Costs and taxes matter — keep both low.</li>
            <li><span className="font-semibold text-gold">5.</span> Keep learning. Markets evolve.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
