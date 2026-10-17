"use client";

import { useEffect, useState } from "react";

const TOKEN_KEY = "marketpe_admin_token";
const API_BASE_KEY = "marketpe_admin_api_base";

export function useAdminSession(defaultApiBase: string) {
  const [mounted, setMounted] = useState(false);
  const [apiBase, setApiBase] = useState(defaultApiBase);
  const [token, setToken] = useState("");

  useEffect(() => {
    setMounted(true);
    const savedToken = sessionStorage.getItem(TOKEN_KEY);
    const savedApiBase = sessionStorage.getItem(API_BASE_KEY);
    if (savedToken) setToken(savedToken);
    if (savedApiBase) setApiBase(savedApiBase);
  }, []);

  const beginSession = (nextToken: string) => {
    sessionStorage.setItem(TOKEN_KEY, nextToken);
    sessionStorage.setItem(API_BASE_KEY, apiBase);
    setToken(nextToken);
  };

  const endSession = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
  };

  return { mounted, apiBase, setApiBase, token, beginSession, endSession };
}
