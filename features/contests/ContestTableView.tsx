"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { nextContestStatus, type Contest } from "@/types/admin";

const typeLabels: Record<string, string> = {
  DAY_OPEN: "Day Open",
  ONE_HOUR: "10 AM",
  MIDDAY: "Midday",
  CLOSING: "Closing",
  NEXT_DAY_CLOSE: "Next-day close",
  CUSTOM: "Custom",
};

const statusTones: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SOON: "bg-amber-100 text-amber-800",
  OPEN: "bg-emerald-100 text-emerald-800",
  LIVE: "bg-rose-100 text-rose-700",
  CLOSED: "bg-indigo-100 text-indigo-700",
  SETTLED: "bg-teal-100 text-teal-800",
  CANCELLED: "bg-slate-200 text-slate-600",
};

function formatTime(value?: string | null) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "—";
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function LiveMilestone({ contest }: { contest: Contest }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (contest.status === "DRAFT") return <span>Needs publishing</span>;
  if (contest.status === "CLOSED") return <span>Awaiting settlement</span>;
  if (contest.status === "SETTLED") return <span>Rewards credited</span>;
  if (contest.status === "CANCELLED") return <span>Cancelled</span>;
  const target = contest.status === "SOON" ? contest.opens_at : contest.status === "OPEN" ? contest.live_at || contest.closes_at : contest.closes_at;
  const label = contest.status === "SOON" ? "Entries open in" : contest.status === "OPEN" ? "Prediction locks in" : "Target value in";
  if (!target || !Number.isFinite(new Date(target).getTime())) return <span>Schedule unavailable</span>;
  const seconds = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
  const time = [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60].map((part) => String(part).padStart(2, "0")).join(":");
  return <span>{label} {time}</span>;
}

export function ContestTableView({ contests, loading, onViewDetails, onAdvance, onSettle }: { contests: Contest[]; loading: boolean; onViewDetails: (publicId: string) => void; onAdvance: (contest: Contest) => void; onSettle: (contest: Contest) => void }) {
  return <div className="overflow-x-auto">
    <Table>
      <TableHeader className="bg-slate-50/80"><TableRow>
        <TableHead>Contest</TableHead><TableHead>Lifecycle</TableHead><TableHead>Schedule (IST)</TableHead><TableHead>Live milestone</TableHead><TableHead>Participation</TableHead><TableHead>Demo USDT</TableHead><TableHead>Result</TableHead><TableHead className="text-right">Action</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {contests.map((contest) => <ContestRow key={contest.public_id} contest={contest} onViewDetails={onViewDetails} onAdvance={onAdvance} onSettle={onSettle} />)}
        {!loading && contests.length === 0 && <TableRow><TableCell colSpan={8} className="py-14 text-center text-slate-500">No contests in this status.</TableCell></TableRow>}
      </TableBody>
    </Table>
  </div>;
}

function ContestRow({ contest, onViewDetails, onAdvance, onSettle }: { contest: Contest; onViewDetails: (publicId: string) => void; onAdvance: (contest: Contest) => void; onSettle: (contest: Contest) => void }) {
  const unit = contest.is_demo_usdt ? "Demo USDT" : "credits";
  const fill = Math.min(100, Math.round((Number(contest.player_count || 0) / Math.max(1, Number(contest.player_capacity || 1))) * 100));
  const next = nextContestStatus[contest.status];
  const type = typeLabels[String(contest.contest_type || "CUSTOM").toUpperCase()] || "Scheduled";
  const result = contest.status === "SETTLED" ? "Settled · rewards credited" : contest.status === "CLOSED" ? "Awaiting automatic settlement" : contest.status === "CANCELLED" ? "Cancelled" : "Result pending";
  return <TableRow>
    <TableCell className="min-w-[220px]"><p className="font-black text-slate-950">{contest.title}</p><p className="mt-1 max-w-[260px] truncate text-xs text-slate-500">{contest.question}</p><span className="mt-2 inline-flex rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">{type}</span></TableCell>
    <TableCell className="min-w-[120px]"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${statusTones[contest.status] || "bg-slate-100 text-slate-600"}`}>{contest.status}</span><p className="mt-2 text-[11px] font-bold text-slate-500">{contest.lifecycle_mode === "SCHEDULED" ? "Automatic lifecycle" : "Manual lifecycle"}</p></TableCell>
    <TableCell className="min-w-[205px] text-xs"><Schedule label="Open" value={formatTime(contest.opens_at)} /><Schedule label="Lock" value={formatTime(contest.live_at || contest.closes_at)} /><Schedule label="Target" value={formatTime(contest.closes_at)} /></TableCell>
    <TableCell className="min-w-[155px] text-xs font-black text-slate-700"><LiveMilestone contest={contest} /></TableCell>
    <TableCell className="min-w-[135px]"><p className="text-sm font-black text-slate-800">{contest.player_count} / {contest.player_capacity}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${fill}%` }} /></div><p className="mt-1 text-[11px] font-bold text-slate-500">{fill}% filled</p></TableCell>
    <TableCell className="min-w-[135px]"><p className="font-black text-slate-800">{contest.prize_pool_credits} {unit}</p><p className="mt-1 text-[11px] font-bold text-slate-500">Entry {contest.entry_credits} {unit}</p></TableCell>
    <TableCell className="min-w-[145px]"><p className={`text-xs font-black ${contest.status === "SETTLED" ? "text-teal-700" : contest.status === "CANCELLED" ? "text-slate-500" : "text-slate-600"}`}>{result}</p></TableCell>
    <TableCell className="min-w-[185px] text-right"><div className="flex flex-wrap justify-end gap-2"><Button type="button" size="sm" variant="outline" onClick={() => onViewDetails(contest.public_id)}>View Details</Button>{contest.status === "CLOSED" ? <Button size="sm" onClick={() => onSettle(contest)}>Settle</Button> : contest.status === "SETTLED" ? null : next ? <Button size="sm" variant="outline" onClick={() => onAdvance(contest)}>{next}<ChevronRight size={15} /></Button> : null}</div></TableCell>
  </TableRow>;
}

function Schedule({ label, value }: { label: string; value: string }) {
  return <p className="flex gap-2 py-0.5"><span className="w-11 font-bold text-slate-400">{label}</span><span className="font-bold text-slate-700">{value}</span></p>;
}
