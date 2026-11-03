"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nextContestStatus, type Contest } from "@/types/admin";

const columns = [
  { status: "DRAFT", label: "Draft", tone: "border-slate-200 bg-slate-50" },
  { status: "SOON", label: "Soon", tone: "border-amber-200 bg-amber-50/50" },
  { status: "OPEN", label: "Open", tone: "border-emerald-200 bg-emerald-50/50" },
  { status: "LIVE", label: "Live", tone: "border-rose-200 bg-rose-50/50" },
  { status: "CLOSED", label: "Closed", tone: "border-indigo-200 bg-indigo-50/50" },
  { status: "SETTLED", label: "Settled", tone: "border-teal-200 bg-teal-50/50" },
  { status: "CANCELLED", label: "Cancelled", tone: "border-slate-200 bg-slate-100/70" },
] as const;

const contestTypeLabels: Record<string, string> = {
  DAY_OPEN: "Day Open",
  ONE_HOUR: "10 AM",
  MIDDAY: "Midday",
  CLOSING: "Closing",
  NEXT_DAY_CLOSE: "Next-day close",
  CUSTOM: "Custom",
};

function formatTime(value?: string | null) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "—";
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function Milestone({ contest }: { contest: Contest }) {
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

export function ContestKanbanView({ contests, onViewDetails, onAdvance, onSettle }: { contests: Contest[]; onViewDetails: (publicId: string) => void; onAdvance: (contest: Contest) => void; onSettle: (contest: Contest) => void }) {
  return <div className="overflow-x-auto px-5 pb-5 pt-4">
    <div className="grid min-w-[1770px] grid-cols-7 gap-3">
      {columns.map((column) => {
        const cards = contests.filter((contest) => contest.status === column.status);
        return <section key={column.status} className={`min-h-[360px] rounded-xl border p-3 ${column.tone}`}>
          <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-black text-slate-900">{column.label}</h3><span className="grid size-6 place-items-center rounded-full bg-white text-xs font-black text-slate-600 shadow-sm">{cards.length}</span></div>
          <div className="space-y-3">
            {cards.map((contest) => <KanbanCard key={contest.public_id} contest={contest} onViewDetails={onViewDetails} onAdvance={onAdvance} onSettle={onSettle} />)}
            {!cards.length && <div className="rounded-lg border border-dashed border-slate-300/80 bg-white/50 px-3 py-5 text-center text-xs font-semibold text-slate-400">No {column.label.toLowerCase()} contests</div>}
          </div>
        </section>;
      })}
    </div>
  </div>;
}

function KanbanCard({ contest, onViewDetails, onAdvance, onSettle }: { contest: Contest; onViewDetails: (publicId: string) => void; onAdvance: (contest: Contest) => void; onSettle: (contest: Contest) => void }) {
  const next = nextContestStatus[contest.status];
  const unit = contest.is_demo_usdt ? "Demo USDT" : "credits";
  const type = contestTypeLabels[String(contest.contest_type || "CUSTOM").toUpperCase()] || "Scheduled";
  return <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
    <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">{type}</p>
    <h4 className="mt-1 line-clamp-2 text-sm font-black text-slate-950">{contest.title}</h4>
    <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-500">{contest.question}</p>
    <div className="mt-3 rounded-lg bg-slate-50 p-2.5"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Current milestone</p><p className="mt-1 text-xs font-black text-slate-700"><Milestone contest={contest} /></p></div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><p className="font-bold text-slate-400">Players</p><p className="mt-0.5 flex items-center gap-1 font-black text-slate-800"><Users size={13} /> {contest.player_count} / {contest.player_capacity}</p></div><div><p className="font-bold text-slate-400">Pool</p><p className="mt-0.5 font-black text-slate-800">{contest.prize_pool_credits} {unit}</p></div></div>
    <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-500">Target / close: {formatTime(contest.closes_at)}</p>
    <div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => onViewDetails(contest.public_id)}>Details</Button>{contest.status === "CLOSED" ? <Button size="sm" onClick={() => onSettle(contest)}>Settle</Button> : contest.status === "SETTLED" ? <span className="self-center text-[11px] font-bold text-emerald-700">Rewards credited</span> : next ? <Button size="sm" variant="outline" onClick={() => onAdvance(contest)}>{next}<ChevronRight size={14} /></Button> : null}</div>
  </article>;
}
