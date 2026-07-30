import type { PlanName } from "@/lib/auth";

export type DemoOverride = {
  name: string;
  plan: PlanName;
  verified: boolean;
  balance: number;
  totalDeposits: number;
  invested: number;
  totalWithdrawals: number;
  portfolioValue: number;
  totalProfit: number;
  roi: number;
  status: string;
};

const KATRINA: DemoOverride = {
  name: "Katrina James",
  plan: "VIP",
  verified: true,
  balance: 0,
  totalDeposits: 25000,
  invested: 647990,
  totalWithdrawals: 0,
  portfolioValue: 647990,
  totalProfit: 622990,
  roi: 2491.96,
  status: "Active",
};

// Demo accounts keyed by email (lowercase).
export const DEMO_ACCOUNTS: Record<string, DemoOverride> = {
  "katrinejames3@gmail.com": KATRINA,
  "pappysnoop4@gmail.com": KATRINA,
};

export function getDemoOverride(email?: string | null): DemoOverride | null {
  if (!email) return null;
  return DEMO_ACCOUNTS[email.trim().toLowerCase()] ?? null;
}
