import type { ApiRequest } from "@/services/api-client";

export type Administrator = {
  user_id: string;
  mobile: string;
  role: "SUPER_ADMIN" | "OPERATIONS_ADMIN";
  created_at: string;
  updated_at: string;
};

export function listAdministrators(request: ApiRequest) {
  return request<{ administrators: Administrator[] }>("/admin/access/administrators");
}

export function grantAdministrator(request: ApiRequest, mobile: string, role: Administrator["role"]) {
  return request<{ administrator: Administrator }>("/admin/access/administrators", {
    method: "POST",
    body: JSON.stringify({ mobile, role }),
  });
}

export function updateAdministratorRole(request: ApiRequest, userId: string, role: Administrator["role"]) {
  return request<{ administrator: Administrator }>(`/admin/access/administrators/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
}

export function revokeAdministrator(request: ApiRequest, userId: string) {
  return request<{ administrator: Administrator }>(`/admin/access/administrators/${encodeURIComponent(userId)}`, { method: "DELETE" });
}
