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
  totalDeposits: 35000,
  invested: 657990,
  totalWithdrawals: 0,
  portfolioValue: 657990,
  totalProfit: 622990,
  roi: 1779.97,
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
