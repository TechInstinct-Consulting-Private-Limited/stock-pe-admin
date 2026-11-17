"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ApiRequest } from "@/services/api-client";
import { grantAdministrator, listAdministrators, revokeAdministrator, updateAdministratorRole, type Administrator } from "./admin-access.api";

export function AdminAccessPage({ request }: { request: ApiRequest }) {
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState<Administrator["role"]>("OPERATIONS_ADMIN");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAdministrators(request);
      setAdministrators(data.administrators || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load administrator access");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const grant = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await grantAdministrator(request, mobile, role);
      setMobile("");
      toast.success("Administrator access saved");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save administrator access");
    }
  };

  const changeRole = async (administrator: Administrator, nextRole: Administrator["role"]) => {
    try {
      await updateAdministratorRole(request, administrator.user_id, nextRole);
      toast.success("Administrator role updated");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update role");
    }
  };

  const revoke = async (administrator: Administrator) => {
    if (!window.confirm(`Remove Admin Panel access for ${administrator.mobile}?`)) return;
    try {
      await revokeAdministrator(request, administrator.user_id);
      toast.success("Administrator access removed");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove access");
    }
  };

  return <div className="space-y-6">
    <header className="border-b border-slate-200 pb-7"><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-600">System & settings</p><h1 className="mt-2 text-3xl font-black tracking-tight">Admin access</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Only verified MarketPe users with an administrator role can enter this console. Super Admins can manage access; Operations Admins can manage contests but cannot change access.</p></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 text-emerald-600" size={20} /><div><p className="font-extrabold">Grant console access</p><p className="mt-1 text-sm text-slate-500">The mobile number must already belong to a registered, verified user. This does not create a consumer account or change its MPIN.</p></div></div><form onSubmit={grant} className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_auto]"><Input placeholder="Verified user mobile number" inputMode="numeric" value={mobile} onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))} required /><select value={role} onChange={(event) => setRole(event.target.value as Administrator["role"])} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold"><option value="OPERATIONS_ADMIN">Operations Admin</option><option value="SUPER_ADMIN">Super Admin</option></select><Button className="bg-emerald-600 hover:bg-emerald-700"><UserPlus size={16} /> Grant access</Button></form></section>
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-extrabold">Administrator directory</h2><p className="mt-1 text-sm text-slate-500">Access changes take effect on the user&apos;s next sign-in.</p></div><Button variant="outline" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50"><tr>{["Mobile", "Role", "Granted", "Last changed", "Actions"].map((heading) => <th key={heading} className="px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">{heading}</th>)}</tr></thead><tbody>{administrators.map((administrator) => <tr key={administrator.user_id} className="border-b border-slate-100 last:border-0"><td className="px-5 py-4 font-mono font-bold">+91 {administrator.mobile}</td><td className="px-5 py-4"><select value={administrator.role} onChange={(event) => void changeRole(administrator, event.target.value as Administrator["role"])} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold"><option value="SUPER_ADMIN">SUPER_ADMIN</option><option value="OPERATIONS_ADMIN">OPERATIONS_ADMIN</option></select></td><td className="px-5 py-4 text-xs text-slate-600">{new Date(administrator.created_at).toLocaleString("en-IN")}</td><td className="px-5 py-4 text-xs text-slate-600">{new Date(administrator.updated_at).toLocaleString("en-IN")}</td><td className="px-5 py-4"><Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => void revoke(administrator)}>Remove</Button></td></tr>)}{!loading && administrators.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">No administrator accounts found.</td></tr>}</tbody></table></div></section>
  </div>;
}
