import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X, Send, CheckCheck, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase as authSupabase } from "@/integrations/supabase/client";
import {
  createVisitorClient,
  getVisitorToken,
  getSavedConversationId,
  saveConversationId,
  clearConversation,
  getSavedIdentity,
  saveIdentity,
  isSupportOnline,
  formatTime,
} from "@/lib/chat-support";
import type { SupabaseClient } from "@supabase/supabase-js";

type Msg = {
  id: string;
  sender: "user" | "agent" | "system";
  body: string;
  created_at: string;
  delivered_at: string | null;
  seen_at: string | null;
  conversation_id: string;
};

export function ChatWidget() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"intro" | "chat">("intro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [supportOnline, setSupportOnline] = useState(() => isSupportOnline());
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const visitorToken = useMemo(() => (typeof window === "undefined" ? "" : getVisitorToken()), []);
  const client = useMemo<SupabaseClient | null>(() => {
    if (typeof window === "undefined") return null;
    return session ? authSupabase : createVisitorClient(visitorToken);
  }, [session, visitorToken]);

  // support hours ticker
  useEffect(() => {
    const t = setInterval(() => setSupportOnline(isSupportOnline()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Prefill identity
  useEffect(() => {
    if (session?.user) {
      const meta = (session.user.user_metadata ?? {}) as { name?: string };
      setName(meta.name ?? session.user.email ?? "");
      setEmail(session.user.email ?? "");
    } else {
      const saved = getSavedIdentity();
      if (saved) { setName(saved.name); setEmail(saved.email); }
    }
  }, [session]);

  // Restore existing conversation
  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    (async () => {
      if (session?.user) {
        const { data } = await client
          .from("chat_conversations")
          .select("id")
          .eq("user_id", session.user.id)
          .order("last_message_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled && data?.id) { setConversationId(data.id); setStep("chat"); }
      } else {
        const saved = getSavedConversationId();
        if (saved) {
          const { data } = await client.from("chat_conversations").select("id").eq("id", saved).maybeSingle();
          if (!cancelled && data?.id) { setConversationId(data.id); setStep("chat"); }
          else if (!cancelled) clearConversation();
        }
      }
    })();
    return () => { cancelled = true; };
  }, [client, session]);

  // Load messages + subscribe
  useEffect(() => {
    if (!client || !conversationId) return;
    let cancelled = false;
    const refetch = () => {
      client
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at")
        .then(({ data }) => {
          if (cancelled || !data) return;
          setMsgs((prev) => {
            // merge — preserve order, replace by id
            const map = new Map(prev.map((m) => [m.id, m]));
            for (const m of data as Msg[]) map.set(m.id, m);
            return Array.from(map.values()).sort((a, b) => a.created_at.localeCompare(b.created_at));
          });
        });
    };
    refetch();
    // Polling fallback ensures anon visitors and admins see new messages even if realtime is delayed
    const poll = window.setInterval(refetch, 3500);

    const ch = client
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMsgs((prev) => prev.map((x) => (x.id === m.id ? m : x)));
        },
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.from === "agent") {
          setAgentTyping(true);
          if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = window.setTimeout(() => setAgentTyping(false), 3000);
        }
      })
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      client.removeChannel(ch);
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    };
  }, [client, conversationId]);

  // mark agent messages as seen when open
  useEffect(() => {
    if (!open || !client || !conversationId) return;
    const hasUnseen = msgs.some((m) => m.sender === "agent" && !m.seen_at);
    if (!hasUnseen) return;
    client.rpc("chat_mark_read_visitor", { _cid: conversationId }).then(() => { /* noop */ });
  }, [open, client, conversationId, msgs]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open, agentTyping]);

  const startConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    const n = name.trim(); const em = email.trim();
    if (!n || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return;
    setStarting(true);
    const { data, error } = await client
      .from("chat_conversations")
      .insert({
        user_id: session?.user?.id ?? null,
        visitor_name: n.slice(0, 80),
        visitor_email: em.slice(0, 120),
        visitor_token: visitorToken,
        is_offline: !supportOnline,
      })
      .select("id")
      .single();
    setStarting(false);
    if (error || !data) return;
    if (!session) saveIdentity({ name: n, email: em });
    saveConversationId(data.id);
    setConversationId(data.id);
    setStep("chat");
    if (!supportOnline) {
      await client.from("chat_messages").insert({
        conversation_id: data.id,
        sender: "system",
        body: `We're currently offline. We'll reply to ${em} by email as soon as we're back.`,
      });
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || !client || !conversationId) return;
    setSending(true);
    setText("");
    const { data, error } = await client.from("chat_messages").insert({
      conversation_id: conversationId,
      user_id: session?.user?.id ?? null,
      sender: "user",
      body: body.slice(0, 2000),
      delivered_at: new Date().toISOString(),
    }).select("*").single();
    setSending(false);
    if (error || !data) { setText(body); return; }
    setMsgs((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as Msg]));
  };

  const onType = () => {
    if (!client || !conversationId) return;
    const ch = client.channel(`chat:${conversationId}`);
    ch.send({ type: "broadcast", event: "typing", payload: { from: "user" } });
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open support chat"
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-gold-gradient text-gold-foreground shadow-gold transition hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
          <div className="bg-navy-gradient px-4 py-3 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Live Support</div>
                <div className="flex items-center gap-1.5 text-xs text-white/70">
                  <span className={`h-2 w-2 rounded-full ${supportOnline ? "bg-emerald-400" : "bg-amber-400"}`} />
                  {supportOnline ? "We're online now" : "Offline — we reply by email"}
                </div>
              </div>
            </div>
          </div>

          {step === "intro" || !conversationId ? (
            <form onSubmit={startConversation} className="flex flex-1 flex-col gap-3 p-5">
              <p className="text-sm text-muted-foreground">
                {supportOnline
                  ? "Tell us who you are and we'll be right with you."
                  : "We're currently offline. Leave your message and we'll reply by email."}
              </p>
              <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
              <Input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} required />
              <Button type="submit" disabled={starting} className="bg-gold-gradient text-gold-foreground">
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start chat"}
              </Button>
            </form>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                {msgs.length === 0 && (
                  <div className="rounded-xl rounded-bl-sm bg-secondary px-3 py-2 text-sm">
                    Hi {name?.split(" ")[0] || "there"}! How can we help today?
                  </div>
                )}
                {msgs.map((m) => {
                  if (m.sender === "system") {
                    return (
                      <div key={m.id} className="mx-auto max-w-[85%] rounded-lg bg-secondary/60 px-3 py-1.5 text-center text-xs text-muted-foreground">
                        {m.body}
                      </div>
                    );
                  }
                  const mine = m.sender === "user";
                  return (
                    <div key={m.id} className={mine ? "ml-auto max-w-[80%]" : "max-w-[80%]"}>
                      <div className={mine
                        ? "rounded-xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                        : "rounded-xl rounded-bl-sm bg-secondary px-3 py-2 text-sm"}>
                        {m.body}
                      </div>
                      <div className={`mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground ${mine ? "justify-end" : ""}`}>
                        <span>{formatTime(m.created_at)}</span>
                        {mine && (m.seen_at ? <CheckCheck className="h-3 w-3 text-primary" /> : m.delivered_at ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                      </div>
                    </div>
                  );
                })}
                {agentTyping && (
                  <div className="max-w-[80%] rounded-xl rounded-bl-sm bg-secondary px-3 py-2 text-sm">
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                    </span>
                  </div>
                )}
                <div ref={endRef} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-border p-2">
                <Input
                  value={text}
                  onChange={(e) => { setText(e.target.value); onType(); }}
                  placeholder={supportOnline ? "Type a message…" : "Leave your message…"}
                  maxLength={2000}
                />
                <Button type="submit" size="icon" disabled={sending} className="bg-gold-gradient text-gold-foreground">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
