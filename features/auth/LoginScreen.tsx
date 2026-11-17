"use client";

import type { FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";

type LoginScreenProps = {
  apiBase: string;
  setApiBase: (value: string) => void;
  mobile: string;
  setMobile: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  onLogin: (event: FormEvent) => void;
};

export function LoginScreen({ apiBase, setApiBase, mobile, setMobile, password, setPassword, onLogin }: LoginScreenProps) {
  return <main className="grid min-h-screen place-items-center bg-[#071d1a] p-5"><Toaster richColors position="top-right" /><section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"><div className="grid size-12 place-items-center rounded-2xl bg-emerald-500 text-[#071d1a]"><ShieldCheck size={25} /></div><p className="mt-6 text-sm font-bold uppercase tracking-[.15em] text-emerald-700">Restricted access</p><h1 className="mt-2 text-3xl font-black">MarketPe Admin Console</h1><p className="mt-2 text-base text-slate-600">Sign in with an account that has been granted an Administrator role. Admin sign-in does not use mobile OTP or MPIN.</p><label className="mt-6 block text-sm font-bold text-slate-700">Backend API address<Input className="mt-2" value={apiBase} onChange={(event) => setApiBase(event.target.value)} /></label><form onSubmit={onLogin} className="mt-6 space-y-4"><Input placeholder="Mobile number" inputMode="numeric" autoComplete="username" value={mobile} onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))} required /><Input placeholder="Administrator password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><Button className="w-full bg-emerald-600 hover:bg-emerald-700">Sign in to Admin Console</Button></form></section></main>;
}
