import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { CONTACT } from "@/lib/contact";
import { Logo } from "@/components/site/Logo";

const nav = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/education", label: "Education" },
  { to: "/about", label: "About" },
  { to: "/security", label: "Security" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const handleSignOut = async () => { await signOut(); navigate({ to: "/" }); };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="hidden bg-navy-gradient text-primary-foreground sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs sm:px-6">
          <span className="text-white/70">24/7 support — Together we succeed.</span>
          <div className="flex items-center gap-4">
            <a href={CONTACT.phoneHref} className="inline-flex items-center gap-1.5 text-white/90 hover:text-gold"><Phone className="h-3.5 w-3.5 text-gold" />{CONTACT.phone}</a>
            <a href={CONTACT.emailHref} className="hidden items-center gap-1.5 text-white/90 hover:text-gold md:inline-flex"><Mail className="h-3.5 w-3.5 text-gold" />{CONTACT.email}</a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo imgClassName="h-10 w-auto sm:h-11" priority />
        <Link to="/" className="sr-only">Genuine Investment — Home</Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map(n => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "text-foreground bg-secondary" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              {isAdmin && <Button asChild variant="outline" size="sm"><Link to="/admin">Admin</Link></Button>}
              <span className="text-sm text-muted-foreground">Hi, {user.name.split(" ")[0]}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>Sign out</Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
              <Button asChild size="sm" className="bg-gold-gradient text-gold-foreground hover:opacity-90"><Link to="/auth">Get started</Link></Button>
            </>
          )}
        </div>

        <button
          className="grid h-10 w-10 place-items-center rounded-md border border-border lg:hidden"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 p-4">
            {nav.map(n => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              {user ? (
                <>
                  {isAdmin && <Button asChild variant="outline" className="flex-1"><Link to="/admin" onClick={() => setOpen(false)}>Admin</Link></Button>}
                  <Button variant="outline" className="flex-1" onClick={async () => { await signOut(); setOpen(false); navigate({ to: "/" }); }}>Sign out</Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" className="flex-1"><Link to="/auth" onClick={() => setOpen(false)}>Sign in</Link></Button>
                  <Button asChild className="flex-1 bg-gold-gradient text-gold-foreground"><Link to="/auth" onClick={() => setOpen(false)}>Get started</Link></Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
