"use client";

import { useEffect, useState } from "react";
import type { StaticPageKey } from "@/types/admin";

export type AdminTab = StaticPageKey | "contests";

function isAdminTab(value: string | null): value is AdminTab {
  return value === "contests" || value === "dashboard" || value === "deposits" || value === "verification" || value === "contracts" || value === "rejected" || value === "risks" || value === "users" || value === "wallets" || value === "withdrawals" || value === "transactions" || value === "health" || value === "settings";
}

export function useUrlTab() {
  const [activePage, setActivePage] = useState<AdminTab>("contests");

  useEffect(() => {
    const restoreTab = () => {
      const requestedTab = new URLSearchParams(window.location.search).get("tab");
      setActivePage(isAdminTab(requestedTab) ? requestedTab : "contests");
    };
    restoreTab();
    window.addEventListener("popstate", restoreTab);
    return () => window.removeEventListener("popstate", restoreTab);
  }, []);

  const navigateTo = (page: AdminTab) => {
    setActivePage(page);
    const url = new URL(window.location.href);
    if (page === "contests") url.searchParams.delete("tab");
    else url.searchParams.set("tab", page);
    window.history.pushState({}, "", url);
  };

  return { activePage, navigateTo };
}
