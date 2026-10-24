"use client";

import { useEffect, useState } from "react";
import type { StaticPageKey } from "@/types/admin";

export type AdminTab = StaticPageKey | "contests";

function isAdminTab(value: string | null): value is AdminTab {
  return value === "contests" || value === "dashboard" || value === "deposits" || value === "verification" || value === "contracts" || value === "rejected" || value === "risks" || value === "users" || value === "wallets" || value === "withdrawals" || value === "transactions" || value === "health" || value === "settings";
}

export function useUrlTab() {
  const [activePage, setActivePage] = useState<AdminTab>("contests");
  const [contestId, setContestId] = useState<string | null>(null);

  useEffect(() => {
    const restoreTab = () => {
      const requestedTab = new URLSearchParams(window.location.search).get("tab");
      const requestedContest = new URLSearchParams(window.location.search).get("contest");
      setActivePage(isAdminTab(requestedTab) ? requestedTab : "contests");
      setContestId(requestedContest || null);
    };
    restoreTab();
    window.addEventListener("popstate", restoreTab);
    return () => window.removeEventListener("popstate", restoreTab);
  }, []);

  const navigateTo = (page: AdminTab) => {
    setActivePage(page);
    setContestId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("contest");
    if (page === "contests") url.searchParams.delete("tab");
    else url.searchParams.set("tab", page);
    window.history.pushState({}, "", url);
  };

  const openContest = (publicId: string) => {
    setActivePage("contests");
    setContestId(publicId);
    const url = new URL(window.location.href);
    url.searchParams.delete("tab");
    url.searchParams.set("contest", publicId);
    window.history.pushState({}, "", url);
  };

  const closeContest = () => navigateTo("contests");

  return { activePage, contestId, navigateTo, openContest, closeContest };
}
