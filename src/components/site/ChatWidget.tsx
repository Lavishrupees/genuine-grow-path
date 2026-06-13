import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = { from: "user" | "agent"; text: string; t: number };

const CANNED: { match: RegExp; reply: string }[] = [
  { match: /deposit|fund/i, reply: "You can fund your account from the Deposit page using bank transfer, card, or crypto wallet. Most deposits clear within minutes." },
  { match: /withdraw/i, reply: "Withdrawals are processed within 24 business hours. Head to the Withdraw page to submit a request." },
  { match: /plan|starter|silver|gold|vip/i, reply: "We offer Starter, Silver, Gold and VIP plans. You can compare them on your Dashboard." },
  { match: /secur|2fa|safe/i, reply: "We use SSL encryption, 2FA, and account verification. See the Security page for full details." },
  { match: /risk/i, reply: "All investing carries risk. Our Education and FAQ pages explain risk management strategies." },
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "agent", text: "Hi! I'm your Genuine Investment assistant. How can I help today?", t: Date.now() },
  ]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  const send = () => {
    const q = text.trim();
    if (!q) return;
    setMsgs(m => [...m, { from: "user", text: q, t: Date.now() }]);
    setText("");
    const hit = CANNED.find(c => c.match.test(q));
    const reply = hit?.reply ?? "Thanks for reaching out! A specialist will follow up shortly. In the meantime, our FAQ may have what you need.";
    setTimeout(() => setMsgs(m => [...m, { from: "agent", text: reply, t: Date.now() }]), 600);
  };

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Open support chat"
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-gold-gradient text-gold-foreground shadow-gold transition hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
          <div className="bg-navy-gradient px-4 py-3 text-primary-foreground">
            <div className="text-sm font-semibold">Live Support</div>
            <div className="text-xs text-white/70">Typically replies in a few seconds · Demo</div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {msgs.map((m, i) => (
              <div key={i} className={m.from === "user" ? "ml-auto max-w-[80%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground" : "max-w-[80%] rounded-xl rounded-bl-sm bg-secondary px-3 py-2 text-sm"}>
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-2 border-t border-border p-2"
          >
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
            <Button type="submit" size="icon" className="bg-gold-gradient text-gold-foreground"><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      )}
    </>
  );
}
