import type { ApiRequest } from "@/services/api-client";

export type AdminDashboardOverview = {
  generatedAt: string;
  users: { total: number; newToday: number; mobileVerified: number; kycVerified: number; kycPending: number; kycFailed: number };
  wallets: { linked: number; demoAccounts: number; demoAvailable: string; demoReserved: string; currency: "DEMO_USDT" };
  contests: { total: number; soon: number; open: number; live: number; closed: number; settledToday: number; participants: number; activeParticipants: number; scheduledPrizePool: string };
  notifications: { total: number; unread: number; last24Hours: number; failedDeliveries: number };
  market: { provider: string; instrumentCount: number; lastSnapshotAt: string | null };
  upcomingContests: { public_id: string; title: string; status: string; opens_at: string | null; live_at: string | null; closes_at: string; player_count: number; player_capacity: number; instrument_name: string }[];
  recentActivity: { occurred_at: string; category: string; title: string; detail: string | null }[];
};

export function getAdminDashboardOverview(request: ApiRequest) {
  return request<{ overview: AdminDashboardOverview }>("/admin/dashboard/overview");
}
