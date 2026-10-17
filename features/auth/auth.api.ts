import type { ApiRequest } from "@/services/api-client";

export function requestAdminOtp(request: ApiRequest, mobile: string, password: string) {
  return request("/auth/signin", { method: "POST", body: JSON.stringify({ mobile, password }) });
}

export function verifyAdminOtp(request: ApiRequest, mobile: string, otp: string) {
  return request<{ token: string }>("/auth/verify-otp", { method: "POST", body: JSON.stringify({ mobile, otp, purpose: "signin" }) });
}
