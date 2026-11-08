"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Flag, LockKeyhole, TimerReset } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ApiRequest } from "@/services/api-client";
import { createBulkScheduledContests } from "./contest.api";

type Instrument = { instrumentCode: string; name: string; quote?: { value?: string; change?: string; isPositive?: boolean } };

const templates = [
  { value: "DAY_OPEN", label: "Day Open Prediction", detail: "Target 9:15 AM · entries lock 8:59 AM", opens: "Previous trading day · 3:31 PM", locks: "Target day · 8:59 AM", target: "Target day · 9:15 AM" },
  { value: "ONE_HOUR", label: "10 AM Prediction", detail: "Target 10:00 AM · entries lock 8:59 AM", opens: "Previous trading day · 3:31 PM", locks: "Target day · 8:59 AM", target: "Target day · 10:00 AM" },
  { value: "MIDDAY", label: "Midday Prediction", detail: "Target 12:00 PM · entries lock 10:45 AM", opens: "Target day · 9:15 AM", locks: "Target day · 10:45 AM", target: "Target day · 12:00 PM" },
  { value: "CLOSING", label: "Closing Prediction", detail: "Target 3:30 PM · entries lock 9:00 AM", opens: "Previous trading day · 3:31 PM", locks: "Target day · 9:00 AM", target: "Target day · 3:30 PM" },
  { value: "NEXT_DAY_CLOSE", label: "Next-day Closing Prediction", detail: "Target next trading-day close · entries lock prior close", opens: "Previous trading day · 9:15 AM", locks: "Previous trading day · 3:30 PM", target: "Target day · 3:30 PM" },
  { value: "CUSTOM", label: "Custom schedule", detail: "Set every lifecycle time manually", opens: "Selected open time", locks: "Selected lock time", target: "Selected target time" },
] as const;

const dateOnly = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

function previewDays(startDate: string, count: number, excluded: Set<string>) {
  const dates: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return dates;
  const cursor = new Date(`${startDate}T00:00:00Z`);
  for (let scanned = 0; dates.length < count && scanned < 90; scanned += 1) {
    const date = cursor.toISOString().slice(0, 10);
    if (cursor.getUTCDay() !== 0 && cursor.getUTCDay() !== 6 && !excluded.has(date)) dates.push(date);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function Timeline({ template }: { template: (typeof templates)[number] }) {
  const milestones = [
    ["Entries open", template.opens, TimerReset, "text-amber-600 bg-amber-100"],
    ["Prediction locks", template.locks, LockKeyhole, "text-sky-600 bg-sky-100"],
    ["Target & settlement", template.target, Flag, "text-emerald-700 bg-emerald-100"],
  ] as const;
  return <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4"><p className="mb-4 text-xs font-black uppercase tracking-[.14em] text-amber-900">Automated contest timeline</p><div className="grid gap-3 md:grid-cols-3">{milestones.map(([label, value, Icon, tone]) => <div key={label} className="rounded-xl bg-white/70 p-3"><div className="flex items-center gap-2"><span className={`grid size-8 place-items-center rounded-full ${tone}`}><Icon size={15} /></span><span className="text-sm font-black text-slate-900">{label}</span></div><p className="mt-2 text-sm font-bold text-slate-700">{value}</p></div>)}</div></section>;
}

export function BulkScheduleDialog({ open, onOpenChange, request, apiBase, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; request: ApiRequest; apiBase: string; onCreated: () => void }) {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({ instrumentCode: "NIFTY50", startDate: dateOnly(new Date(Date.now() + 86400000)), tradingDays: "10", contestType: "CLOSING", opensTime: "09:15", liveTime: "15:15", closesTime: "15:35", entryCredits: "50", prizePoolCredits: "1000", playerCapacity: "100", excludedDates: "" });

  useEffect(() => {
    if (!open) return;
    setSearchQuery("");
    fetch(`${apiBase.replace(/\/$/, "")}/market/search?q=all`)
      .then((response) => response.json())
      .then((data) => setInstruments(Array.isArray(data?.data) ? data.data : []))
      .catch(() => setInstruments([]));
  }, [open, apiBase]);

  const exclusions = useMemo(() => new Set(form.excludedDates.split(",").map((value) => value.trim()).filter(Boolean)), [form.excludedDates]);
  const preview = useMemo(() => previewDays(form.startDate, Math.min(31, Math.max(1, Number(form.tradingDays) || 1)), exclusions), [form.startDate, form.tradingDays, exclusions]);
  const selectedTemplate = templates.find((template) => template.value === form.contestType) || templates[0];
  const visibleInstruments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return query ? instruments.filter((item) => `${item.name} ${item.instrumentCode}`.toLowerCase().includes(query)) : instruments;
  }, [instruments, searchQuery]);
  const update = (key: keyof typeof form, value: string) => setForm((previous) => ({ ...previous, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await createBulkScheduledContests(request, {
        instrumentCode: form.instrumentCode, startDate: form.startDate, tradingDays: Number(form.tradingDays),
        contestType: form.contestType === "CUSTOM" ? undefined : form.contestType,
        opensTime: form.opensTime, liveTime: form.liveTime, closesTime: form.closesTime,
        entryCredits: Number(form.entryCredits), prizePoolCredits: Number(form.prizePoolCredits), playerCapacity: Number(form.playerCapacity),
        excludedDates: [...exclusions], currency: "DEMO_USDT", settlementSource: "Automatic market snapshot near scheduled close",
      });
      toast.success(`${result.schedule.created.length} contests scheduled. ${result.schedule.skipped.length} non-trading/past date(s) skipped.`);
      onOpenChange(false);
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not schedule contests");
    } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-4xl"><DialogHeader className="border-b border-slate-100 px-6 pb-5 pt-6"><div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><CalendarDays size={22} /></span><div><DialogTitle className="text-2xl">Schedule market-day contests</DialogTitle><DialogDescription className="mt-1.5 max-w-2xl">Create Demo USDT contests for upcoming market days. Weekends, entered NSE holidays, and past entry windows are skipped automatically.</DialogDescription></div></div></DialogHeader><form onSubmit={submit} className="space-y-5 px-6 py-5">
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-sm font-extrabold text-slate-900">Select index</p><p className="mt-1 text-xs font-medium text-slate-500">Choose the market index for every contest in this schedule.</p><Input className="mt-3 h-9 bg-white text-xs" placeholder="Search supported indices (e.g. NIFTY, SENSEX, BANK)..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /><div className="mt-3 grid max-h-60 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 md:grid-cols-3">{(visibleInstruments.length ? visibleInstruments : [{ instrumentCode: "NIFTY50", name: "NIFTY 50" }]).map((instrument) => <IndexCard key={instrument.instrumentCode} instrument={instrument} selected={form.instrumentCode === instrument.instrumentCode} onSelect={() => update("instrumentCode", instrument.instrumentCode)} />)}{visibleInstruments.length === 0 && instruments.length > 0 && <p className="col-span-full py-3 text-xs text-slate-500">No supported index matches this search.</p>}</div></section>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Contest type"><select className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-bold" value={form.contestType} onChange={(event) => update("contestType", event.target.value)}>{templates.map((template) => <option key={template.value} value={template.value}>{template.label}</option>)}</select></Field><Field label="Start target date"><Input type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} required /></Field><Field label="Trading days (max 31)"><Input type="number" min="1" max="31" value={form.tradingDays} onChange={(event) => update("tradingDays", event.target.value)} required /></Field><Field label="Entry amount (Demo USDT)"><Input type="number" min="1" value={form.entryCredits} onChange={(event) => update("entryCredits", event.target.value)} required /></Field><Field label="Prize pool (Demo USDT)"><Input type="number" min="1" value={form.prizePoolCredits} onChange={(event) => update("prizePoolCredits", event.target.value)} required /></Field><Field label="Player capacity"><Input type="number" min="1" value={form.playerCapacity} onChange={(event) => update("playerCapacity", event.target.value)} required /></Field><Field label="Excluded NSE holidays (optional)"><Input placeholder="YYYY-MM-DD, YYYY-MM-DD" value={form.excludedDates} onChange={(event) => update("excludedDates", event.target.value)} /></Field>{form.contestType === "CUSTOM" && <><Field label="Entries open (IST)"><Input type="time" value={form.opensTime} onChange={(event) => update("opensTime", event.target.value)} required /></Field><Field label="Prediction locks (IST)"><Input type="time" value={form.liveTime} onChange={(event) => update("liveTime", event.target.value)} required /></Field><Field label="Target & settlement (IST)"><Input type="time" value={form.closesTime} onChange={(event) => update("closesTime", event.target.value)} required /></Field></>}</div>
    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950"><div className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-sky-600 text-white">i</span><div><p className="font-black">{selectedTemplate.label}</p><p className="mt-1 text-sm leading-5">{selectedTemplate.detail}. The target date is the settlement date; any prior-trading-day timing is calculated automatically.</p></div></div></section><PrizeScheduleNote />{form.contestType !== "CUSTOM" && <Timeline template={selectedTemplate} />}<Preview preview={preview} />
    <DialogFooter className="sticky bottom-0 -mx-6 border-t border-slate-100 bg-white px-6 pb-5 pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving}>{saving ? "Scheduling…" : `Schedule ${preview.length} contests`}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

function IndexCard({ instrument, selected, onSelect }: { instrument: Instrument; selected: boolean; onSelect: () => void }) {
  const quote = instrument.quote;
  return <button type="button" onClick={onSelect} className={`min-h-24 rounded-xl border p-3 text-left transition-all ${selected ? "border-emerald-500 bg-white ring-1 ring-emerald-500 shadow-sm" : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30"}`}><span className="flex items-center gap-2"><span className={`grid size-4 place-items-center rounded-full border-2 ${selected ? "border-emerald-600" : "border-slate-300"}`}>{selected && <span className="size-2 rounded-full bg-emerald-600" />}</span><span className="text-sm font-extrabold text-slate-900">{instrument.name}</span></span><span className="mt-3 block text-xl font-black tracking-tight text-slate-950">{quote?.value ? `₹${quote.value}` : "Live value"}</span><span className={`mt-1 block text-sm font-bold ${quote?.isPositive === false ? "text-rose-600" : "text-emerald-600"}`}>{quote?.isPositive === false ? "▼" : "▲"} {quote?.change || "Market index"}</span></button>;
}

function Preview({ preview }: { preview: string[] }) { return <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><CheckCircle2 size={19} /></span><div className="min-w-0"><p className="font-black text-emerald-950">Preview · {preview.length} eligible market day(s)</p><div className="mt-3 flex flex-wrap gap-2">{preview.map((date) => <span key={date} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800 shadow-sm">{date}</span>)}</div><p className="mt-3 text-xs text-emerald-800">Exchange holidays must be entered above until an official NSE holiday calendar is connected.</p></div></div></section>; }
function PrizeScheduleNote() { return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><p className="font-black">Rank-wise prize distribution</p><p className="mt-1 text-sm leading-5 text-amber-900/80">Each scheduled contest uses the Figma reward schedule automatically: 1st 40%, 2nd 20%, 3rd 15%, ranks 4–5 10%, ranks 6–10 8%, ranks 11–50 5%, and ranks 51–100 2%.</p></section>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-sm font-bold text-slate-800"><span className="mb-1.5 block">{label}</span>{children}</label>; }
