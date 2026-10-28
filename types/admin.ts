export type Contest = {
  public_id: string;
  title: string;
  question: string;
  status: string;
  is_demo_usdt?: boolean;
  entry_credits: number;
  prize_pool_credits: number;
  player_capacity: number;
  player_count: number;
  lifecycle_mode?: string;
  opens_at?: string | null;
  live_at?: string | null;
  closes_at: string;
};

export type ContestDraft = {
  publicId: string;
  title: string;
  question: string;
  instrumentCode: string;
  entryCredits: string;
  prizePoolCredits: string;
  playerCapacity: string;
  lifecycleMode: string;
  opensAt: string;
  liveAt: string;
  closesAt: string;
  settlementSource: string;
};

export type WinnerEntry = { id: string; mobile: string; status: string; reward_credits: number };

export type DemoPayout = {
  id: string;
  title: string;
  mobile: string;
  wallet_address: string;
  amount_usdt: string;
  status: string;
  created_at: string;
  simulated_tx_hash?: string | null;
};

export type AdminUser = {
  id: string;
  mobile: string;
  mobileVerified: boolean;
  displayName: string | null;
  kycStatus: string;
  kycVerifiedAt: string | null;
  wallet: { network: string; address: string } | null;
  demoUsdt?: { available: string; reserved: string } | null;
  adminRole: string | null;
  joinedAt: string;
};

export type StaticPageKey = "dashboard" | "deposits" | "verification" | "contracts" | "rejected" | "risks" | "users" | "wallets" | "withdrawals" | "transactions" | "health" | "settings" | "notifications";

export const contestStatuses = ["ALL", "DRAFT", "SOON", "OPEN", "LIVE", "CLOSED", "SETTLED", "CANCELLED"];

export const nextContestStatus: Record<string, string | undefined> = {
  DRAFT: "SOON",
  SOON: "OPEN",
  OPEN: "LIVE",
  LIVE: "CLOSED",
};
