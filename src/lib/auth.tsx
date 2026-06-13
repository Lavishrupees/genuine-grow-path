import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Tx = {
  id: string;
  type: "deposit" | "withdraw" | "profit";
  method?: string;
  amount: number;
  status: "completed" | "pending" | "processing";
  date: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  plan: "Starter" | "Silver" | "Gold" | "VIP";
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
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (name: string, email: string, password: string) => Promise<User>;
  signOut: () => void;
  update: (patch: Partial<User>) => void;
  addTx: (tx: Omit<Tx, "id" | "date"> & { date?: string }) => void;
};

const Ctx = createContext<AuthCtx | null>(null);
const KEY = "gi_user_v2";
const USERS_KEY = "gi_users_v2";

function loadUsers(): Record<string, { password: string; user: User }> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "{}"); } catch { return {}; }
}
function saveUsers(u: Record<string, { password: string; user: User }>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(u));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem(KEY, JSON.stringify(u));
    else localStorage.removeItem(KEY);
  };

  const writeUser = (next: User) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    const users = loadUsers();
    const k = next.email.toLowerCase();
    if (users[k]) { users[k].user = next; saveUsers(users); }
  };

  const signUp: AuthCtx["signUp"] = async (name, email, password) => {
    const users = loadUsers();
    const key = email.toLowerCase();
    if (users[key]) throw new Error("Account already exists");
    const u: User = {
      id: crypto.randomUUID(),
      name, email,
      plan: "Starter",
      balance: 0,
      invested: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      verified: false,
      twoFactor: false,
      history: [],
    };
    users[key] = { password, user: u };
    saveUsers(users);
    persist(u);
    return u;
  };

  const signIn: AuthCtx["signIn"] = async (email, password) => {
    const users = loadUsers();
    const rec = users[email.toLowerCase()];
    if (!rec || rec.password !== password) throw new Error("Invalid credentials");
    persist(rec.user);
    return rec.user;
  };

  const signOut = () => persist(null);

  const update: AuthCtx["update"] = (patch) => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      writeUser(next);
      return next;
    });
  };

  const addTx: AuthCtx["addTx"] = (tx) => {
    setUser(prev => {
      if (!prev) return prev;
      const entry: Tx = {
        id: crypto.randomUUID(),
        date: tx.date ?? new Date().toISOString(),
        type: tx.type,
        method: tx.method,
        amount: tx.amount,
        status: tx.status,
      };
      const next = { ...prev, history: [entry, ...prev.history].slice(0, 50) };
      writeUser(next);
      return next;
    });
  };

  return <Ctx.Provider value={{ user, signIn, signUp, signOut, update, addTx }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
