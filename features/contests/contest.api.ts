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

export function updateContestStatus(request: ApiRequest, publicId: string, status: string) {
  return request(`/admin/contests/${publicId}/status`, { method: "PUT", body: JSON.stringify({ status }) });
}

export function settleContest(request: ApiRequest, publicId: string, closingValue: number) {
  return request<{ contest: { winnerCount: number } }>(`/admin/contests/${publicId}/settle`, { method: "POST", body: JSON.stringify({ closingValue, settlementNotes: "Settled from Admin Console" }) });
}

export function listContestEntries(request: ApiRequest, publicId: string) {
  return request<{ entries?: WinnerEntry[] }>(`/admin/contests/${publicId}/entries`);
}
