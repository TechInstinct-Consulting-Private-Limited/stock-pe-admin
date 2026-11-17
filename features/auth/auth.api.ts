import type { ApiRequest } from "@/services/api-client";

export function loginAdmin(request: ApiRequest, mobile: string, password: string) {
  return request<{ token: string; refreshToken?: string; administrator?: { id: string; mobile: string; role: string } }>("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ mobile, password }),
  });
}
