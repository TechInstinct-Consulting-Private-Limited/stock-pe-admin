"use client";

import { useEffect, useState } from "react";
import type { StaticPageKey } from "@/types/admin";

export type AdminTab = StaticPageKey | "contests";

function isAdminTab(value: string | null): value is AdminTab {
  return value === "contests" || value === "dashboard" || value === "deposits" || value === "verification" || value === "contracts" || value === "rejected" || value === "risks" || value === "users" || value === "wallets" || value === "withdrawals" || value === "transactions" || value === "health" || value === "settings" || value === "notifications";
}

export function useUrlTab() {
  const [activePage, setActivePage] = useState<AdminTab>("contests");
  const [contestId, setContestId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const restoreTab = () => {
      const requestedTab = new URLSearchParams(window.location.search).get("tab");
      const requestedContest = new URLSearchParams(window.location.search).get("contest");
      const requestedUser = new URLSearchParams(window.location.search).get("user");
      setActivePage(isAdminTab(requestedTab) ? requestedTab : "contests");
      setContestId(requestedContest || null);
      setUserId(requestedUser || null);
    };
    restoreTab();
    window.addEventListener("popstate", restoreTab);
    return () => window.removeEventListener("popstate", restoreTab);
  }, []);

  const navigateTo = (page: AdminTab) => {
    setActivePage(page);
    setContestId(null);
    setUserId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("contest");
    url.searchParams.delete("user");
    if (page === "contests") url.searchParams.delete("tab");
    else url.searchParams.set("tab", page);
    window.history.pushState({}, "", url);
  };

  const openContest = (publicId: string) => {
    setActivePage("contests");
    setContestId(publicId);
    setUserId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("tab");
    url.searchParams.set("contest", publicId);
    window.history.pushState({}, "", url);
  };

  const closeContest = () => navigateTo("contests");

  const openUser = (id: string) => {
    setActivePage("users");
    setContestId(null);
    setUserId(id);
    const url = new URL(window.location.href);
    url.searchParams.delete("contest");
    url.searchParams.set("tab", "users");
    url.searchParams.set("user", id);
    window.history.pushState({}, "", url);
  };

  const closeUser = () => navigateTo("users");

  return { activePage, contestId, userId, navigateTo, openContest, closeContest, openUser, closeUser };
}
