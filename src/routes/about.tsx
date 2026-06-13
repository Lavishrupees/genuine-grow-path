import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Users, Globe2, Award } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About — Genuine Investment" }, { name: "description", content: "Our mission is to make investing transparent, educational and accessible for everyone." }] }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="max-w-3xl">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">About Genuine Investment</h1>
        <p className="mt-4 text-lg text-muted-foreground">We're an investing platform built on three ideas: <span className="text-foreground">education first</span>, <span className="text-foreground">transparent fees</span>, and <span className="text-foreground">long-term thinking</span>. Together we succeed.</p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Card className="p-8">
          <Target className="h-7 w-7 text-gold" />
          <h2 className="mt-3 font-display text-2xl font-semibold">Our mission</h2>
          <p className="mt-3 text-muted-foreground">To democratize professional-grade investing tools and education. We believe the next generation of investors deserves clarity over hype, and tools that grow with them from $100 to $1M.</p>
        </Card>
        <Card className="p-8">
          <Users className="h-7 w-7 text-gold" />
          <h2 className="mt-3 font-display text-2xl font-semibold">Who we serve</h2>
          <p className="mt-3 text-muted-foreground">First-time investors learning the ropes, busy professionals optimizing their portfolio, and seasoned investors who want premium tools without premium friction.</p>
        </Card>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {[
          { icon: Globe2, k: "32", l: "Countries supported" },
          { icon: Users, k: "120k+", l: "Active investors" },
          { icon: Award, k: "4.9★", l: "Average review" },
        ].map(s => (
          <Card key={s.l} className="p-6 text-center">
            <s.icon className="mx-auto h-7 w-7 text-gold" />
            <div className="mt-3 font-display text-3xl font-bold">{s.k}</div>
            <div className="text-sm text-muted-foreground">{s.l}</div>
          </Card>
        ))}
      </div>

      <div className="mt-14 rounded-2xl bg-navy-gradient p-10 text-primary-foreground sm:p-14">
        <h2 className="font-display text-3xl font-bold">Investment education at the core</h2>
        <p className="mt-3 max-w-2xl text-white/80">Every Genuine Investment account includes free access to our education library, weekly market briefs, and a live support team — because better-informed investors make better decisions.</p>
        <Button asChild className="mt-6 bg-gold-gradient text-gold-foreground"><Link to="/education">Visit education library</Link></Button>
      </div>
    </div>
  );
}
