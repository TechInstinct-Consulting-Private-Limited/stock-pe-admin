"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Activity, ChevronRight, ClipboardList, Gauge, Landmark, LogOut, Plus, RefreshCw, ShieldAlert, ShieldCheck, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { requestAdminOtp, verifyAdminOtp } from "@/features/auth/auth.api";
import { createContest, listContestEntries, listContests, settleContest, updateContestStatus } from "@/features/contests/contest.api";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { createDemoPayout, listDemoPayouts, updateDemoPayout } from "@/features/payouts/payout.api";
import { listAdminUsers } from "@/features/users/user.api";
import { UsersPage } from "@/features/users/UsersPage";
import { ContestDetailsPage } from "@/features/contests/ContestDetailsPage";
import { useAdminSession } from "@/hooks/useAdminSession";
import { useUrlTab } from "@/hooks/useUrlTab";
import { createApiClient } from "@/services/api-client";
import { contestStatuses as statuses, nextContestStatus as nextStatus, type AdminUser, type Contest, type ContestDraft, type DemoPayout, type StaticPageKey, type WinnerEntry } from "@/types/admin";

const nowInput = (hours: number) => new Date(Date.now() + hours * 3600000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
// datetime-local values have no timezone. Convert the administrator's browser-local
// selection into an absolute UTC instant before the API receives it.
const toUtcIso = (value: string) => new Date(value).toISOString();
const STAGING_API_BASE = "https://13.126.195.235.nip.io/api";

function NextMilestone({ contest }: { contest: Contest }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (contest.status === "CLOSED") return <span>Awaiting settlement</span>;
  if (contest.status === "SETTLED") return <span>Settled</span>;
  const target = contest.status === "SOON" ? contest.opens_at : contest.status === "OPEN" ? contest.live_at || contest.closes_at : contest.status === "LIVE" ? contest.closes_at : null;
  const label = contest.status === "SOON" ? "Opens in" : contest.status === "OPEN" ? "Entry closes in" : "Contest closes in";
  if (!target || !Number.isFinite(new Date(target).getTime())) return <span>—</span>;
  const seconds = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
  const time = [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map((part) => String(part).padStart(2, "0")).join(":");
  return <span>{label} {time}</span>;
}

export default function Home() {
  const { mounted, apiBase, setApiBase, token, beginSession, endSession } = useAdminSession(STAGING_API_BASE);
  const { activePage, contestId, navigateTo, openContest, closeContest } = useUrlTab();
  const [mobile, setMobile] = useState(""); const [password, setPassword] = useState(""); const [otp, setOtp] = useState(""); const [otpRequested, setOtpRequested] = useState(false);
  const [filter, setFilter] = useState("ALL"); const [contests, setContests] = useState<Contest[]>([]); const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false); const [settling, setSettling] = useState<Contest | null>(null); const [closingValue, setClosingValue] = useState("");
  const [payouts, setPayouts] = useState<DemoPayout[]>([]); const [payoutLoading, setPayoutLoading] = useState(false); const [payoutContest, setPayoutContest] = useState<Contest | null>(null); const [winners, setWinners] = useState<WinnerEntry[]>([]); const [payoutAmount, setPayoutAmount] = useState("");
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]); const [usersLoading, setUsersLoading] = useState(false); const [userSearch, setUserSearch] = useState(""); const usersRequestId = useRef(0);
  const [form, setForm] = useState<ContestDraft>({ publicId: "", title: "", question: "", instrumentCode: "NIFTY50", entryCredits: "50", prizePoolCredits: "1000", playerCapacity: "100", lifecycleMode: "SCHEDULED", opensAt: nowInput(2), liveAt: nowInput(4), closesAt: nowInput(6), settlementSource: "Demo market reference" });

  const request = useMemo(() => createApiClient(apiBase, token).request, [apiBase, token]);
  const load = async (options: unknown = {}) => { const quiet = Boolean(typeof options === "object" && options !== null && "quiet" in options && options.quiet); if (!token) return; if (!quiet) setLoading(true); try { const data = await listContests(request, filter); setContests(data.contests || []); } catch (e) { if (!quiet) toast.error(e instanceof Error ? e.message : "Could not load contests"); } finally { if (!quiet) setLoading(false); } };
  const loadPayouts = async () => { if (!token) return; setPayoutLoading(true); try { const data = await listDemoPayouts(request); setPayouts(data.payouts || []); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not load demo payout queue"); } finally { setPayoutLoading(false); } };
  const loadUsers = async (query = userSearch) => { if (!token) return; const requestId = ++usersRequestId.current; setUsersLoading(true); try { const data = await listAdminUsers(request, query); if (requestId === usersRequestId.current) setAdminUsers(data.users || []); } catch (e) { if (requestId === usersRequestId.current) toast.error(e instanceof Error ? e.message : "Could not load users"); } finally { if (requestId === usersRequestId.current) setUsersLoading(false); } };
  useEffect(() => { if (!mounted) return; const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [token, filter, mounted]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mounted || !token || activePage !== "contests") return;
    const refreshIfVisible = () => { if (!document.hidden) void load({ quiet: true }); };
    const timer = window.setInterval(refreshIfVisible, 15_000);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refreshIfVisible); };
  }, [mounted, token, activePage, filter, request]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!mounted || !token) return; void loadPayouts(); }, [token, mounted]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!mounted || !token || activePage !== "users") return; const timer = window.setTimeout(() => { void loadUsers(); }, userSearch.trim().length >= 2 ? 300 : 0); return () => window.clearTimeout(timer); }, [token, mounted, activePage, userSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestOtp = async (event: FormEvent) => { event.preventDefault(); try { await requestAdminOtp(request, mobile, password); setOtpRequested(true); toast.success("OTP sent. Enter it to continue."); } catch (e) { toast.error(e instanceof Error ? e.message : "Sign-in failed"); } };
  const verifyOtp = async (event: FormEvent) => { event.preventDefault(); try { const data = await verifyAdminOtp(request, mobile, otp); beginSession(data.token); toast.success("Admin session started"); } catch (e) { toast.error(e instanceof Error ? e.message : "OTP verification failed"); } };
  const create = async (event: FormEvent) => { event.preventDefault(); try { await createContest(request, { ...form, currency: "DEMO_USDT", opensAt: toUtcIso(form.opensAt), liveAt: toUtcIso(form.liveAt), closesAt: toUtcIso(form.closesAt), entryCredits: Number(form.entryCredits), prizePoolCredits: Number(form.prizePoolCredits), playerCapacity: Number(form.playerCapacity), status: form.lifecycleMode === "SCHEDULED" ? "SOON" : "DRAFT" }); setCreateOpen(false); toast.success(form.lifecycleMode === "SCHEDULED" ? "Scheduled contest published for automatic lifecycle" : "Draft contest created"); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not create contest"); } };
  const advance = async (contest: Contest) => { const status = nextStatus[contest.status]; if (!status) return; try { await updateContestStatus(request, contest.public_id, status); toast.success(`${contest.title} is now ${status}`); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Status update failed"); } };
  const settle = async (event: FormEvent) => { event.preventDefault(); if (!settling) return; try { const data = await settleContest(request, settling.public_id, Number(closingValue)); toast.success(`Settlement complete: ${data.contest.winnerCount} winner(s)`); setSettling(null); setClosingValue(""); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Settlement failed"); } };
  const openPayout = async (contest: Contest) => { try { const data = await listContestEntries(request, contest.public_id); setWinners((data.entries || []).filter((entry: WinnerEntry) => entry.status === "WON")); setPayoutContest(contest); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not load contest winners"); } };
  const createPayout = async (entryId: string) => { if (!payoutContest) return; try { await createDemoPayout(request, payoutContest.public_id, entryId, Number(payoutAmount)); toast.success("Test payout added to review queue"); setPayoutContest(null); setPayoutAmount(""); loadPayouts(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not create test payout"); } };
  const changePayout = async (payout: DemoPayout, action: "approve" | "complete" | "reject") => { try { if (action === "reject" && !window.confirm("Reject this review-only test payout? No real USDT can be sent by this flow.")) return; await updateDemoPayout(request, payout.id, action); toast.success(action === "approve" ? "Test payout approved" : action === "complete" ? "Test payout marked completed" : "Test payout rejected"); loadPayouts(); } catch (e) { toast.error(e instanceof Error ? e.message : "Payout action failed"); } };
  const stats = useMemo(() => ({ open: contests.filter((c) => c.status === "OPEN").length, live: contests.filter((c) => c.status === "LIVE").length, entries: contests.reduce((n, c) => n + Number(c.player_count), 0), pool: contests.reduce((n, c) => n + Number(c.prize_pool_credits), 0) }), [contests]);

  if (!mounted) return <div className="min-h-screen bg-[#071d1a]" />;
  if (!token) return <LoginScreen apiBase={apiBase} setApiBase={setApiBase} mobile={mobile} setMobile={setMobile} password={password} setPassword={setPassword} otp={otp} setOtp={setOtp} otpRequested={otpRequested} requestOtp={requestOtp} verifyOtp={verifyOtp} />;
  if (contestId) return <ContestDetailsPage publicId={contestId} request={request} onBack={closeContest} />;
  if (activePage !== "contests") return <StaticAdminWorkspace activePage={activePage} onNavigate={navigateTo} onSignOut={endSession} users={adminUsers} usersLoading={usersLoading} userSearch={userSearch} setUserSearch={setUserSearch} onRefreshUsers={loadUsers} />;
  return <main className="min-h-screen bg-[#f3f7f5] text-slate-950"><Toaster richColors position="top-right" /><div className="grid min-h-screen lg:grid-cols-[248px_1fr]"><aside className="border-b border-emerald-950/20 bg-[#071d1a] px-5 py-6 text-emerald-50 lg:border-b-0 lg:border-r"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-[#071d1a]"><Activity size={21} /></div><div><p className="text-lg font-black">MarketPe</p><p className="text-xs text-emerald-100/60">Admin Console</p></div></div><nav className="mt-9 space-y-2"><Nav icon={<Gauge size={18} />} label="Dashboard" onClick={() => navigateTo("dashboard")} /><Nav active icon={<ClipboardList size={18} />} label="Contest operations" onClick={() => navigateTo("contests")} /><PreviewNavGroups activePage="contests" onNavigate={navigateTo} /></nav><div className="mt-8 rounded-xl border border-emerald-300/15 bg-emerald-400/5 p-4 text-sm leading-5 text-emerald-100/75"><b className="text-emerald-200">Demo environment</b><br />Virtual credits only. No USDT or real-money action is enabled.</div><Button variant="ghost" className="mt-8 w-full justify-start text-emerald-100 hover:bg-emerald-50/10 hover:text-white" onClick={endSession}><LogOut size={17} /> Sign out</Button></aside><section className="min-w-0 p-5 md:p-8 lg:p-10"><header className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-[.16em] text-emerald-700">Operations / contests</p><h1 className="mt-2 text-3xl font-black tracking-tight">Contest control room</h1><p className="mt-2 text-base text-slate-600">Create, launch, close, and settle virtual-credit prediction contests with real-time stock feeds.</p></div><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setCreateOpen(true)}><Plus size={18} /> Create contest</Button></header><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Open contests" value={stats.open} icon={<ClipboardList />} /><Metric label="Live contests" value={stats.live} icon={<Activity />} /><Metric label="Entries shown" value={stats.entries.toLocaleString("en-IN")} icon={<Users />} /><Metric label="Demo prize pool" value={`${stats.pool.toLocaleString("en-IN")} cr`} icon={<Trophy />} /></div><section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between"><div><h2 className="text-lg font-extrabold">Contests</h2><p className="mt-1 text-sm text-slate-500">Only valid lifecycle transitions are available.</p></div><Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh</Button></div><div className="flex gap-2 overflow-auto border-b border-slate-100 px-5 py-3">{statuses.map((status) => <button key={status} onClick={() => setFilter(status)} className={`rounded-full px-3 py-1.5 text-sm font-bold ${filter === status ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-emerald-50"}`}>{status}</button>)}</div><Table><TableHeader><TableRow><TableHead>Contest</TableHead><TableHead>Status</TableHead><TableHead>Next milestone</TableHead><TableHead>Entries</TableHead><TableHead>Demo pool</TableHead><TableHead>Closes</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{contests.map((contest) => <TableRow key={contest.public_id}><TableCell><p className="font-bold">{contest.title}</p><p className="max-w-[260px] truncate text-xs text-slate-500">{contest.question}</p></TableCell><TableCell><Status status={contest.status} /></TableCell><TableCell><NextMilestone contest={contest} /></TableCell><TableCell>{contest.player_count.toLocaleString("en-IN")} / {contest.player_capacity.toLocaleString("en-IN")}</TableCell><TableCell>{contest.prize_pool_credits.toLocaleString("en-IN")} {contest.is_demo_usdt ? "Demo USDT" : "credits"}</TableCell><TableCell className="text-slate-600">{new Date(contest.closes_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</TableCell><TableCell className="text-right">
  <div className="flex flex-wrap justify-end gap-2">
    <Button type="button" size="sm" variant="outline" onClick={() => openContest(contest.public_id)}>View Details</Button>
    {contest.status === "CLOSED" ? <Button size="sm" onClick={() => setSettling(contest)}>Settle</Button> : contest.status === "SETTLED" ? <Button size="sm" variant="outline" onClick={() => openPayout(contest)}>Test payout</Button> : nextStatus[contest.status] ? <Button size="sm" variant="outline" onClick={() => advance(contest)}>{nextStatus[contest.status]} <ChevronRight size={15} /></Button> : <span className="text-xs font-bold text-slate-400">No action</span>}
  </div>
</TableCell></TableRow>)}{!loading && contests.length === 0 && <TableRow><TableCell colSpan={7} className="py-14 text-center text-slate-500">No contests in this status.</TableCell></TableRow>}</TableBody></Table></section><section className="mt-8 rounded-2xl border border-amber-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-amber-100 p-5"><div><h2 className="text-lg font-extrabold">Demo test payout queue</h2><p className="mt-1 text-sm text-slate-500">Review-only records. No USDT, blockchain transaction, or ledger credit is created.</p></div><Button variant="outline" onClick={loadPayouts} disabled={payoutLoading}><RefreshCw className={payoutLoading ? "animate-spin" : ""} size={16} /> Refresh</Button></div><Table><TableHeader><TableRow><TableHead>Contest / user</TableHead><TableHead>Demo amount</TableHead><TableHead>Destination</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{payouts.map((payout) => <TableRow key={payout.id}><TableCell><p className="font-bold">{payout.title}</p><p className="text-xs text-slate-500">{payout.mobile}</p></TableCell><TableCell>{payout.amount_usdt} Demo USDT</TableCell><TableCell className="font-mono text-xs">{payout.wallet_address}</TableCell><TableCell><Status status={payout.status} /></TableCell><TableCell className="text-right">{payout.status === "PENDING_REVIEW" ? <div className="flex justify-end gap-2"><Button size="sm" onClick={() => changePayout(payout, "approve")}>Approve test</Button><Button size="sm" variant="outline" onClick={() => changePayout(payout, "reject")}>Reject</Button></div> : payout.status === "APPROVED" ? <div className="flex justify-end gap-2"><Button size="sm" onClick={() => changePayout(payout, "complete")}>Mark complete</Button><Button size="sm" variant="outline" onClick={() => changePayout(payout, "reject")}>Reject</Button></div> : <span className="text-xs font-bold text-slate-400">{payout.simulated_tx_hash ? "Simulated" : "No action"}</span>}</TableCell></TableRow>)}{!payoutLoading && payouts.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">No demo payouts yet.</TableCell></TableRow>}</TableBody></Table></section></section></div><CreateDialog open={createOpen} onOpenChange={setCreateOpen} form={form} setForm={setForm} onSubmit={create} apiBase={apiBase} /><SettleDialog contest={settling} onOpenChange={(open) => !open && setSettling(null)} closingValue={closingValue} setClosingValue={setClosingValue} onSubmit={settle} /><PayoutDialog contest={payoutContest} winners={winners} amount={payoutAmount} setAmount={setPayoutAmount} onOpenChange={(open) => !open && setPayoutContest(null)} onCreate={createPayout} /></main>;
}

function isAdminTab(value: string | null): value is StaticPageKey | "contests" {
  return value === "contests" || value === "dashboard" || value === "deposits" || value === "verification" || value === "contracts" || value === "rejected" || value === "risks" || value === "users" || value === "wallets" || value === "withdrawals" || value === "transactions" || value === "health" || value === "settings";
}

const staticPages: Record<StaticPageKey, { label: string; eyebrow: string; title: string; description: string }> = {
  dashboard: { label: "Dashboard", eyebrow: "Overview", title: "Dashboard Overview", description: "Live operational view - deposits, withdrawals, risk & infrastructure" },
  deposits: { label: "Live Deposits", eyebrow: "Deposits & transactions", title: "Deposit Operations", description: "Live queue - pending - verified - rejected - search" },
  verification: { label: "Pending Deposits", eyebrow: "Deposits & transactions", title: "Deposit Verification", description: "Forensic transaction view - final decision before wallet credit" },
  contracts: { label: "USDT Contracts", eyebrow: "System & settings", title: "USDT Contract Management", description: "Server-controlled whitelist - no user override" },
  rejected: { label: "Rejected Deposits", eyebrow: "Deposits & transactions", title: "Rejected & Suspicious Deposits", description: "Fraud queue - fake contracts - wrong networks - blacklisted addresses" },
  risks: { label: "Risk Alerts", eyebrow: "Risk & compliance", title: "Risk & Compliance Center", description: "AML screening - address risk - velocity anomalies - case management" },
  users: { label: "Users", eyebrow: "Users & KYC", title: "Users & Aadhaar KYC", description: "User lifecycle - KYC status - wallet linkage - account actions" },
  wallets: { label: "Wallets", eyebrow: "Users & KYC", title: "Wallet Management", description: "Custodial wallet directory - balances - network addresses - freeze controls" },
  withdrawals: { label: "Withdrawal Requests", eyebrow: "Withdrawals", title: "Withdrawal Control Center", description: "Requests - destination checks - risk review - release history" },
  transactions: { label: "All Transactions", eyebrow: "Deposits & transactions", title: "Transaction Explorer & TxID Search", description: "Search every deposit, withdrawal and verification decision" },
  health: { label: "Network & API Health", eyebrow: "System & settings", title: "Network & API Health", description: "Fail-closed monitoring for nodes, indexers and risk services" },
  settings: { label: "Settings", eyebrow: "System & settings", title: "Settings, Roles & Audit Logs", description: "Security configuration - approvals - complete administrative history" },
};

function PreviewNavGroups({ activePage, onNavigate }: { activePage: StaticPageKey | "contests"; onNavigate: (page: StaticPageKey) => void }) {
  const groups: { heading: string; links: { key: StaticPageKey; label: string }[] }[] = [
    { heading: "Deposits & transactions", links: [{ key: "deposits", label: "Live Deposits" }, { key: "verification", label: "Pending Deposits" }, { key: "rejected", label: "Rejected Deposits" }, { key: "transactions", label: "All Transactions" }] },
    { heading: "Withdrawals", links: [{ key: "withdrawals", label: "Withdrawal Requests" }] },
    { heading: "Users & KYC", links: [{ key: "users", label: "Users" }, { key: "wallets", label: "Wallets" }] },
    { heading: "Risk & compliance", links: [{ key: "risks", label: "Risk Alerts" }] },
    { heading: "System & settings", links: [{ key: "contracts", label: "USDT Contracts" }, { key: "health", label: "Network & API Health" }, { key: "settings", label: "Settings" }] },
  ];
  return <div className="mt-2 space-y-1">{groups.map((group) => <details key={group.heading} className="group rounded-xl"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-100/60 hover:bg-emerald-50/10"><span>{group.heading}</span><ChevronRight size={14} className="transition-transform group-open:rotate-90" /></summary><div className="space-y-1 pb-1">{group.links.map((link) => <button key={link.key} type="button" onClick={() => onNavigate(link.key)} className={`block w-full rounded-lg px-4 py-2 text-left text-sm font-bold transition ${activePage === link.key ? "bg-emerald-400 text-[#06201b]" : "text-emerald-100/70 hover:bg-emerald-50/10 hover:text-white"}`}>{link.label}</button>)}</div></details>)}</div>;
}

function StaticAdminWorkspace({ activePage, onNavigate, onSignOut, users, usersLoading, userSearch, setUserSearch, onRefreshUsers }: { activePage: StaticPageKey; onNavigate: (page: StaticPageKey | "contests") => void; onSignOut: () => void; users: AdminUser[]; usersLoading: boolean; userSearch: string; setUserSearch: (value: string) => void; onRefreshUsers: () => void }) {
  const page = staticPages[activePage];
  return <main className="min-h-screen bg-[#f3f7f5] text-slate-950"><div className="grid min-h-screen lg:grid-cols-[248px_1fr]"><aside className="border-b border-emerald-950/20 bg-[#071d1a] px-5 py-6 text-emerald-50 lg:border-b-0 lg:border-r"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-[#071d1a]"><Activity size={21} /></div><div><p className="text-lg font-black">MarketPe</p><p className="text-xs text-emerald-100/60">Admin Console</p></div></div><nav className="mt-9 space-y-2"><Nav active={activePage === "dashboard"} icon={<Gauge size={18} />} label="Dashboard" onClick={() => onNavigate("dashboard")} /><Nav icon={<ClipboardList size={18} />} label="Contest operations" onClick={() => onNavigate("contests")} /><PreviewNavGroups activePage={activePage} onNavigate={onNavigate} /></nav><div className="mt-8 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-5 text-amber-50/80"><b className="text-amber-200">Static preview</b><br />Sample data only. No payment, wallet, KYC, or compliance action is available.</div><Button variant="ghost" className="mt-8 w-full justify-start text-emerald-100 hover:bg-emerald-50/10 hover:text-white" onClick={onSignOut}><LogOut size={17} /> Sign out</Button></aside><section className="min-w-0 p-5 md:p-8 lg:p-10"><header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-7 sm:flex-row sm:items-start"><div><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-600">{page.eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{page.title}</h1><p className="mt-2 text-sm text-slate-500">{page.description}</p></div><div className="flex gap-3"><Button variant="outline" className="bg-white">All Networks</Button><Button variant="outline" className="bg-white">Admin</Button></div></header><div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"><b>{activePage === "users" ? "Live admin data:" : "Static design preview:"}</b> {activePage === "users" ? "Read-only user, KYC, and wallet-link data is loaded from the backend." : "This PDF-based page has no API calls and no live operational controls yet."}</div><StaticPageContent page={activePage} users={users} usersLoading={usersLoading} userSearch={userSearch} setUserSearch={setUserSearch} onRefreshUsers={onRefreshUsers} /></section></div></main>;
}

function PreviewMetric({ label, value, detail, tone = "emerald" }: { label: string; value: string; detail: string; tone?: "emerald" | "amber" | "rose" | "sky" }) {
  const toneClass = { emerald: "text-emerald-600", amber: "text-amber-600", rose: "text-rose-600", sky: "text-sky-600" }[tone];
  return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p><p className={`mt-1 text-xs font-bold ${toneClass}`}>{detail}</p></div>;
}

function PreviewTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50"><tr>{headers.map((header) => <th key={header} className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="border-b border-slate-100 last:border-0">{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className={`px-4 py-3 ${cell === "VERIFIED" || cell === "ACTIVE" || cell === "HEALTHY" || cell === "CONTRACT OK" ? "font-bold text-emerald-600" : cell === "REJECTED" || cell === "BLOCKED" || cell === "HIGH" || cell === "FAKE CONTRACT" ? "font-bold text-rose-600" : cell === "PENDING" || cell === "REVIEW" || cell === "MEDIUM" ? "font-bold text-amber-600" : "text-slate-700"}`}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function StaticPageContent({ page, users = [], usersLoading = false, userSearch = "", setUserSearch, onRefreshUsers }: { page: StaticPageKey; users?: AdminUser[]; usersLoading?: boolean; userSearch?: string; setUserSearch?: (value: string) => void; onRefreshUsers?: () => void }) {
  const depositRows = [["10:24", "MP24567", "Arjun Kumar", "TRC20", "a1b2...e5f6", "1,250", "12/20", "PENDING"], ["10:22", "MP24568", "Neha Sharma", "ERC20", "0x7f6...b2a1", "500", "20/20", "VERIFIED"], ["10:20", "MP24570", "Sanjay Verma", "TRC20", "0x2ab...c910", "10,000", "20/20", "REJECTED"], ["10:15", "MP24571", "Pooja Singh", "TRC20", "b6c7...f0a1", "750", "20/20", "VERIFIED"]];
  if (page === "dashboard") return <div className="mt-7 space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><PreviewMetric label="Total deposits" value="285,760.42" detail="+18.45% / 7d" /><PreviewMetric label="Live deposits" value="12" detail="Last 5 min" tone="sky" /><PreviewMetric label="Pending deposits" value="23" detail="Awaiting confirmation" tone="amber" /><PreviewMetric label="Verified deposits" value="152" detail="Completed today" /><PreviewMetric label="Rejected deposits" value="9" detail="Unauthorized / fake" tone="rose" /></div><div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-black">Live USDT Deposits</h2><p className="mb-4 mt-1 text-xs text-slate-500">Server-observed blockchain transactions</p><PreviewTable headers={["Time", "User", "Net", "TxID", "Amount", "Conf.", "Status"]} rows={depositRows.map(([time, , user, net, txid, amount, conf, status]) => [time, user, net, txid, amount, conf, status])} /></section><div className="space-y-5"><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-black">USDT Contract Whitelist</h2><p className="mt-1 text-xs text-slate-500">Exact contract match per network</p>{["TRC20 / TRON", "ERC20 / Ethereum", "BEP20 / BSC"].map((item) => <div key={item} className="mt-4 flex justify-between text-sm font-semibold"><span>{item}</span><span className="text-emerald-600">VERIFIED</span></div>)}</section><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-black">Risk Alerts</h2>{["High-risk address detected", "Sanctioned address attempt", "Fake token contract"].map((item) => <div key={item} className="mt-4 flex justify-between text-sm"><span>{item}</span><span className="font-bold text-rose-600">HIGH</span></div>)}</section></div></div></div>;
  if (page === "deposits") return <div className="mt-7"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><PreviewMetric label="Live" value="12" detail="Now" tone="sky" /><PreviewMetric label="Pending" value="23" detail="Today" tone="amber" /><PreviewMetric label="Verified" value="152" detail="Today" /><PreviewMetric label="Rejected" value="9" detail="Today" tone="rose" /></div><section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-black">Deposit Queue</h2><p className="mb-4 mt-1 text-xs text-slate-500">All deposits remain pending until independent verification is complete.</p><PreviewTable headers={["Time", "User ID", "User", "Network", "TxID", "Amount", "Conf.", "Status"]} rows={depositRows} /><div className="mt-5 flex flex-wrap gap-3"><Button variant="outline">Network: All</Button><Button variant="outline">Status: All</Button><Button variant="outline">Date: Today</Button><Button variant="outline" disabled>Export CSV</Button></div></section></div>;
  if (page === "verification") return <div className="mt-7"><div className="grid gap-5 xl:grid-cols-[.7fr_1.3fr]"><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-black">Deposit #MP24567</h2><p className="mt-1 text-sm text-slate-500">Pending verification</p>{[["User", "Arjun Kumar"], ["User ID", "MP24567"], ["Network", "TRC20"], ["Amount", "$ 1,250.00"], ["TxID", "a1b2c3d4...e5f66"], ["Confirmations", "12 / 20"]].map(([a, b]) => <div key={a} className="mt-5 flex justify-between text-sm"><span className="font-bold uppercase text-slate-500">{a}</span><span>{b}</span></div>)}</section><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-black">Verification Pipeline</h2><p className="mt-1 text-xs text-slate-500">Automated checks - fail closed on uncertainty</p>{["Transaction detected", "Network = TRC20", "Official USDT contract", "Recipient address", "20 confirmations", "Risk / AML screen", "Approve / Reject", "Credit internal ledger"].map((step, index) => <div key={step} className="mt-5 flex items-center gap-4"><span className={`size-4 rounded-full ${index < 4 ? "bg-emerald-500" : index < 6 ? "bg-amber-500" : "bg-violet-500"}`} /><span className="text-sm font-semibold">{step}</span></div>)}</section></div><div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm"><b className="text-amber-700">DECISION RULE</b><span className="ml-8 font-semibold">Only verified on-chain assets may increase the available wallet balance.</span></div></div>;
  if (page === "contracts") return <div className="mt-7"><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-black">Approved USDT Contracts</h2><p className="mb-5 mt-1 text-sm text-slate-500">Use exact contract addresses per network. Token name and symbol alone are never trusted.</p><PreviewTable headers={["Network", "Chain", "Asset", "Official contract", "Status"]} rows={[["TRC20", "TRON", "USDT", "TR7NHqjeKQxGTCi8q8zY4pL8otSzgiLj6t", "ACTIVE"], ["ERC20", "Ethereum", "USDT", "0xdAC17F958D2ee523a2206206994597C13D831ec7", "ACTIVE"], ["BEP20", "BSC", "USDT", "0x55d398326f99059fF775485246999027B3197955", "ACTIVE"]]} /></section><div className="mt-5 grid gap-5 md:grid-cols-2"><PreviewBulletCard title="Contract Checks" items={["Exact contract match", "Network match", "Transfer event / decimals", "No user override"]} /><PreviewBulletCard title="Admin Controls" items={["Change request", "Two-person approval", "Version history", "Audit log"]} /></div></div>;
  if (page === "rejected") return <div className="mt-7"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><PreviewMetric label="Fake contract" value="4" detail="Open cases" tone="rose" /><PreviewMetric label="Wrong network" value="2" detail="Open cases" tone="rose" /><PreviewMetric label="Blacklisted" value="2" detail="Open cases" tone="rose" /><PreviewMetric label="Other" value="1" detail="Open cases" tone="amber" /></div><section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-black">Rejection Queue</h2><p className="mb-4 mt-1 text-xs text-slate-500">Rejected or held deposits never increase available balance.</p><PreviewTable headers={["Time", "User ID", "User", "Network", "Amount", "Reason", "State"]} rows={[["10:20", "MP24570", "Sanjay Verma", "TRC20", "$ 10,000", "Fake USDT contract", "REJECTED"], ["10:12", "MP24572", "Deepak Singh", "ERC20", "$ 5,000", "Unauthorized token", "REJECTED"], ["10:08", "MP24571", "Vikram Patel", "BEP20", "$ 7,500", "Blacklisted address", "REJECTED"], ["09:54", "MP24573", "Ramesh Kumar", "TRC20", "$ 3,000", "Insufficient confirmations", "PENDING"]]} /></section></div>;
  if (page === "risks") return <div className="mt-7"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><PreviewMetric label="High risk" value="7" detail="Open cases" tone="rose" /><PreviewMetric label="AML review" value="14" detail="Open cases" tone="amber" /><PreviewMetric label="Blacklisted" value="3" detail="Open cases" tone="rose" /><PreviewMetric label="Cleared" value="98" detail="Open cases" /></div><section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-black">Risk Alerts</h2><p className="mb-4 mt-1 text-xs text-slate-500">Prioritized by severity</p><PreviewTable headers={["Time", "Address / TxID", "Network", "Reason", "Severity"]} rows={[["10:24", "a1b2c3...e5f66", "TRC20", "High-risk address", "HIGH"], ["10:21", "0x7f6e...b2a1", "ERC20", "Sanctioned address", "HIGH"], ["10:17", "0x9a8b...3e4f", "BEP20", "Mixing service", "HIGH"], ["10:14", "b6c7d8...f0a1", "TRC20", "Velocity anomaly", "MEDIUM"]]} /></section></div>;
  if (page === "users") return <UsersPage users={users} loading={usersLoading} search={userSearch} onSearchChange={setUserSearch || (() => {})} onRefresh={() => onRefreshUsers?.()} />;
  // Retained temporarily as a reversible reference while the Users feature is verified locally.
  if (false && page === "users") {
    const verifiedKyc = users.filter((user) => user.kycStatus === "verified").length;
    const linkedWallets = users.filter((user) => Boolean(user.wallet)).length;
    const administrators = users.filter((user) => Boolean(user.adminRole)).length;
    const searchHint = userSearch.trim().length === 1 ? "Type at least 2 characters to search." : userSearch.trim().length >= 2 ? `Searching users for “${userSearch.trim()}”.` : "Search by name, mobile number, or linked wallet address.";
    return <div className="mt-7"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><PreviewMetric label="Registered users" value={String(users.length)} detail="Live directory" tone="sky" /><PreviewMetric label="KYC verified" value={String(verifiedKyc)} detail="Aadhaar verification complete" /><PreviewMetric label="Wallet linked" value={String(linkedWallets)} detail="TRC20 wallet link available" tone="sky" /><PreviewMetric label="Administrators" value={String(administrators)} detail="Role assigned" tone="amber" /></div><div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold">User search</p><p className="mt-1 text-xs text-slate-500">{searchHint}</p></div><div className="flex flex-1 gap-2 sm:max-w-xl"><Input placeholder="Search name, mobile, or wallet address" value={userSearch} onChange={(event) => setUserSearch?.(event.target.value)} /><Button variant="outline" onClick={() => setUserSearch?.("")} disabled={!userSearch}>Clear</Button><Button variant="outline" onClick={onRefreshUsers} disabled={usersLoading}><RefreshCw size={16} className={usersLoading ? "animate-spin" : ""} /> Refresh</Button></div></div><section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-black">User Directory</h2><p className="mt-1 text-xs text-slate-500">Live read-only data from the current Admin API session. Aadhaar numbers, OTPs, passwords, and balances are protected.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{users.length} users</span></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50"><tr>{["User ID", "Name", "Mobile", "Mobile OTP", "KYC", "Wallet", "Balance", "Status", "Joined"].map((header) => <th key={header} className="px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">{header}</th>)}</tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-slate-100 last:border-0"><td className="px-4 py-3 font-mono text-xs text-slate-500">{user.id.slice(0, 8)}…</td><td className="px-4 py-3 font-bold">{user.displayName || "StockPe member"}</td><td className="px-4 py-3 font-mono text-slate-700">+91 {user.mobile}</td><td className={`px-4 py-3 text-xs font-black ${user.mobileVerified ? "text-emerald-600" : "text-amber-600"}`}>{user.mobileVerified ? "VERIFIED" : "PENDING"}</td><td className={`px-4 py-3 text-xs font-black ${user.kycStatus === "verified" ? "text-emerald-600" : user.kycStatus === "failed" ? "text-rose-600" : "text-amber-600"}`}>{user.kycStatus.replaceAll("_", " ").toUpperCase()}</td><td className="px-4 py-3">{user.wallet ? <span className="font-mono text-xs">{user.wallet.network} · {user.wallet.address.slice(0, 8)}…{user.wallet.address.slice(-5)}</span> : <span className="text-xs text-slate-500">Not linked</span>}</td><td className="px-4 py-3 text-xs text-slate-500">Not connected</td><td className="px-4 py-3 text-xs font-bold">{user.adminRole || "ACTIVE"}</td><td className="px-4 py-3 text-xs text-slate-600">{new Date(user.joinedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td></tr>)}{!usersLoading && users.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">No users match this search.</td></tr>}{usersLoading && <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">Loading users…</td></tr>}</tbody></table></div></section><div className="mt-5 grid gap-5 md:grid-cols-2"><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-black">KYC Checklist</h2><p className="mt-1 text-xs text-slate-500">PDF structure - future selected-user detail panel.</p>{[["Mobile OTP", "Available"], ["Aadhaar e-KYC", "Available"], ["Aadhaar OTP", "Available"], ["Wallet linkage", "Available"]].map(([item, state]) => <div key={item} className="mt-4 flex items-center justify-between text-sm"><span>{item}</span><span className="text-xs font-bold text-slate-500">{state}</span></div>)}</section><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-black">Admin Actions</h2><p className="mt-1 text-xs text-slate-500">Visual placeholders only. No account action is enabled yet.</p><div className="mt-5 grid gap-2 sm:grid-cols-2">{["View profile", "Review KYC", "View wallet history", "Freeze account"].map((label) => <Button key={label} variant="outline" disabled className="justify-start">{label}</Button>)}</div></section></div></div>;
  }
  if (page === "wallets") return <div className="mt-7"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><PreviewMetric label="Custodial wallets" value="2,418" detail="Current" tone="sky" /><PreviewMetric label="Total USDT" value="$ 1.84M" detail="Current" /><PreviewMetric label="Frozen" value="17" detail="Current" tone="rose" /><PreviewMetric label="Pending" value="31" detail="Current" tone="amber" /></div><section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-black">Wallet Directory</h2><p className="mb-4 mt-1 text-xs text-slate-500">User wallet + internal ledger state</p><PreviewTable headers={["User", "Network", "Address", "Balance", "KYC", "Status"]} rows={[["MP24567", "TRC20", "TQn9Y2...qH8jL", "$ 17.48", "VERIFIED", "ACTIVE"], ["MP24568", "ERC20", "0x8A6Fe...c91bD", "$ 42.10", "VERIFIED", "ACTIVE"], ["MP24569", "BEP20", "0x12d8...9Ab2C", "$ 0.00", "PENDING", "REVIEW"], ["MP24570", "TRC20", "TK8u7F...jj7kP", "$ 8.50", "VERIFIED", "ACTIVE"]]} /></section></div>;
  if (page === "withdrawals") return <div className="mt-7"><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-black">Withdrawal Requests</h2><p className="mb-4 mt-1 text-xs text-slate-500">High-risk requests can be frozen before release.</p><PreviewTable headers={["Time", "User", "Amount", "Network", "Destination", "Status"]} rows={[["10:25", "MP24567", "$ 10.00", "TRC20", "TEW5W9...rPpd", "PENDING"], ["10:20", "MP24568", "$ 50.00", "ERC20", "0x91ab...2eF1", "REVIEW"], ["10:14", "MP24570", "$ 25.00", "BEP20", "0x7c31...5aE0", "ACTIVE"], ["10:09", "MP24571", "$ 100.00", "TRC20", "TK99x...7LmQ", "BLOCKED"]]} /></section><div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm"><b className="text-amber-700">RELEASE GATE</b><span className="ml-8 font-semibold">Confirm balance, destination network, risk score, admin policy and audit event.</span></div></div>;
  if (page === "transactions") return <div className="mt-7"><Input className="mb-5 bg-white" placeholder="Search TxID / User ID / Wallet Address" disabled /><PreviewTable headers={["TxID", "Type", "User", "Network", "Amount", "State", "Check"]} rows={[["a1b2c3...e5f66", "DEPOSIT", "MP24567", "TRC20", "$ 1,250", "PENDING", "CONTRACT OK"], ["0x7f6e...b2a1", "DEPOSIT", "MP24568", "ERC20", "$ 500", "VERIFIED", "CONTRACT OK"], ["0x2ab...c910", "DEPOSIT", "MP24570", "TRC20", "$ 10,000", "REJECTED", "FAKE CONTRACT"], ["0x91ab...2eF1", "WITHDRAW", "MP24568", "ERC20", "$ 50", "REVIEW", "RISK CHECK"]]} /></div>;
  if (page === "health") return <div className="mt-7"><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[["TRON NODE", "120 ms"], ["ETHEREUM NODE", "145 ms"], ["BSC NODE", "98 ms"], ["BLOCKCHAIN LISTENER", "99.9%"], ["RISK / AML API", "99.8%"], ["TX INDEXER", "99.7%"]].map(([name, metric]) => <section key={name} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-black">{name}</p><p className="mt-5 font-black text-emerald-600">Healthy</p><p className="mt-2 text-xs text-slate-500">{metric}</p></section>)}</div><section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-black">Fail-Closed Policy</h2><p className="mt-5 text-sm font-semibold">If a network or verification API is unhealthy, stop automatic wallet credits on that network.</p><p className="mt-5 text-sm text-slate-500">Keep deposits pending until service recovery and reconciliation. Never guess or manually mark verified without an audit trail.</p></section></div>;
  return <div className="mt-7"><div className="grid gap-5 md:grid-cols-2"><PreviewBulletCard title="Security Settings" items={["2FA for every admin", "Role-based permissions", "Two-person contract changes", "Withdrawal approval rules", "Session timeout"]} /><PreviewBulletCard title="Deposit Settings" items={["Minimum confirmations", "Supported networks", "Auto-credit policy", "Risk threshold", "Deposit limits"]} /></div><section className="mt-5 rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-black">Admin Audit Log</h2><p className="mb-4 mt-1 text-xs text-slate-500">Every sensitive action is recorded.</p><PreviewTable headers={["Time", "Actor", "Action", "Detail"]} rows={[["10:24", "Admin", "Approved deposit MP24567", "$ 1,250"], ["10:23", "Admin", "Rejected deposit", "Fake USDT contract"], ["10:22", "Compliance", "Updated KYC MP24520", "Verified"], ["10:19", "Security", "Blocked address", "0x91ab...2eF1"]]} /></section></div>;
}

function PreviewBulletCard({ title, items }: { title: string; items: string[] }) { return <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-black">{title}</h2><ul className="mt-5 space-y-4 text-sm text-slate-700">{items.map((item) => <li key={item} className="flex gap-3"><span className="text-violet-600">•</span>{item}</li>)}</ul></section>; }

function Login(p: { apiBase: string; setApiBase: (s: string) => void; mobile: string; setMobile: (s: string) => void; password: string; setPassword: (s: string) => void; otp: string; setOtp: (s: string) => void; otpRequested: boolean; requestOtp: (e: FormEvent) => void; verifyOtp: (e: FormEvent) => void }) { return <main className="grid min-h-screen place-items-center bg-[#071d1a] p-5"><Toaster richColors position="top-right" /><section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"><div className="grid size-12 place-items-center rounded-2xl bg-emerald-500 text-[#071d1a]"><ShieldCheck size={25} /></div><p className="mt-6 text-sm font-bold uppercase tracking-[.15em] text-emerald-700">Restricted access</p><h1 className="mt-2 text-3xl font-black">Admin Console</h1><p className="mt-2 text-base text-slate-600">Use an account that has been granted an Administrator role.</p><label className="mt-6 block text-sm font-bold text-slate-700">Backend API address<Input className="mt-2" value={p.apiBase} onChange={(e) => p.setApiBase(e.target.value)} /></label>{p.otpRequested ? <form onSubmit={p.verifyOtp} className="mt-6 space-y-4"><Input placeholder="6-digit OTP" inputMode="numeric" value={p.otp} onChange={(e) => p.setOtp(e.target.value)} required /><Button className="w-full bg-emerald-600 hover:bg-emerald-700">Verify and continue</Button></form> : <form onSubmit={p.requestOtp} className="mt-6 space-y-4"><Input placeholder="Mobile number" inputMode="numeric" value={p.mobile} onChange={(e) => p.setMobile(e.target.value)} required /><Input placeholder="Password" type="password" value={p.password} onChange={(e) => p.setPassword(e.target.value)} required /><Button className="w-full bg-emerald-600 hover:bg-emerald-700">Send OTP</Button></form>}</section></main>; }
function Nav({ icon, label, active = false, onClick }: { icon: ReactNode; label: string; active?: boolean; onClick?: () => void }) { return <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${active ? "bg-emerald-400 text-[#06201b]" : "text-emerald-100/70 hover:bg-emerald-50/10 hover:text-white"}`}>{icon}{label}</button>; }
function Metric({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between"><p className="text-sm font-bold text-slate-500">{label}</p><span className="text-emerald-600">{icon}</span></div><p className="mt-5 text-2xl font-black">{value}</p></div>; }
function Status({ status }: { status: string }) { const styles: Record<string, string> = { DRAFT: "bg-slate-100 text-slate-600", SOON: "bg-amber-100 text-amber-800", OPEN: "bg-emerald-100 text-emerald-800", LIVE: "bg-rose-100 text-rose-700", CLOSED: "bg-indigo-100 text-indigo-700", SETTLED: "bg-teal-100 text-teal-800", CANCELLED: "bg-slate-200 text-slate-600", PENDING_REVIEW: "bg-amber-100 text-amber-800", APPROVED: "bg-sky-100 text-sky-800", COMPLETED: "bg-emerald-100 text-emerald-800", REJECTED: "bg-rose-100 text-rose-700", FAILED: "bg-rose-100 text-rose-700" }; return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${styles[status] || "bg-slate-100 text-slate-600"}`}>{status}</span>; }

type StockIndex = { symbol: string; rawSymbol: string; name: string; value: string; rawValue: number; change: string; changeValue: string; isPositive: boolean; type?: string; provider?: string };
type MarketSearchItem = { instrumentCode: string; name: string; rawSymbol: string; quote?: { value?: string; rawValue?: number; change?: string; changeValue?: string; isPositive?: boolean } };

function toStockIndex(item: MarketSearchItem): StockIndex {
  return {
    symbol: item.instrumentCode,
    rawSymbol: item.rawSymbol,
    name: item.name,
    value: item.quote?.value || "—",
    rawValue: Number(item.quote?.rawValue || 0),
    change: item.quote?.change || "0.00%",
    changeValue: item.quote?.changeValue || "0.00",
    isPositive: Boolean(item.quote?.isPositive),
    type: "INDEX",
    provider: "yahoo",
  };
}

function CreateDialog({ open, onOpenChange, form, setForm, onSubmit, apiBase }: { open: boolean; onOpenChange: (o: boolean) => void; form: ContestDraft; setForm: (f: ContestDraft) => void; onSubmit: (e: FormEvent) => void; apiBase: string }) {
  const [indices, setIndices] = useState<StockIndex[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockIndex | null>(null);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<"ALL" | "INDEX">("ALL");

  useEffect(() => {
    if (!open) return;
    setLoadingStocks(true);
    fetch(`${apiBase.replace(/\/$/, "")}/market/search?q=all`)
      .then((res) => res.json())
      .then((data) => {
        const marketResponse = data as { data?: MarketSearchItem[] };
        if (marketResponse.data && Array.isArray(marketResponse.data)) {
          const supportedIndices = marketResponse.data.map(toStockIndex);
          setIndices(supportedIndices);
          if (supportedIndices.length > 0 && !selectedStock) {
            handleSelectStock(supportedIndices[0]);
          }
        }
      })
      .catch((err) => console.error("Error fetching market data:", err))
      .finally(() => setLoadingStocks(false));
  }, [open, apiBase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search only registered instruments that the current demo contest schema supports.
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    const timer = setTimeout(() => {
      setLoadingStocks(true);
      fetch(`${apiBase.replace(/\/$/, "")}/market/search?q=${encodeURIComponent(searchQuery)}`)
        .then((res) => res.json())
        .then((resData) => {
          const marketResponse = resData as { data?: MarketSearchItem[] };
          const matchingInstruments = marketResponse.data;
          if (Array.isArray(matchingInstruments) && matchingInstruments.length > 0) {
            setIndices((prev) => {
              const map = new Map(prev.map((i) => [i.symbol, i]));
              matchingInstruments.map(toStockIndex).forEach((item: StockIndex) => map.set(item.symbol, item));
              return Array.from(map.values());
            });
          }
        })
        .catch((err) => console.error("Search error:", err))
        .finally(() => setLoadingStocks(false));
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, apiBase]);

  const handleSelectStock = (stock: StockIndex) => {
    setSelectedStock(stock);
    const cleanSymbol = stock.symbol.replace(/[^a-zA-Z0-9]/g, "");
    const generatedId = `${cleanSymbol.toLowerCase()}-${Date.now().toString().slice(-5)}`;
    
    setForm({
      ...form,
      publicId: generatedId,
      instrumentCode: cleanSymbol,
      title: `${stock.name} Prediction`,
      question: `Will ${stock.name} close above ₹${stock.value} by market close?`,
      settlementSource: `${stock.name} official market closing price via Yahoo Finance`,
    });
  };

  const filteredList = useMemo(() => {
    return indices.filter((stk) => {
      const matchesCat = category === "ALL" || (category === "INDEX" ? stk.type === "INDEX" : stk.type !== "INDEX");
      const matchesSearch =
        !searchQuery.trim() ||
        stk.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stk.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [indices, category, searchQuery]);

  const field = (key: keyof ContestDraft, label: string, type = "text") => <label className="text-sm font-bold text-slate-700">{label}<Input className="mt-1.5" type={type} step={type === "number" ? "any" : undefined} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required /></label>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Contest from Market Data</DialogTitle>
          <DialogDescription>Select a registered live index to auto-fill a virtual-credit demo contest.</DialogDescription>
        </DialogHeader>

        {/* Live Stock / Index Selector & Search */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
              ⚡ Supported live indices ({filteredList.length} shown)
            </span>
            {loadingStocks && <span className="text-xs font-semibold text-emerald-600 animate-pulse">Loading live market feed...</span>}
          </div>

          {/* Search Bar & Category Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Search supported indices (e.g. NIFTY, SENSEX, BANK)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white text-xs h-8"
            />
            <div className="flex gap-1">
              {(["ALL", "INDEX"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                    category === cat
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50"
                  }`}
                >
                  {cat === "ALL" ? "All" : "Indices"}
                </button>
              ))}
            </div>
          </div>

          {/* Instrument Badges */}
          <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto">
            {filteredList.map((stk) => {
              const isSelected = selectedStock?.symbol === stk.symbol || form.instrumentCode === stk.symbol.replace(/[^a-zA-Z0-9]/g, "");
              return (
                <button
                  key={stk.symbol}
                  type="button"
                  onClick={() => handleSelectStock(stk)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-emerald-100/50"
                  }`}
                >
                  <span>{stk.name}</span>
                  <span className={`text-[11px] font-mono ${isSelected ? "text-emerald-100" : stk.isPositive ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}`}>
                    ₹{stk.value} ({stk.change})
                  </span>
                </button>
              );
            })}
            {filteredList.length === 0 && !loadingStocks && (
              <p className="text-xs text-slate-500 py-2">No supported index matches this search.</p>
            )}
          </div>

          {/* Selected Stock Live Card */}
          {selectedStock && (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-white p-2.5 text-xs border border-emerald-100 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-800">{selectedStock.name}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{selectedStock.rawSymbol}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">₹{selectedStock.value}</span>
                <span className={`font-semibold ${selectedStock.isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                  {selectedStock.change}
                </span>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                  Yahoo Live
                </span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 mt-2">
          {field("title", "Contest title")}
          {field("publicId", "Public ID")}
          {field("instrumentCode", "Instrument code")}
          {field("entryCredits", "Entry amount (Demo USDT, whole units)", "number")}
          {field("prizePoolCredits", "Prize pool (Demo USDT, whole units)", "number")}
          {field("playerCapacity", "Player capacity", "number")}
          <label className="text-sm font-bold text-slate-700">Lifecycle mode<select className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3" value={form.lifecycleMode} onChange={(e) => setForm({ ...form, lifecycleMode: e.target.value })}><option value="SCHEDULED">Scheduled automatically</option><option value="MANUAL">Manual status control</option></select></label>
          <label className="sm:col-span-2 text-sm font-bold text-slate-700">
            Question
            <textarea
              className="mt-1.5 min-h-20 w-full rounded-md border border-slate-200 p-3"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              required
            />
          </label>
          {field("opensAt", "Entry opens at", "datetime-local")}
          {field("liveAt", "Prediction closes / Live at", "datetime-local")}
          {field("closesAt", "Contest closes at", "datetime-local")}
          <label className="sm:col-span-2 text-sm font-bold text-slate-700">
            Settlement source
            <Input
              className="mt-1.5"
              value={form.settlementSource}
              onChange={(e) => setForm({ ...form, settlementSource: e.target.value })}
              required
            />
          </label>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              Create Draft Contest
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function SettleDialog({ contest, onOpenChange, closingValue, setClosingValue, onSubmit }: { contest: Contest | null; onOpenChange: (o: boolean) => void; closingValue: string; setClosingValue: (s: string) => void; onSubmit: (e: FormEvent) => void }) { return <Dialog open={Boolean(contest)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Settle {contest?.title}</DialogTitle><DialogDescription>Enter final demo closing value. Closest saved prediction wins; ties split the pool.</DialogDescription></DialogHeader><form onSubmit={onSubmit} className="space-y-4"><Input type="number" step="0.01" placeholder="Final closing value" value={closingValue} onChange={(e) => setClosingValue(e.target.value)} required /><DialogFooter><Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Confirm settlement</Button></DialogFooter></form></DialogContent></Dialog>; }

function PayoutDialog({ contest, winners, amount, setAmount, onOpenChange, onCreate }: { contest: Contest | null; winners: WinnerEntry[]; amount: string; setAmount: (value: string) => void; onOpenChange: (open: boolean) => void; onCreate: (entryId: string) => void }) { return <Dialog open={Boolean(contest)} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Create demo test payout</DialogTitle><DialogDescription>This creates a review-only test record. It will not send USDT, credit a balance, or create a blockchain transaction.</DialogDescription></DialogHeader><div className="space-y-4"><p className="text-sm font-bold">{contest?.title}</p><label className="block text-sm font-bold text-slate-700">Manual test amount (Demo USDT)<Input className="mt-1.5" type="number" min="0.000001" step="0.000001" placeholder="e.g. 5.000000" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>{winners.length === 0 ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No eligible winner with a linked TRC20 wallet was found. Link a test wallet before creating the payout.</p> : <div className="space-y-2">{winners.map((winner) => <div key={winner.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3"><div><p className="font-bold">{winner.mobile}</p><p className="text-xs text-slate-500">Won {winner.reward_credits} demo credits</p></div><Button size="sm" disabled={!Number(amount) || Number(amount) <= 0} onClick={() => onCreate(winner.id)}>Add to review</Button></div>)}</div>}<p className="text-xs leading-5 text-slate-500">The amount is intentionally entered manually for the demo. There is no approved credits-to-USDT conversion rule yet.</p></div></DialogContent></Dialog>; }
