import type { ApiRequest } from "@/services/api-client";
import type { Contest, ContestDraft, WinnerEntry } from "./contest.types";

export function listContests(request: ApiRequest, status: string) {
  return request<{ contests?: Contest[] }>(`/admin/contests?status=${status}`);
}

export function getContestDetails(request: ApiRequest, publicId: string) {
  return request(`/admin/contests/${encodeURIComponent(publicId)}/details`);
}

export function createContest(request: ApiRequest, contest: Omit<ContestDraft, "entryCredits" | "prizePoolCredits" | "playerCapacity"> & { status: "DRAFT" | "SOON"; currency: "DEMO_USDT"; entryCredits: number; prizePoolCredits: number; playerCapacity: number }) {
  return request("/admin/contests", { method: "POST", body: JSON.stringify(contest) });
}

export type BulkScheduleInput = {
  instrumentCode: string;
  startDate: string;
  tradingDays: number;
  opensTime: string;
  liveTime: string;
  closesTime: string;
  entryCredits: number;
  prizePoolCredits: number;
  playerCapacity: number;
  excludedDates: string[];
  currency: "DEMO_USDT";
  settlementSource: string;
};

export function createBulkScheduledContests(request: ApiRequest, input: BulkScheduleInput) {
  return request<{ schedule: { created: Array<{ publicId: string; date: string }>; skipped: Array<{ date: string; reason: string }> } }>("/admin/contests/bulk-schedule", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateContestStatus(request: ApiRequest, publicId: string, status: string) {
  return request(`/admin/contests/${publicId}/status`, { method: "PUT", body: JSON.stringify({ status }) });
}

export function settleContest(request: ApiRequest, publicId: string, closingValue: number) {
  return request<{ contest: { winnerCount: number } }>(`/admin/contests/${publicId}/settle`, { method: "POST", body: JSON.stringify({ closingValue, settlementNotes: "Settled from Admin Console" }) });
}

export function listContestEntries(request: ApiRequest, publicId: string) {
  return request<{ entries?: WinnerEntry[] }>(`/admin/contests/${publicId}/entries`);
}
