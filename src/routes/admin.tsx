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
          <TabsTrigger value="chat">Support chats</TabsTrigger>
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
          <ChatPanel users={users} chats={chats} onSent={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChatPanel({ users, chats, onSent }: { users: ProfileRow[]; chats: ChatRow[]; onSent: () => void }) {
  const userIds = Array.from(new Set(chats.map(c => c.user_id)));
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  useEffect(() => { if (!selected && userIds[0]) setSelected(userIds[0]); }, [userIds, selected]);
  const thread = selected ? chats.filter(c => c.user_id === selected).slice().reverse() : [];

  const send = async () => {
    if (!selected || !reply.trim()) return;
    const { error } = await supabase.from("chat_messages").insert({ user_id: selected, sender: "agent", body: reply.trim().slice(0, 2000) });
    if (error) toast.error(error.message); else { setReply(""); onSent(); }
  };

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <Card className="max-h-[28rem] overflow-y-auto p-2">
        {userIds.length === 0 && <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>}
        {userIds.map(uid => {
          const u = users.find(x => x.id === uid);
          const last = chats.find(c => c.user_id === uid);
          return (
            <button key={uid} onClick={() => setSelected(uid)} className={`w-full rounded-md p-2 text-left text-sm ${selected === uid ? "bg-secondary" : "hover:bg-secondary/60"}`}>
              <div className="font-semibold">{u?.name ?? uid.slice(0, 8)}</div>
              <div className="truncate text-xs text-muted-foreground">{last?.body}</div>
            </button>
          );
        })}
      </Card>
      <Card className="flex h-[28rem] flex-col p-0">
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {thread.map(m => (
            <div key={m.id} className={m.sender === "agent" ? "ml-auto max-w-[80%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground" : "max-w-[80%] rounded-xl rounded-bl-sm bg-secondary px-3 py-2 text-sm"}>
              {m.body}
            </div>
          ))}
          {selected && thread.length === 0 && <p className="text-sm text-muted-foreground">No messages in this conversation.</p>}
        </div>
        {selected && (
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-border p-2">
            <Input value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply as support…" maxLength={2000} />
            <Button type="submit" size="icon" className="bg-gold-gradient text-gold-foreground"><Send className="h-4 w-4" /></Button>
          </form>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-2xl font-bold">{value}</div>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary"><Icon className="h-4 w-4" /></span>
      </div>
    </Card>
  );
}
