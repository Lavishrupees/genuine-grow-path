import { Link } from "@tanstack/react-router";
import { ShieldCheck, Lock, BadgeCheck, Phone, Mail } from "lucide-react";
import { CONTACT } from "@/lib/contact";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-navy-gradient text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-white/10 text-gold">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-semibold">Genuine Investment</span>
            </div>
            <p className="mt-4 text-sm text-white/70">Together we succeed. Premium-grade investing tools, education and security for the long term.</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              <li><a href={CONTACT.phoneHref} className="inline-flex items-center gap-2 text-white/80 hover:text-gold"><Phone className="h-3.5 w-3.5 text-gold" />{CONTACT.phone}</a></li>
              <li><a href={CONTACT.emailHref} className="inline-flex items-center gap-2 text-white/80 hover:text-gold"><Mail className="h-3.5 w-3.5 text-gold" />{CONTACT.email}</a></li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1"><Lock className="h-3 w-3 text-gold" /> SSL Secured</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1"><BadgeCheck className="h-3 w-3 text-gold" /> 2FA Ready</span>
            </div>
          </div>
          <FooterCol title="Platform" links={[["/dashboard","Dashboard"],["/education","Education"],["/deposit","Deposit"],["/withdraw","Withdraw"]]} />
          <FooterCol title="Company" links={[["/about","About"],["/security","Security"],["/faq","FAQ"],["/contact","Contact"]]} />
          <FooterCol title="Legal" links={[["/faq","Risk Disclosure"],["/faq","Terms"],["/faq","Privacy"]]} />
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-white/60">
          <p>© {new Date().getFullYear()} Genuine Investment. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gold">{title}</h4>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map(([to, label]) => (
          <li key={label}><Link to={to} className="text-white/70 hover:text-white">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
