import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

type Msg = { id: string; sender: "user" | "agent"; body: string; created_at: string };

export function ChatWidget() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  // Load and subscribe
  useEffect(() => {
    if (!session?.user) { setMsgs([]); return; }
    const uid = session.user.id;
    let cancelled = false;
    supabase.from("chat_messages").select("*").eq("user_id", uid).order("created_at").then(({ data }) => {
      if (cancelled) return;
      setMsgs((data ?? []) as Msg[]);
    });
    const ch = supabase
      .channel("chat:" + uid)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `user_id=eq.${uid}` }, (payload) => {
        setMsgs(m => [...m, payload.new as Msg]);
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [session?.user]);

  const send = async () => {
    const body = text.trim();
    if (!body || !session?.user) return;
    setSending(true);
    setText("");
    const { error } = await supabase.from("chat_messages").insert({
      user_id: session.user.id, sender: "user", body: body.slice(0, 2000),
    });
    setSending(false);
    if (error) { setText(body); }
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
            <div className="text-xs text-white/70">Our team replies within minutes.</div>
          </div>
          {!session ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-muted-foreground">Sign in to chat with our support team.</p>
              <Button asChild className="bg-gold-gradient text-gold-foreground"><Link to="/auth" onClick={() => setOpen(false)}>Sign in</Link></Button>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                {msgs.length === 0 && <div className="rounded-xl rounded-bl-sm bg-secondary px-3 py-2 text-sm">Hi! How can we help today?</div>}
                {msgs.map((m) => (
                  <div key={m.id} className={m.sender === "user" ? "ml-auto max-w-[80%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground" : "max-w-[80%] rounded-xl rounded-bl-sm bg-secondary px-3 py-2 text-sm"}>
                    {m.body}
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-border p-2">
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" maxLength={2000} />
                <Button type="submit" size="icon" disabled={sending} className="bg-gold-gradient text-gold-foreground"><Send className="h-4 w-4" /></Button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
