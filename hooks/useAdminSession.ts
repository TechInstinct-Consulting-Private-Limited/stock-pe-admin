"use client";

import { useCallback, useEffect, useState } from "react";

const TOKEN_KEY = "marketpe_admin_token";
const REFRESH_TOKEN_KEY = "marketpe_admin_refresh_token";
const API_BASE_KEY = "marketpe_admin_api_base";

export function useAdminSession(defaultApiBase: string) {
  const [mounted, setMounted] = useState(false);
  const [apiBase, setApiBase] = useState(defaultApiBase);
  const [token, setToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");

  useEffect(() => {
    setMounted(true);
    const savedToken = sessionStorage.getItem(TOKEN_KEY);
    const savedRefreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    const savedApiBase = sessionStorage.getItem(API_BASE_KEY);
    if (savedToken) setToken(savedToken);
    if (savedRefreshToken) setRefreshToken(savedRefreshToken);
    if (savedApiBase) setApiBase(savedApiBase);
  }, []);

  const beginSession = useCallback((nextToken: string, nextRefreshToken = "") => {
    sessionStorage.setItem(TOKEN_KEY, nextToken);
    if (nextRefreshToken) sessionStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
    sessionStorage.setItem(API_BASE_KEY, apiBase);
    setToken(nextToken);
    if (nextRefreshToken) setRefreshToken(nextRefreshToken);
  }, [apiBase]);

  const endSession = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    setToken("");
    setRefreshToken("");
  }, []);

  const renewSession = useCallback(async () => {
    if (!refreshToken) return null;
    try {
      const response = await fetch(`${apiBase.replace(/\/$/, "")}/auth/admin/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.token) {
        endSession();
        return null;
      }
      beginSession(data.token, data.refreshToken);
      return data.token as string;
    } catch {
      return null;
    }
  }, [apiBase, beginSession, endSession, refreshToken]);

  return { mounted, apiBase, setApiBase, token, beginSession, endSession, renewSession };
}
