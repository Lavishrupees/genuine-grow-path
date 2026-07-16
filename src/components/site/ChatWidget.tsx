import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X, Send, CheckCheck, Check, Loader2, LogIn, UserPlus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import {
  getSavedConversationId,
  saveConversationId,
  clearConversation,
  isSupportOnline,
  formatTime,
} from "@/lib/chat-support";

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
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [supportOnline, setSupportOnline] = useState(() => isSupportOnline());
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const isAuthed = !!session?.user;

  useEffect(() => {
    const t = setInterval(() => setSupportOnline(isSupportOnline()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Restore existing conversation for signed-in user
  useEffect(() => {
    if (!isAuthed || !session?.user) {
      setConversationId(null);
      setMsgs([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("user_id", session.user.id)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data?.id) {
        setConversationId(data.id);
        saveConversationId(data.id);
      } else if (!cancelled) {
        // clear stale guest conversation id
        clearConversation();
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthed, session?.user]);

  // Auto-create a conversation once authenticated user opens the widget
  const ensureConversation = async () => {
    if (!session?.user || !user || conversationId || starting) return;
    setStarting(true);
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({
        user_id: session.user.id,
        visitor_name: user.name.slice(0, 80),
        visitor_email: user.email.slice(0, 120),
        visitor_token: undefined,
        is_offline: !supportOnline,
      })
      .select("id")
      .single();
    setStarting(false);
    if (error || !data) return;
    saveConversationId(data.id);
    setConversationId(data.id);
    if (!supportOnline) {
      await supabase.from("chat_messages").insert({
        conversation_id: data.id,
        sender: "system",
        body: `We're currently offline. We'll reply to ${user.email} by email as soon as we're back.`,
      });
    }
  };

  useEffect(() => {
    if (open && isAuthed && !conversationId && !starting) {
      void ensureConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAuthed, conversationId]);

  // Load messages + subscribe
  useEffect(() => {
    if (!conversationId || !isAuthed) return;
    let cancelled = false;
    const refetch = () => {
      supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at")
        .then(({ data }) => {
          if (cancelled || !data) return;
          setMsgs((prev) => {
            const map = new Map(prev.map((m) => [m.id, m]));
            for (const m of data as Msg[]) map.set(m.id, m);
            return Array.from(map.values()).sort((a, b) => a.created_at.localeCompare(b.created_at));
          });
        });
    };
    refetch();
    const poll = window.setInterval(refetch, 4000);

    const ch = supabase
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
      supabase.removeChannel(ch);
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, isAuthed]);

  useEffect(() => {
    if (!open || !conversationId || !isAuthed) return;
    const hasUnseen = msgs.some((m) => m.sender === "agent" && !m.seen_at);
    if (!hasUnseen) return;
    supabase.rpc("chat_mark_read_visitor", { _cid: conversationId });
  }, [open, conversationId, isAuthed, msgs]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open, agentTyping]);

  const send = async () => {
    const body = text.trim();
    if (!body || !conversationId || !session?.user) return;
    setSending(true);
    setText("");
    const { data, error } = await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      user_id: session.user.id,
      sender: "user",
      body: body.slice(0, 2000),
      delivered_at: new Date().toISOString(),
    }).select("*").single();
    setSending(false);
    if (error || !data) { setText(body); return; }
    setMsgs((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as Msg]));
  };

  const onType = () => {
    if (!conversationId) return;
    const ch = supabase.channel(`chat:${conversationId}`);
    ch.send({ type: "broadcast", event: "typing", payload: { from: "user" } });
  };

  const goAuth = (mode: "signin" | "signup") => {
    // Persist intent to auto-open chat after login
    try { sessionStorage.setItem("gi_open_chat_after_auth", "1"); } catch { /* ignore */ }
    setOpen(false);
    navigate({ to: "/auth", search: { mode } as never });
  };

  // Auto-open chat after login if the user requested it before authenticating
  useEffect(() => {
    if (!isAuthed) return;
    try {
      if (sessionStorage.getItem("gi_open_chat_after_auth") === "1") {
        sessionStorage.removeItem("gi_open_chat_after_auth");
        setOpen(true);
      }
    } catch { /* ignore */ }
  }, [isAuthed]);

  const firstName = user?.name?.split(" ")[0] || "there";

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

          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !isAuthed ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-semibold">Sign in required</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Please sign in or create an account to chat with our support team.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2">
                <Button onClick={() => goAuth("signin")} className="bg-gold-gradient text-gold-foreground">
                  <LogIn className="mr-2 h-4 w-4" /> Sign In
                </Button>
                <Button onClick={() => goAuth("signup")} variant="outline">
                  <UserPlus className="mr-2 h-4 w-4" /> Create Account
                </Button>
              </div>
            </div>
          ) : !conversationId ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                {msgs.length === 0 && (
                  <div className="rounded-xl rounded-bl-sm bg-secondary px-3 py-2 text-sm">
                    Hi {firstName}! How can we help today?
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
