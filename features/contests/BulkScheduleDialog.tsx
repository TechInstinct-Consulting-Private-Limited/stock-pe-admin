"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ApiRequest } from "@/services/api-client";
import { createBulkScheduledContests } from "./contest.api";

type Instrument = { instrumentCode: string; name: string };
const dateOnly = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

function previewDays(startDate: string, count: number, excluded: Set<string>) {
  const items: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return items;
  const cursor = new Date(`${startDate}T00:00:00Z`);
  for (let scanned = 0; items.length < count && scanned < 90; scanned += 1) {
    const date = cursor.toISOString().slice(0, 10);
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6 && !excluded.has(date)) items.push(date);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return items;
}

export function BulkScheduleDialog({ open, onOpenChange, request, apiBase, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; request: ApiRequest; apiBase: string; onCreated: () => void }) {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    instrumentCode: "NIFTY50", startDate: dateOnly(new Date(Date.now() + 86400000)), tradingDays: "10",
    opensTime: "09:15", liveTime: "15:15", closesTime: "15:35", entryCredits: "50", prizePoolCredits: "1000", playerCapacity: "100", excludedDates: "",
  });

  useEffect(() => {
    if (!open) return;
    fetch(`${apiBase.replace(/\/$/, "")}/market/search?q=all`)
      .then((response) => response.json())
      .then((data) => setInstruments(Array.isArray(data?.data) ? data.data : []))
      .catch(() => setInstruments([]));
  }, [open, apiBase]);

  const exclusions = useMemo(() => new Set(form.excludedDates.split(",").map((value) => value.trim()).filter(Boolean)), [form.excludedDates]);
  const preview = useMemo(() => previewDays(form.startDate, Math.min(31, Math.max(1, Number(form.tradingDays) || 1)), exclusions), [form.startDate, form.tradingDays, exclusions]);
  const update = (key: keyof typeof form, value: string) => setForm((previous) => ({ ...previous, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await createBulkScheduledContests(request, {
        instrumentCode: form.instrumentCode, startDate: form.startDate, tradingDays: Number(form.tradingDays),
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

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Schedule multiple market-day contests</DialogTitle><DialogDescription>Creates Demo USDT contests in Soon. Saturdays, Sundays, manually entered NSE holidays, and past entry times are skipped.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Index<select className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3" value={form.instrumentCode} onChange={(event) => update("instrumentCode", event.target.value)}>{instruments.length ? instruments.map((item) => <option key={item.instrumentCode} value={item.instrumentCode}>{item.name}</option>) : <option value="NIFTY50">NIFTY 50</option>}</select></label><label className="text-sm font-bold">Start date<Input className="mt-1.5" type="date" value={form.startDate} onChange={(event) => update("startDate", event.target.value)} required /></label><label className="text-sm font-bold">Trading days (max 31)<Input className="mt-1.5" type="number" min="1" max="31" value={form.tradingDays} onChange={(event) => update("tradingDays", event.target.value)} required /></label><label className="text-sm font-bold">Excluded NSE holidays<Input className="mt-1.5" placeholder="YYYY-MM-DD, YYYY-MM-DD" value={form.excludedDates} onChange={(event) => update("excludedDates", event.target.value)} /></label><label className="text-sm font-bold">Open (IST)<Input className="mt-1.5" type="time" value={form.opensTime} onChange={(event) => update("opensTime", event.target.value)} required /></label><label className="text-sm font-bold">Prediction locks / Live (IST)<Input className="mt-1.5" type="time" value={form.liveTime} onChange={(event) => update("liveTime", event.target.value)} required /></label><label className="text-sm font-bold">Close / settlement snapshot (IST)<Input className="mt-1.5" type="time" value={form.closesTime} onChange={(event) => update("closesTime", event.target.value)} required /></label><label className="text-sm font-bold">Entry amount (Demo USDT)<Input className="mt-1.5" type="number" min="1" value={form.entryCredits} onChange={(event) => update("entryCredits", event.target.value)} required /></label><label className="text-sm font-bold">Prize pool (Demo USDT)<Input className="mt-1.5" type="number" min="1" value={form.prizePoolCredits} onChange={(event) => update("prizePoolCredits", event.target.value)} required /></label><label className="text-sm font-bold">Player capacity<Input className="mt-1.5" type="number" min="1" value={form.playerCapacity} onChange={(event) => update("playerCapacity", event.target.value)} required /></label></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm"><p className="font-bold text-emerald-900">Preview: {preview.length} eligible market day(s)</p><p className="mt-1 text-emerald-800">{preview.join(" · ") || "Choose a valid start date"}</p><p className="mt-2 text-xs text-emerald-700">Exchange holidays must be added above until the official NSE holiday calendar is connected.</p></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving}>{saving ? "Scheduling…" : `Schedule ${preview.length} contests`}</Button></DialogFooter></form></DialogContent></Dialog>;
}
