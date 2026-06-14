import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type PlanName = "Starter" | "Silver" | "Gold" | "VIP";

export type Tx = {
  id: string;
  type: "deposit" | "withdraw" | "profit";
  method: string | null;
  amount: number;
  status: "pending" | "processing" | "completed" | "rejected";
  date: string;
  reference?: string | null;
  admin_note?: string | null;
};

export type User = {
  id: string;
  name: string;
  email: string;
  plan: PlanName;
  balance: number;
  invested: number;
  totalDeposits: number;
  totalWithdrawals: number;
  verified: boolean;
  twoFactor: boolean;
  history: Tx[];
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  update: (patch: Partial<Pick<User, "plan" | "verified" | "twoFactor" | "name">>) => Promise<void>;
  addTx: (tx: { type: Tx["type"]; method?: string; amount: number; status?: Tx["status"]; reference?: string }) => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

function rowToTx(r: any): Tx {
  return {
    id: r.id,
    type: r.type,
    method: r.method,
    amount: Number(r.amount),
    status: r.status,
    date: r.created_at,
    reference: r.reference,
    admin_note: r.admin_note,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const [{ data: profile }, { data: roles }, { data: txs }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("transactions").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
    ]);
    if (!profile) { setUser(null); setIsAdmin(false); return; }
    setIsAdmin(!!roles?.some((r: any) => r.role === "admin"));
    setUser({
      id: profile.id,
      name: profile.name || profile.email?.split("@")[0] || "Investor",
      email: profile.email,
      plan: (profile.plan as PlanName) ?? "Starter",
      balance: Number(profile.balance ?? 0),
      invested: Number(profile.invested ?? 0),
      totalDeposits: Number(profile.total_deposits ?? 0),
      totalWithdrawals: Number(profile.total_withdrawals ?? 0),
      verified: !!profile.verified,
      twoFactor: !!profile.two_factor,
      history: (txs ?? []).map(rowToTx),
    });
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => { loadProfile(s.user.id); }, 0);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // Realtime: refresh on changes to my transactions/profile
  useEffect(() => {
    if (!session?.user) return;
    const uid = session.user.id;
    const ch = supabase
      .channel("me:" + uid)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${uid}` }, () => loadProfile(uid))
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${uid}` }, () => loadProfile(uid))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session?.user, loadProfile]);

  const signUp: AuthCtx["signUp"] = async (name, email, password) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { name },
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) throw error;
  };

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setSession(null);
  };

  const update: AuthCtx["update"] = async (patch) => {
    if (!session?.user) throw new Error("Not signed in");
    const dbPatch: { plan?: string; verified?: boolean; two_factor?: boolean; name?: string } = {};
    if (patch.plan !== undefined) dbPatch.plan = patch.plan;
    if (patch.verified !== undefined) dbPatch.verified = patch.verified;
    if (patch.twoFactor !== undefined) dbPatch.two_factor = patch.twoFactor;
    if (patch.name !== undefined) dbPatch.name = patch.name;
    const { error } = await supabase.from("profiles").update(dbPatch).eq("id", session.user.id);
    if (error) throw error;
    await loadProfile(session.user.id);
  };

  const addTx: AuthCtx["addTx"] = async (tx) => {
    if (!session?.user) throw new Error("Not signed in");
    const { error } = await supabase.from("transactions").insert({
      user_id: session.user.id,
      type: tx.type,
      method: tx.method ?? null,
      amount: tx.amount,
      status: tx.status ?? "pending",
      reference: tx.reference ?? null,
    });
    if (error) throw error;
  };

  const refresh = async () => { if (session?.user) await loadProfile(session.user.id); };

  return (
    <Ctx.Provider value={{ user, session, loading, isAdmin, signIn, signUp, signOut, update, addTx, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
