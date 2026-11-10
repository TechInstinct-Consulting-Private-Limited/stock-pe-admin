"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Bell, Clock3, CreditCard, RefreshCw, Trophy, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiRequest } from "@/services/api-client";
import { getAdminDashboardOverview, type AdminDashboardOverview } from "./dashboard.api";

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "Not available";
}

function statusTone(status: string) {
  return ({ SOON: "bg-amber-100 text-amber-800", OPEN: "bg-emerald-100 text-emerald-800", LIVE: "bg-rose-100 text-rose-700", CLOSED: "bg-indigo-100 text-indigo-800" }[status] || "bg-slate-100 text-slate-700");
}

export function DashboardOverviewPage({ request, onNavigate }: { request: ApiRequest; onNavigate: (page: "contests" | "users" | "wallets" | "notifications") => void }) {
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const response = await getAdminDashboardOverview(request);
      if (id === requestId.current) { setOverview(response.overview); setError(""); }
    } catch (reason) {
      if (id === requestId.current) setError(reason instanceof Error ? reason.message : "Dashboard data could not be loaded");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [request]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    const interval = window.setInterval(refresh, overview?.contests.live ? 15_000 : 30_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", refresh); };
  }, [load, overview?.contests.live]);

  const cards = overview ? [
    ["Registered users", overview.users.total, `+${overview.users.newToday} today`, <Users size={19} />, () => onNavigate("users")],
    ["KYC pending", overview.users.kycPending, `${overview.users.kycVerified} verified`, <UserCheck size={19} />, () => onNavigate("users")],
    ["Wallets linked", overview.wallets.linked, `${overview.wallets.demoAccounts} Demo USDT accounts`, <CreditCard size={19} />, () => onNavigate("wallets")],
    ["Active participants", overview.contests.activeParticipants, `${overview.contests.participants} total entries`, <Activity size={19} />, () => onNavigate("contests")],
  ] as const : [];

  return <>
    <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-7 sm:flex-row sm:items-start">
      <div><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-600">Overview / live operations</p><h1 className="mt-2 text-3xl font-black tracking-tight">Dashboard Overview</h1><p className="mt-2 text-sm text-slate-500">A live summary of the current staging environment. Demo USDT only.</p></div>
      <div className="flex items-center gap-3"><p className="text-right text-xs text-slate-500">Updated<br /><b className="text-slate-700">{formatDate(overview?.generatedAt)}</b></p><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh</Button></div>
    </header>
    {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, detail, icon, action]) => <button key={label} type="button" onClick={action} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow"><div className="flex justify-between"><p className="text-sm font-bold text-slate-500">{label}</p><span className="text-emerald-600">{icon}</span></div><p className="mt-4 text-3xl font-black">{value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p></button>)}</div>
    <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Summary label="Scheduled" value={overview?.contests.soon || 0} hint="Awaiting entry window" tone="amber" onClick={() => onNavigate("contests")} />
      <Summary label="Open" value={overview?.contests.open || 0} hint="Accepting predictions" tone="emerald" onClick={() => onNavigate("contests")} />
      <Summary label="Live" value={overview?.contests.live || 0} hint="Market outcome pending" tone="rose" onClick={() => onNavigate("contests")} />
      <Summary label="Needs settlement" value={overview?.contests.closed || 0} hint={`${overview?.contests.settledToday || 0} settled today`} tone="indigo" onClick={() => onNavigate("contests")} />
    </section>
    <section className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-black">Contest timeline</h2><p className="mt-1 text-sm text-slate-500">Current lifecycle positions and next scheduled action.</p></div><Button variant="outline" size="sm" onClick={() => onNavigate("contests")}>Open contests</Button></div><div className="divide-y divide-slate-100">{overview?.upcomingContests.map((contest) => <button type="button" key={contest.public_id} onClick={() => onNavigate("contests")} className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-slate-50"><div><p className="font-bold">{contest.title}</p><p className="mt-1 text-xs text-slate-500">{contest.instrument_name} · {contest.player_count}/{contest.player_capacity} players</p></div><div className="text-right"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusTone(contest.status)}`}>{contest.status}</span><p className="mt-2 text-xs text-slate-500">{contest.status === "SOON" ? `Opens ${formatDate(contest.opens_at)}` : contest.status === "OPEN" ? `Live ${formatDate(contest.live_at)}` : `Closes ${formatDate(contest.closes_at)}`}</p></div></button>)}{!loading && !overview?.upcomingContests.length && <p className="p-10 text-center text-sm text-slate-500">No active or upcoming contests.</p>}</div></div>
      <div className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Activity size={18} className="text-emerald-600" /><h2 className="font-black">Market feed</h2></div><p className="mt-5 text-2xl font-black capitalize">{overview?.market.provider || "Unavailable"}</p><p className="mt-1 text-sm text-slate-500">{overview?.market.instrumentCount || 0} tracked instruments</p><div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">Last snapshot: <b className="text-slate-700">{formatDate(overview?.market.lastSnapshotAt)}</b></div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Bell size={18} className="text-emerald-600" /><h2 className="font-black">Notifications</h2></div><div className="mt-5 grid grid-cols-2 gap-3"><MiniStat label="Unread" value={overview?.notifications.unread || 0} /><MiniStat label="Failed" value={overview?.notifications.failedDeliveries || 0} /></div><Button variant="outline" className="mt-5 w-full" onClick={() => onNavigate("notifications")}>Open notification center</Button></section></div>
    </section>
    <section className="mt-6 grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Trophy size={18} className="text-amber-500" /><h2 className="font-black">Demo USDT overview</h2></div><p className="mt-5 text-3xl font-black">{overview?.wallets.demoAvailable || "0.000000"}</p><p className="text-sm text-slate-500">Available Demo USDT across user accounts</p><div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4"><MiniStat label="Reserved" value={overview?.wallets.demoReserved || "0.000000"} /><MiniStat label="Scheduled pool" value={overview?.contests.scheduledPrizePool || "0"} /></div></div><div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-100 p-5"><Clock3 size={18} className="text-emerald-600" /><div><h2 className="font-black">Recent activity</h2><p className="text-sm text-slate-500">Latest operational events across the platform.</p></div></div><div className="divide-y divide-slate-100">{overview?.recentActivity.map((item, index) => <div key={`${item.occurred_at}-${index}`} className="flex gap-3 p-4"><span className="mt-1 size-2 shrink-0 rounded-full bg-emerald-500" /><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-bold">{item.title}</p><p className="text-xs text-slate-500">{formatDate(item.occurred_at)}</p></div><p className="mt-1 truncate text-xs text-slate-500">{item.category}{item.detail ? ` · ${item.detail}` : ""}</p></div></div>)}{!loading && !overview?.recentActivity.length && <p className="p-10 text-center text-sm text-slate-500">No activity has been recorded yet.</p>}</div></div></section>
  </>;
}

function Summary({ label, value, hint, tone, onClick }: { label: string; value: number; hint: string; tone: string; onClick: () => void }) { const color = { amber: "border-amber-200 text-amber-700", emerald: "border-emerald-200 text-emerald-700", rose: "border-rose-200 text-rose-700", indigo: "border-indigo-200 text-indigo-700" }[tone] || "border-slate-200 text-slate-700"; return <button type="button" onClick={onClick} className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:shadow ${color}`}><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-3 text-3xl font-black">{value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{hint}</p></button>; }
function MiniStat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-black text-slate-800">{value}</p></div>; }
