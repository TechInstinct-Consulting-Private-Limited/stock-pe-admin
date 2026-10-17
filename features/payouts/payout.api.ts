import type { DemoPayout } from "@/types/admin";
import type { ApiRequest } from "@/services/api-client";

export function listDemoPayouts(request: ApiRequest) {
  return request<{ payouts?: DemoPayout[] }>("/admin/demo-payouts");
}

export function createDemoPayout(request: ApiRequest, contestId: string, entryId: string, amountUsdt: number) {
  return request(`/admin/contests/${contestId}/demo-payouts`, { method: "POST", body: JSON.stringify({ entryId, amountUsdt, note: "Review-only test payout" }) });
}

export function updateDemoPayout(request: ApiRequest, payoutId: string, action: "approve" | "complete" | "reject") {
  return request(`/admin/demo-payouts/${payoutId}/${action}`, { method: "POST", body: JSON.stringify({ note: action === "reject" ? "Rejected from Admin Console" : "Admin test action" }) });
}
