import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const TOKEN_KEY = "gi_chat_visitor_token";
const CONV_KEY = "gi_chat_conversation_id";
const IDENTITY_KEY = "gi_chat_identity";

export type ChatIdentity = { name: string; email: string };

export function getVisitorToken(): string {
  if (typeof window === "undefined") return "";
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

export function getSavedConversationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CONV_KEY);
}
export function saveConversationId(id: string) {
  if (typeof window !== "undefined") localStorage.setItem(CONV_KEY, id);
}
export function clearConversation() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CONV_KEY);
}
export function getSavedIdentity(): ChatIdentity | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(IDENTITY_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as ChatIdentity; } catch { return null; }
}
export function saveIdentity(id: ChatIdentity) {
  if (typeof window !== "undefined") localStorage.setItem(IDENTITY_KEY, JSON.stringify(id));
}

/** Supabase client that sends the visitor token header so RLS lets anon
 *  visitors reach their own conversation. */
export function createVisitorClient(token: string) {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { headers: { "x-visitor-token": token } },
    realtime: { params: { headers: { "x-visitor-token": token } } as unknown as Record<string, string> },
  });
}

/** Business-hours support presence: Mon–Fri, 09:00–18:00 local. */
export function isSupportOnline(now: Date = new Date()): boolean {
  const day = now.getDay(); // 0 Sun .. 6 Sat
  if (day === 0 || day === 6) return false;
  const h = now.getHours();
  return h >= 9 && h < 18;
}

/** Short pleasant chime via WebAudio — no asset needed. */
export function playChime() {
  if (typeof window === "undefined") return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const now = ctx.currentTime;
    const play = (freq: number, start: number, dur: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, now + start);
      g.gain.exponentialRampToValueAtTime(0.25, now + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      o.connect(g).connect(ctx.destination);
      o.start(now + start);
      o.stop(now + start + dur + 0.05);
    };
    play(880, 0, 0.15);
    play(1320, 0.12, 0.2);
    setTimeout(() => ctx.close(), 600);
  } catch {
    // ignore
  }
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
