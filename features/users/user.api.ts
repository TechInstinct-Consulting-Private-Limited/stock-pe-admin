import type { AdminUser } from "@/types/admin";
import type { ApiRequest } from "@/services/api-client";

export function listAdminUsers(request: ApiRequest, query = "") {
  const normalizedQuery = query.trim();
  const suffix = normalizedQuery.length >= 2 ? `?query=${encodeURIComponent(normalizedQuery)}` : "";
  return request<{ users?: AdminUser[] }>(`/admin/users${suffix}`);
}
