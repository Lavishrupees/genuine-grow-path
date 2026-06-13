export type Plan = {
  name: "Starter" | "Silver" | "Gold" | "VIP";
  min: number;
  max: number | null;
  roiDaily: string;
  duration: string;
  features: string[];
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  { name: "Starter", min: 500, max: 1999, roiDaily: "1.2%", duration: "14 days",
    features: ["Welcome bonus credit", "Email support", "Basic education library", "Auto-rollover available"] },
  { name: "Silver", min: 2000, max: 4999, roiDaily: "1.8%", duration: "21 days",
    features: ["Priority email support", "Weekly market reports", "Portfolio analytics", "Lower withdrawal fees"] },
  { name: "Gold", min: 5000, max: 9999, roiDaily: "2.4%", duration: "30 days", highlight: true,
    features: ["Dedicated advisor", "Advanced strategies", "Crypto + equities mix", "Free withdrawals"] },
  { name: "VIP", min: 10000, max: null, roiDaily: "3.2%", duration: "45 days",
    features: ["Concierge desk", "Custom allocations", "Tax-aware rebalancing", "Quarterly review calls"] },
];

export type ChartPoint = { day: string; portfolio: number; benchmark: number };

export function buildSeries(start = 10000, days = 30): ChartPoint[] {
  let p = start, b = start;
  const out: ChartPoint[] = [];
  for (let i = 0; i < days; i++) {
    p *= 1 + (Math.sin(i / 3) * 0.004 + 0.011);
    b *= 1 + (Math.sin(i / 4) * 0.003 + 0.004);
    out.push({ day: `D${i + 1}`, portfolio: Math.round(p), benchmark: Math.round(b) });
  }
  return out;
}

export const TESTIMONIALS = [
  { name: "Amelia R.", role: "Product Designer", text: "The dashboard makes long-term investing feel approachable. I finally understand my allocation.", gain: "+18.4%" },
  { name: "Marcus T.", role: "Software Engineer", text: "The education library is gold. I learned more in a month here than two years on YouTube.", gain: "+22.1%" },
  { name: "Priya S.", role: "Small business owner", text: "Withdrawals are quick and support actually answers. That alone earned my trust.", gain: "+12.7%" },
  { name: "Daniel K.", role: "Medical resident", text: "I auto-rollover into the Gold plan every cycle. Set it and forget it.", gain: "+27.5%" },
];

export const FAQS: { q: string; a: string }[] = [
  { q: "How does investing work on Genuine Investment?", a: "You fund your account, select a demo plan that matches your goals and risk tolerance, and our simulated strategy allocates across stocks, ETFs and crypto. You can track results in real time on your dashboard." },
  { q: "What are the risks?", a: "All investing involves risk including loss of principal. Past performance is not indicative of future results. Diversify, invest only what you can afford, and use a long time horizon." },
  { q: "How are my funds protected?", a: "Funds are held with regulated custodians, encrypted in transit with TLS 1.3, and accounts can be secured with 2FA and identity verification." },
  { q: "How long do withdrawals take?", a: "Most withdrawals process within 24 business hours. Bank wires can take 1–3 business days depending on your institution." },
  { q: "Is there a minimum deposit?", a: "Yes — the Starter plan begins at $100. Higher tiers unlock more features and lower fees." },
  { q: "Can I cancel a plan early?", a: "You can stop auto-rollover at any time. Active cycles complete on schedule so returns are calculated fairly." },
];
