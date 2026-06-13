import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Phone, Mail, Clock, MessageSquare, LifeBuoy } from "lucide-react";
import { CONTACT } from "@/lib/contact";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [
    { title: "Contact us — Genuine Investment" },
    { name: "description", content: "Get in touch with Genuine Investment support 24/7 by phone, email or live chat." },
  ]}),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(2000),
});

function Contact() {
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: fd.get("name"), email: fd.get("email"),
      subject: fd.get("subject"), message: fd.get("message"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    toast.success("Message sent — our team will reply within 24h");
    e.currentTarget.reset();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl font-bold sm:text-5xl">Contact our team</h1>
        <p className="mt-3 text-muted-foreground">We're here 24/7. Reach us by phone, email, live chat or open a support ticket below.</p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-navy-gradient text-gold"><Phone className="h-5 w-5" /></span>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Phone</div>
                <a href={CONTACT.phoneHref} className="font-display text-lg font-semibold hover:text-gold">{CONTACT.phone}</a>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-navy-gradient text-gold"><Mail className="h-5 w-5" /></span>
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Email</div>
                <a href={CONTACT.emailHref} className="block truncate font-display text-lg font-semibold hover:text-gold">{CONTACT.email}</a>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-navy-gradient text-gold"><Clock className="h-5 w-5" /></span>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Hours</div>
                <div className="font-display text-lg font-semibold">{CONTACT.hours}</div>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-gold-gradient text-gold-foreground"><MessageSquare className="h-5 w-5" /></span>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Live chat</div>
                <div className="font-display text-lg font-semibold">Tap the chat bubble</div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-gold" /><h2 className="font-display text-xl font-semibold">Open a support ticket</h2></div>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" name="name" required maxLength={80} /></div>
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required maxLength={255} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="subject">Subject</Label><Input id="subject" name="subject" required maxLength={120} /></div>
            <div className="space-y-2"><Label htmlFor="message">Message</Label><Textarea id="message" name="message" required maxLength={2000} rows={6} /></div>
            <Button type="submit" className="w-full bg-gold-gradient text-gold-foreground">Send message</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
