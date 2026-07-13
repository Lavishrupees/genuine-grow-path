import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, Users as UsersIcon, Receipt, MessageSquare, Send, Search, CheckCircle2, RotateCcw, CheckCheck, Check } from "lucide-react";
import { playChime, isSupportOnline, formatTime } from "@/lib/chat-support";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Genuine Investment" }] }),
  component: AdminPage,
});

type ProfileRow = {
  id: string; name: string; email: string; plan: string;
  balance: number; invested: number; total_deposits: number; total_withdrawals: number;
  verified: boolean; two_factor: boolean; created_at: string;
};
type TxRow = {
  id: string; user_id: string; type: string; method: string | null;
  amount: number; status: string; reference: string | null; created_at: string;
};
type Conversation = {
  id: string; user_id: string | null; visitor_name: string; visitor_email: string;
  status: "open" | "resolved"; is_offline: boolean;
  last_message_at: string; last_message_preview: string | null;
  unread_admin: number; unread_user: number; created_at: string;
};
type ChatMsg = {
  id: string; conversation_id: string; sender: "user" | "agent" | "system";
  body: string; created_at: string; delivered_at: string | null; seen_at: string | null;
};

function AdminPage() {
  const { isAdmin, loading, session } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/auth" });
    else if (!isAdmin) navigate({ to: "/dashboard" });
  }, [loading, session, isAdmin, navigate]);

  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const load = useCallback(async () => {
    const [u, t, c] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("chat_conversations").select("*").order("last_message_at", { ascending: false }).limit(500),
    ]);
    setUsers((u.data ?? []) as ProfileRow[]);
    setTxs((t.data ?? []) as TxRow[]);
    setConversations((c.data ?? []) as Conversation[]);
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const unreadTotal = useMemo(
    () => conversations.reduce((a, c) => a + (c.unread_admin ?? 0), 0),
    [conversations],
  );
  const prevUnreadRef = useRef(0);
  useEffect(() => {
    if (unreadTotal > prevUnreadRef.current) playChime();
    prevUnreadRef.current = unreadTotal;
  }, [unreadTotal]);

  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase.channel("admin-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin, load]);

  if (!isAdmin) return null;

  const approveTx = async (tx: TxRow) => {
    const profile = users.find(u => u.id === tx.user_id);
    if (!profile) { toast.error("User not found"); return; }
    let updates: Partial<ProfileRow> = {};
    if (tx.type === "deposit") {
      updates = {
        balance: Number(profile.balance) + Number(tx.amount),
        invested: Number(profile.invested) + Number(tx.amount),
        total_deposits: Number(profile.total_deposits) + Number(tx.amount),
      };
    } else if (tx.type === "withdraw") {
      if (Number(profile.balance) < Number(tx.amount)) { toast.error("User balance insufficient"); return; }
      updates = {
        balance: Number(profile.balance) - Number(tx.amount),
        total_withdrawals: Number(profile.total_withdrawals) + Number(tx.amount),
      };
    }
    const { error: pErr } = await supabase.from("profiles").update(updates).eq("id", tx.user_id);
    if (pErr) { toast.error(pErr.message); return; }
    const { error: tErr } = await supabase.from("transactions").update({ status: "completed" }).eq("id", tx.id);
    if (tErr) { toast.error(tErr.message); return; }
    toast.success("Approved & balance updated");
    load();
  };

  const rejectTx = async (tx: TxRow) => {
    const { error } = await supabase.from("transactions").update({ status: "rejected" }).eq("id", tx.id);
    if (error) toast.error(error.message); else { toast.success("Rejected"); load(); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-navy-gradient text-gold"><ShieldCheck className="h-5 w-5" /></span>
        <div>
          <h1 className="font-display text-3xl font-bold">Admin dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage users, transactions and support chats.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Total users" value={users.length} icon={UsersIcon} />
        <Stat label="Pending deposits" value={txs.filter(t => t.type === "deposit" && t.status === "pending").length} icon={Receipt} />
        <Stat label="Pending withdrawals" value={txs.filter(t => t.type === "withdraw" && t.status === "pending").length} icon={Receipt} />
        <Stat label="Chats today" value={conversations.filter(c => new Date(c.created_at).toDateString() === new Date().toDateString()).length} icon={MessageSquare} badge={unreadTotal} />
      </div>

      <Tabs defaultValue="transactions" className="mt-8">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="chat" className="relative">
            Support chats
            {unreadTotal > 0 && (
              <Badge className="ml-2 h-5 min-w-5 bg-destructive px-1.5 text-xs text-destructive-foreground">{unreadTotal}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-3">Date</th><th>User</th><th>Type</th><th>Method</th><th>Amount</th><th>Reference</th><th>Status</th><th className="pr-3 text-right">Action</th></tr>
              </thead>
              <tbody>
                {txs.map(t => {
                  const u = users.find(x => x.id === t.user_id);
                  return (
                    <tr key={t.id} className="border-t border-border">
                      <td className="p-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                      <td className="text-xs"><div className="font-semibold">{u?.name ?? "?"}</div><div className="text-muted-foreground">{u?.email}</div></td>
                      <td className="capitalize">{t.type}</td>
                      <td className="text-xs">{t.method}</td>
                      <td className={`font-semibold ${t.type === "withdraw" ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>{t.type === "withdraw" ? "-" : "+"}${Number(t.amount).toLocaleString()}</td>
                      <td className="text-xs font-mono">{t.reference}</td>
                      <td><span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${t.status === "completed" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : t.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>{t.status}</span></td>
                      <td className="pr-3 text-right">
                        {t.status === "pending" || t.status === "processing" ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => approveTx(t)} className="bg-gold-gradient text-gold-foreground h-7 px-2 text-xs">Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => rejectTx(t)} className="h-7 px-2 text-xs">Reject</Button>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {txs.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">No transactions yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-3">Joined</th><th>Name</th><th>Email</th><th>Plan</th><th>Balance</th><th>Deposits</th><th>Withdrawals</th><th className="pr-3">Status</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="p-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="font-semibold">{u.name}</td>
                    <td className="text-xs">{u.email}</td>
                    <td>{u.plan}</td>
                    <td className="font-semibold">${Number(u.balance).toLocaleString()}</td>
                    <td className="text-emerald-600 dark:text-emerald-400">${Number(u.total_deposits).toLocaleString()}</td>
                    <td className="text-destructive">${Number(u.total_withdrawals).toLocaleString()}</td>
                    <td className="pr-3 text-xs">
                      {u.verified && <span className="mr-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">KYC</span>}
                      {u.two_factor && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold-foreground">2FA</span>}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">No users yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <ChatPanel conversations={conversations} onChanged={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChatPanel({ conversations, onChanged }: { conversations: Conversation[]; onChanged: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [reply, setReply] = useState("");
  const [visitorTyping, setVisitorTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations
      .filter((c) => showResolved || c.status === "open")
      .filter((c) => !q ||
        c.visitor_name.toLowerCase().includes(q) ||
        c.visitor_email.toLowerCase().includes(q) ||
        (c.last_message_preview ?? "").toLowerCase().includes(q));
  }, [conversations, query, showResolved]);

  useEffect(() => {
    if (!selected && filtered[0]) setSelected(filtered[0].id);
  }, [filtered, selected]);

  // Load thread & subscribe
  useEffect(() => {
    if (!selected) { setMessages([]); return; }
    let cancelled = false;
    supabase.from("chat_messages").select("*").eq("conversation_id", selected).order("created_at")
      .then(({ data }) => { if (!cancelled) setMessages((data ?? []) as ChatMsg[]); });
    const ch = supabase
      .channel(`admin-chat:${selected}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${selected}` },
        (payload) => setMessages((prev) => {
          const m = payload.new as ChatMsg;
          return prev.some(x => x.id === m.id) ? prev : [...prev, m];
        }))
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${selected}` },
        (payload) => {
          const m = payload.new as ChatMsg;
          setMessages(prev => prev.map(x => x.id === m.id ? m : x));
        })
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.from === "user") {
          setVisitorTyping(true);
          if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = window.setTimeout(() => setVisitorTyping(false), 3000);
        }
      })
      .subscribe();
    // mark read
    supabase.rpc("chat_mark_read_admin", { _cid: selected });
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [selected]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, visitorTyping]);

  const active = conversations.find((c) => c.id === selected);

  const send = async () => {
    if (!selected || !reply.trim()) return;
    const body = reply.trim().slice(0, 2000);
    setReply("");
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: selected,
      sender: "agent",
      body,
      delivered_at: new Date().toISOString(),
    });
    if (error) { setReply(body); toast.error(error.message); }
  };

  const onTyping = () => {
    if (!selected) return;
    supabase.channel(`admin-chat:${selected}`).send({ type: "broadcast", event: "typing", payload: { from: "agent" } });
  };

  const toggleResolved = async () => {
    if (!active) return;
    const next = active.status === "resolved" ? "open" : "resolved";
    const { error } = await supabase.rpc("chat_set_status", { _cid: active.id, _status: next });
    if (error) toast.error(error.message);
    else { toast.success(next === "resolved" ? "Marked resolved" : "Reopened"); onChanged(); }
  };

  const supportOnline = isSupportOnline();

  return (
    <div className="grid gap-4 md:grid-cols-[300px_1fr]">
      <Card className="flex max-h-[32rem] flex-col p-2">
        <div className="flex items-center gap-2 border-b border-border p-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="h-8 pl-7 text-xs" />
          </div>
          <Button size="sm" variant={showResolved ? "default" : "outline"} onClick={() => setShowResolved(v => !v)} className="h-8 px-2 text-xs">
            {showResolved ? "All" : "Open"}
          </Button>
        </div>
        <div className="mt-1 flex items-center gap-1.5 px-2 pb-1 text-[10px] text-muted-foreground">
          <span className={`h-1.5 w-1.5 rounded-full ${supportOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
          Support hours: Mon–Fri 09:00–18:00
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && <p className="p-4 text-sm text-muted-foreground">No conversations.</p>}
          {filtered.map((c) => {
            const online = !!c.user_id; // signed-in users treated as "reachable"
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`w-full rounded-md p-2 text-left text-sm ${selected === c.id ? "bg-secondary" : "hover:bg-secondary/60"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${online ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
                    <span className="truncate font-semibold">{c.visitor_name}</span>
                  </div>
                  {c.unread_admin > 0 && (
                    <Badge className="h-5 min-w-5 bg-destructive px-1.5 text-[10px] text-destructive-foreground">{c.unread_admin}</Badge>
                  )}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{c.visitor_email}</div>
                <div className="truncate text-xs text-muted-foreground">{c.last_message_preview ?? "New conversation"}</div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{new Date(c.last_message_at).toLocaleString()}</span>
                  {c.status === "resolved" && <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300">Resolved</span>}
                  {c.is_offline && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-300">Offline msg</span>}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="flex h-[32rem] flex-col p-0">
        {active ? (
          <>
            <div className="flex items-center justify-between border-b border-border p-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{active.visitor_name}</div>
                <div className="truncate text-xs text-muted-foreground">{active.visitor_email}</div>
              </div>
              <Button size="sm" variant="outline" onClick={toggleResolved} className="h-8 gap-1 text-xs">
                {active.status === "resolved" ? <><RotateCcw className="h-3.5 w-3.5" /> Reopen</> : <><CheckCircle2 className="h-3.5 w-3.5" /> Mark resolved</>}
              </Button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.map((m) => {
                if (m.sender === "system") {
                  return <div key={m.id} className="mx-auto max-w-[85%] rounded-lg bg-secondary/60 px-3 py-1.5 text-center text-xs text-muted-foreground">{m.body}</div>;
                }
                const mine = m.sender === "agent";
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
              {visitorTyping && (
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
                value={reply}
                onChange={(e) => { setReply(e.target.value); onTyping(); }}
                placeholder="Reply as support…"
                maxLength={2000}
              />
              <Button type="submit" size="icon" className="bg-gold-gradient text-gold-foreground"><Send className="h-4 w-4" /></Button>
            </form>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-6 text-sm text-muted-foreground">Select a conversation.</div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, icon: Icon, badge }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; badge?: number }) {
  return (
    <Card className="p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 flex items-center gap-2 font-display text-2xl font-bold">
            {value}
            {badge !== undefined && badge > 0 && (
              <Badge className="h-5 min-w-5 bg-destructive px-1.5 text-xs text-destructive-foreground">{badge} new</Badge>
            )}
          </div>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary"><Icon className="h-4 w-4" /></span>
      </div>
    </Card>
  );
}
