"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Activity, ChevronRight, ClipboardList, LogOut, Plus, RefreshCw, ShieldCheck, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";

type Contest = { public_id: string; title: string; question: string; status: string; entry_credits: number; prize_pool_credits: number; player_capacity: number; player_count: number; lifecycle_mode?: string; live_at?: string | null; closes_at: string };
type WinnerEntry = { id: string; mobile: string; status: string; reward_credits: number };
type DemoPayout = { id: string; title: string; mobile: string; wallet_address: string; amount_usdt: string; status: string; created_at: string; simulated_tx_hash?: string | null };
const statuses = ["ALL", "DRAFT", "SOON", "OPEN", "LIVE", "CLOSED", "SETTLED", "CANCELLED"];
const nextStatus: Record<string, string | undefined> = { DRAFT: "SOON", SOON: "OPEN", OPEN: "LIVE", LIVE: "CLOSED" };
const nowInput = (hours: number) => new Date(Date.now() + hours * 3600000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
// datetime-local values have no timezone. Convert the administrator's browser-local
// selection into an absolute UTC instant before the API receives it.
const toUtcIso = (value: string) => new Date(value).toISOString();
const STAGING_API_BASE = "https://13.126.195.235.nip.io/api";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [apiBase, setApiBase] = useState(STAGING_API_BASE);
  const [token, setToken] = useState("");
  const [mobile, setMobile] = useState(""); const [password, setPassword] = useState(""); const [otp, setOtp] = useState(""); const [otpRequested, setOtpRequested] = useState(false);
  const [filter, setFilter] = useState("ALL"); const [contests, setContests] = useState<Contest[]>([]); const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false); const [settling, setSettling] = useState<Contest | null>(null); const [closingValue, setClosingValue] = useState("");
  const [payouts, setPayouts] = useState<DemoPayout[]>([]); const [payoutLoading, setPayoutLoading] = useState(false); const [payoutContest, setPayoutContest] = useState<Contest | null>(null); const [winners, setWinners] = useState<WinnerEntry[]>([]); const [payoutAmount, setPayoutAmount] = useState("");
  const [form, setForm] = useState({ publicId: "", title: "", question: "", instrumentCode: "NIFTY50", entryCredits: "50", prizePoolCredits: "1000", playerCapacity: "100", lifecycleMode: "SCHEDULED", opensAt: nowInput(2), liveAt: nowInput(4), closesAt: nowInput(6), settlementSource: "Demo market reference" });

  useEffect(() => {
    setMounted(true);
    const savedToken = sessionStorage.getItem("marketpe_admin_token");
    const savedApi = sessionStorage.getItem("marketpe_admin_api_base");
    if (savedToken) setToken(savedToken);
    if (savedApi) setApiBase(savedApi);
  }, []);

  const request = async (path: string, options: RequestInit = {}) => { const response = await fetch(`${apiBase.replace(/\/$/, "")}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || "Request failed"); return data; };
  const load = async () => { if (!token) return; setLoading(true); try { const data = await request(`/admin/contests?status=${filter}`); setContests(data.contests || []); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not load contests"); } finally { setLoading(false); } };
  const loadPayouts = async () => { if (!token) return; setPayoutLoading(true); try { const data = await request("/admin/demo-payouts"); setPayouts(data.payouts || []); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not load demo payout queue"); } finally { setPayoutLoading(false); } };
  useEffect(() => { if (!mounted) return; const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [token, filter, mounted]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!mounted || !token) return; void loadPayouts(); }, [token, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestOtp = async (event: FormEvent) => { event.preventDefault(); try { await request("/auth/signin", { method: "POST", body: JSON.stringify({ mobile, password }) }); setOtpRequested(true); toast.success("OTP sent. Enter it to continue."); } catch (e) { toast.error(e instanceof Error ? e.message : "Sign-in failed"); } };
  const verifyOtp = async (event: FormEvent) => { event.preventDefault(); try { const data = await request("/auth/verify-otp", { method: "POST", body: JSON.stringify({ mobile, otp, purpose: "signin" }) }); sessionStorage.setItem("marketpe_admin_token", data.token); sessionStorage.setItem("marketpe_admin_api_base", apiBase); setToken(data.token); toast.success("Admin session started"); } catch (e) { toast.error(e instanceof Error ? e.message : "OTP verification failed"); } };
  const create = async (event: FormEvent) => { event.preventDefault(); try { await request("/admin/contests", { method: "POST", body: JSON.stringify({ ...form, opensAt: toUtcIso(form.opensAt), liveAt: toUtcIso(form.liveAt), closesAt: toUtcIso(form.closesAt), entryCredits: Number(form.entryCredits), prizePoolCredits: Number(form.prizePoolCredits), playerCapacity: Number(form.playerCapacity), status: "DRAFT" }) }); setCreateOpen(false); toast.success("Draft contest created"); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not create contest"); } };
  const advance = async (contest: Contest) => { const status = nextStatus[contest.status]; if (!status) return; try { await request(`/admin/contests/${contest.public_id}/status`, { method: "PUT", body: JSON.stringify({ status }) }); toast.success(`${contest.title} is now ${status}`); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Status update failed"); } };
  const settle = async (event: FormEvent) => { event.preventDefault(); if (!settling) return; try { const data = await request(`/admin/contests/${settling.public_id}/settle`, { method: "POST", body: JSON.stringify({ closingValue: Number(closingValue), settlementNotes: "Settled from Admin Console" }) }); toast.success(`Settlement complete: ${data.contest.winnerCount} winner(s)`); setSettling(null); setClosingValue(""); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Settlement failed"); } };
  const openPayout = async (contest: Contest) => { try { const data = await request(`/admin/contests/${contest.public_id}/entries`); setWinners((data.entries || []).filter((entry: WinnerEntry) => entry.status === "WON")); setPayoutContest(contest); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not load contest winners"); } };
  const createPayout = async (entryId: string) => { if (!payoutContest) return; try { await request(`/admin/contests/${payoutContest.public_id}/demo-payouts`, { method: "POST", body: JSON.stringify({ entryId, amountUsdt: Number(payoutAmount), note: "Review-only test payout" }) }); toast.success("Test payout added to review queue"); setPayoutContest(null); setPayoutAmount(""); loadPayouts(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not create test payout"); } };
  const changePayout = async (payout: DemoPayout, action: "approve" | "complete" | "reject") => { try { if (action === "reject" && !window.confirm("Reject this review-only test payout? No real USDT can be sent by this flow.")) return; await request(`/admin/demo-payouts/${payout.id}/${action}`, { method: "POST", body: JSON.stringify({ note: action === "reject" ? "Rejected from Admin Console" : "Admin test action" }) }); toast.success(action === "approve" ? "Test payout approved" : action === "complete" ? "Test payout marked completed" : "Test payout rejected"); loadPayouts(); } catch (e) { toast.error(e instanceof Error ? e.message : "Payout action failed"); } };
  const stats = useMemo(() => ({ open: contests.filter((c) => c.status === "OPEN").length, live: contests.filter((c) => c.status === "LIVE").length, entries: contests.reduce((n, c) => n + Number(c.player_count), 0), pool: contests.reduce((n, c) => n + Number(c.prize_pool_credits), 0) }), [contests]);

  if (!mounted) return <div className="min-h-screen bg-[#071d1a]" />;
  if (!token) return <Login apiBase={apiBase} setApiBase={setApiBase} mobile={mobile} setMobile={setMobile} password={password} setPassword={setPassword} otp={otp} setOtp={setOtp} otpRequested={otpRequested} requestOtp={requestOtp} verifyOtp={verifyOtp} />;
  return <main className="min-h-screen bg-[#f3f7f5] text-slate-950"><Toaster richColors position="top-right" /><div className="grid min-h-screen lg:grid-cols-[248px_1fr]"><aside className="border-b border-emerald-950/20 bg-[#071d1a] px-5 py-6 text-emerald-50 lg:border-b-0 lg:border-r"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-[#071d1a]"><Activity size={21} /></div><div><p className="text-lg font-black">MarketPe</p><p className="text-xs text-emerald-100/60">Admin Console</p></div></div><nav className="mt-9 space-y-2"><Nav active icon={<ClipboardList size={18} />} label="Contest operations" /><Nav icon={<Users size={18} />} label="Client directory" /><Nav icon={<Trophy size={18} />} label="Audit & risk" /></nav><div className="mt-8 rounded-xl border border-emerald-300/15 bg-emerald-400/5 p-4 text-sm leading-5 text-emerald-100/75"><b className="text-emerald-200">Demo environment</b><br />Virtual credits only. No USDT or real-money action is enabled.</div><Button variant="ghost" className="mt-8 w-full justify-start text-emerald-100 hover:bg-emerald-50/10 hover:text-white" onClick={() => { sessionStorage.removeItem("marketpe_admin_token"); setToken(""); }}><LogOut size={17} /> Sign out</Button></aside><section className="min-w-0 p-5 md:p-8 lg:p-10"><header className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-[.16em] text-emerald-700">Operations / contests</p><h1 className="mt-2 text-3xl font-black tracking-tight">Contest control room</h1><p className="mt-2 text-base text-slate-600">Create, launch, close, and settle virtual-credit prediction contests with real-time stock feeds.</p></div><Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setCreateOpen(true)}><Plus size={18} /> Create contest</Button></header><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Open contests" value={stats.open} icon={<ClipboardList />} /><Metric label="Live contests" value={stats.live} icon={<Activity />} /><Metric label="Entries shown" value={stats.entries.toLocaleString("en-IN")} icon={<Users />} /><Metric label="Demo prize pool" value={`${stats.pool.toLocaleString("en-IN")} cr`} icon={<Trophy />} /></div><section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between"><div><h2 className="text-lg font-extrabold">Contests</h2><p className="mt-1 text-sm text-slate-500">Only valid lifecycle transitions are available.</p></div><Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh</Button></div><div className="flex gap-2 overflow-auto border-b border-slate-100 px-5 py-3">{statuses.map((status) => <button key={status} onClick={() => setFilter(status)} className={`rounded-full px-3 py-1.5 text-sm font-bold ${filter === status ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-emerald-50"}`}>{status}</button>)}</div><Table><TableHeader><TableRow><TableHead>Contest</TableHead><TableHead>Status</TableHead><TableHead>Entries</TableHead><TableHead>Demo pool</TableHead><TableHead>Closes</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{contests.map((contest) => <TableRow key={contest.public_id}><TableCell><p className="font-bold">{contest.title}</p><p className="max-w-[260px] truncate text-xs text-slate-500">{contest.question}</p></TableCell><TableCell><Status status={contest.status} /></TableCell><TableCell>{contest.player_count.toLocaleString("en-IN")} / {contest.player_capacity.toLocaleString("en-IN")}</TableCell><TableCell>{contest.prize_pool_credits.toLocaleString("en-IN")} cr</TableCell><TableCell className="text-slate-600">{new Date(contest.closes_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</TableCell><TableCell className="text-right">{contest.status === "CLOSED" ? <Button size="sm" onClick={() => setSettling(contest)}>Settle</Button> : contest.status === "SETTLED" ? <Button size="sm" variant="outline" onClick={() => openPayout(contest)}>Test payout</Button> : nextStatus[contest.status] ? <Button size="sm" variant="outline" onClick={() => advance(contest)}>{nextStatus[contest.status]} <ChevronRight size={15} /></Button> : <span className="text-xs font-bold text-slate-400">No action</span>}</TableCell></TableRow>)}{!loading && contests.length === 0 && <TableRow><TableCell colSpan={6} className="py-14 text-center text-slate-500">No contests in this status.</TableCell></TableRow>}</TableBody></Table></section><section className="mt-8 rounded-2xl border border-amber-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-amber-100 p-5"><div><h2 className="text-lg font-extrabold">Demo test payout queue</h2><p className="mt-1 text-sm text-slate-500">Review-only records. No USDT, blockchain transaction, or ledger credit is created.</p></div><Button variant="outline" onClick={loadPayouts} disabled={payoutLoading}><RefreshCw className={payoutLoading ? "animate-spin" : ""} size={16} /> Refresh</Button></div><Table><TableHeader><TableRow><TableHead>Contest / user</TableHead><TableHead>Demo amount</TableHead><TableHead>Destination</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{payouts.map((payout) => <TableRow key={payout.id}><TableCell><p className="font-bold">{payout.title}</p><p className="text-xs text-slate-500">{payout.mobile}</p></TableCell><TableCell>{payout.amount_usdt} Demo USDT</TableCell><TableCell className="font-mono text-xs">{payout.wallet_address}</TableCell><TableCell><Status status={payout.status} /></TableCell><TableCell className="text-right">{payout.status === "PENDING_REVIEW" ? <div className="flex justify-end gap-2"><Button size="sm" onClick={() => changePayout(payout, "approve")}>Approve test</Button><Button size="sm" variant="outline" onClick={() => changePayout(payout, "reject")}>Reject</Button></div> : payout.status === "APPROVED" ? <div className="flex justify-end gap-2"><Button size="sm" onClick={() => changePayout(payout, "complete")}>Mark complete</Button><Button size="sm" variant="outline" onClick={() => changePayout(payout, "reject")}>Reject</Button></div> : <span className="text-xs font-bold text-slate-400">{payout.simulated_tx_hash ? "Simulated" : "No action"}</span>}</TableCell></TableRow>)}{!payoutLoading && payouts.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">No demo payouts yet.</TableCell></TableRow>}</TableBody></Table></section></section></div><CreateDialog open={createOpen} onOpenChange={setCreateOpen} form={form} setForm={setForm} onSubmit={create} apiBase={apiBase} /><SettleDialog contest={settling} onOpenChange={(open) => !open && setSettling(null)} closingValue={closingValue} setClosingValue={setClosingValue} onSubmit={settle} /><PayoutDialog contest={payoutContest} winners={winners} amount={payoutAmount} setAmount={setPayoutAmount} onOpenChange={(open) => !open && setPayoutContest(null)} onCreate={createPayout} /></main>;
}

function Login(p: { apiBase: string; setApiBase: (s: string) => void; mobile: string; setMobile: (s: string) => void; password: string; setPassword: (s: string) => void; otp: string; setOtp: (s: string) => void; otpRequested: boolean; requestOtp: (e: FormEvent) => void; verifyOtp: (e: FormEvent) => void }) { return <main className="grid min-h-screen place-items-center bg-[#071d1a] p-5"><Toaster richColors position="top-right" /><section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"><div className="grid size-12 place-items-center rounded-2xl bg-emerald-500 text-[#071d1a]"><ShieldCheck size={25} /></div><p className="mt-6 text-sm font-bold uppercase tracking-[.15em] text-emerald-700">Restricted access</p><h1 className="mt-2 text-3xl font-black">Admin Console</h1><p className="mt-2 text-base text-slate-600">Use an account that has been granted an Administrator role.</p><label className="mt-6 block text-sm font-bold text-slate-700">Backend API address<Input className="mt-2" value={p.apiBase} onChange={(e) => p.setApiBase(e.target.value)} /></label>{p.otpRequested ? <form onSubmit={p.verifyOtp} className="mt-6 space-y-4"><Input placeholder="6-digit OTP" inputMode="numeric" value={p.otp} onChange={(e) => p.setOtp(e.target.value)} required /><Button className="w-full bg-emerald-600 hover:bg-emerald-700">Verify and continue</Button></form> : <form onSubmit={p.requestOtp} className="mt-6 space-y-4"><Input placeholder="Mobile number" inputMode="numeric" value={p.mobile} onChange={(e) => p.setMobile(e.target.value)} required /><Input placeholder="Password" type="password" value={p.password} onChange={(e) => p.setPassword(e.target.value)} required /><Button className="w-full bg-emerald-600 hover:bg-emerald-700">Send OTP</Button></form>}</section></main>; }
function Nav({ icon, label, active = false }: { icon: ReactNode; label: string; active?: boolean }) { return <div className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold ${active ? "bg-emerald-400 text-[#06201b]" : "text-emerald-100/70"}`}>{icon}{label}</div>; }
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

function CreateDialog({ open, onOpenChange, form, setForm, onSubmit, apiBase }: { open: boolean; onOpenChange: (o: boolean) => void; form: Record<string, string>; setForm: (f: Record<string, string>) => void; onSubmit: (e: FormEvent) => void; apiBase: string }) {
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
        if (data?.data && Array.isArray(data.data)) {
          const supportedIndices = data.data.map(toStockIndex);
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
          if (resData?.data && Array.isArray(resData.data) && resData.data.length > 0) {
            setIndices((prev) => {
              const map = new Map(prev.map((i) => [i.symbol, i]));
              resData.data.map(toStockIndex).forEach((item: StockIndex) => map.set(item.symbol, item));
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

  const field = (key: string, label: string, type = "text") => <label className="text-sm font-bold text-slate-700">{label}<Input className="mt-1.5" type={type} step={type === "number" ? "any" : undefined} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required /></label>;

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
          {field("entryCredits", "Entry credits", "number")}
          {field("prizePoolCredits", "Demo prize pool", "number")}
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
