import type { AdminUser } from "@/types/admin";
import type { ApiRequest } from "@/services/api-client";

export function listAdminUsers(request: ApiRequest, query = "") {
  const normalizedQuery = query.trim();
  const suffix = normalizedQuery.length >= 2 ? `?query=${encodeURIComponent(normalizedQuery)}` : "";
  return request<{ users?: AdminUser[] }>(`/admin/users${suffix}`);
}

export function listAdminWallets(request: ApiRequest, query = "") {
  const normalizedQuery = query.trim();
  const suffix = normalizedQuery.length >= 2 ? `?query=${encodeURIComponent(normalizedQuery)}` : "";
  return request<{ wallets?: AdminWalletDirectoryItem[] }>(`/admin/wallets${suffix}`);
}

export type AdminWalletDirectoryItem = {
  id: string; userId: string; mobile: string; displayName: string | null; kycStatus: string;
  network: string; address: string; linkedAt: string; providerAvailableUsdt: string;
  demoUsdt: { available: string; reserved: string } | null;
};

export function getAdminUserOverview(request: ApiRequest, userId: string) {
  return request<AdminUserOverview>(`/admin/users/${encodeURIComponent(userId)}/overview`);
}

export function getAdminUserWallet(request: ApiRequest, userId: string) {
  return request<AdminUserWallet>(`/admin/users/${encodeURIComponent(userId)}/wallet`);
}

export function getAdminUserContests(request: ApiRequest, userId: string) {
  return request<{ contests: AdminUserContest[] }>(`/admin/users/${encodeURIComponent(userId)}/contests`);
}

export function getAdminUserKyc(request: ApiRequest, userId: string) {
  return request<{ verifications: AdminUserKyc[] }>(`/admin/users/${encodeURIComponent(userId)}/kyc`);
}

export function getAdminUserNotifications(request: ApiRequest, userId: string) {
  return request<{ notifications: AdminUserNotification[] }>(`/admin/users/${encodeURIComponent(userId)}/notifications`);
}

export function getAdminUserActivity(request: ApiRequest, userId: string) {
  return request<{ activity: AdminUserActivity[] }>(`/admin/users/${encodeURIComponent(userId)}/activity`);
}

export type AdminUserOverview = {
  user: AdminUser & { kyc: { status: string; verifiedAt: string | null; provider: string | null; aadhaarLastFour: string | null }; wallet: { network: string; address: string; linkedAt: string | null } | null };
  contestStats: { total: number; active: number; won: number; lost: number; cancelled: number; tie_wins: number };
  demoRewardTotal: string;
  latestResult: { title: string; status: string; settled_at: string | null; prediction_value: string | null; public_id: string } | null;
};

export type AdminUserWallet = {
  wallet: { network: string; address: string; linkedAt: string | null } | null;
  demoUsdt: { available: string; reserved: string } | null;
  activity: { id: string; activity_type: string; amount: string; direction: "DEBIT" | "CREDIT"; created_at: string; title?: string | null; public_id?: string | null; entry_status?: string | null }[];
  providerLedger: { reference_type: string; reference_id: string; status: string; direction: string; amount_usdt: string; created_at: string }[];
};

export type AdminUserContest = { id: string; status: string; prediction_value: string | null; joined_at: string; settled_at: string | null; public_id: string; title: string; settlement_value: string | null; instrument_code: string; instrument_name: string; entryAmount: string | null; rewardAmount: string; tieWin: boolean };
export type AdminUserKyc = { status: string; provider: string | null; aadhaar_last_four: string | null; consent_given_at: string | null; verified_at: string | null; expires_at: string | null; created_at: string; updated_at: string };
export type AdminUserNotification = { id: string; type: string; title: string; message: string; priority: string; read_at: string | null; created_at: string; deep_link: string | null; delivery_count: number; sent_count: number; failed_count: number };
export type AdminUserActivity = { occurred_at: string; category: string; title: string; detail: string | null };
