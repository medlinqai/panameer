"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN } from "@/components/hire/HireUI";
import type { Want } from "@/lib/job-agent";

const FIELD = "mt-1 block w-full rounded-[8px] border border-state-border px-3 py-2 text-[14px]";
const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

// EX-E004: What I Want — pre-filled from the profile; the Daily Digest is off by default.
export function WantForm({ want }: { want: Want }) {
  const router = useRouter();
  const [w, setW] = useState({ skills: want.skills.join(", "), modules: want.modules.join(", "), rate: want.rateFloorCents ? String(want.rateFloorCents / 100) : "", workTypes: want.workTypes, contractTypes: want.contractTypes, countries: want.countries.join(", "), digest: want.digest });
  const [msg, setMsg] = useState<string | null>(null);
  const toggle = (k: "workTypes" | "contractTypes", v: string) => setW((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const save = async () => {
    const r = await fetch("/api/job-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skills: split(w.skills), modules: split(w.modules), rateFloorCents: w.rate ? Math.round(Number(w.rate.replace(/[^0-9.]/g, "")) * 100) : null, workTypes: w.workTypes, contractTypes: w.contractTypes, countries: split(w.countries), digest: w.digest }) }).catch(() => null);
    setMsg(r?.ok ? "Saved." : "Couldn't save.");
    router.refresh();
  };
  const chip = (k: "workTypes" | "contractTypes", v: string) => <button key={v} type="button" aria-pressed={w[k].includes(v)} onClick={() => toggle(k, v)} className={w[k].includes(v) ? "rounded-full border border-ink bg-ink px-3 py-1 text-[12.5px] font-semibold text-surface" : "rounded-full border border-line px-3 py-1 text-[12.5px] font-semibold"}>{v}</button>;
  return (
    <div className="space-y-3" data-want-form>
      <label className="block text-[12.5px] font-semibold">Skills<input value={w.skills} onChange={(e) => setW({ ...w, skills: e.target.value })} className={FIELD} placeholder="Oracle Purchasing, Supplier Portal" /></label>
      <label className="block text-[12.5px] font-semibold">Modules<input value={w.modules} onChange={(e) => setW({ ...w, modules: e.target.value })} className={FIELD} placeholder="P2P, AP" /></label>
      <label className="block text-[12.5px] font-semibold">Rate Floor ($/hr)<input value={w.rate} onChange={(e) => setW({ ...w, rate: e.target.value })} inputMode="numeric" className={FIELD} /></label>
      <div><p className="text-[12.5px] font-semibold">Where</p><div className="mt-1 flex flex-wrap gap-1.5">{["Remote", "Hybrid", "Onsite"].map((v) => chip("workTypes", v))}</div></div>
      <div><p className="text-[12.5px] font-semibold">Kind of Work</p><div className="mt-1 flex flex-wrap gap-1.5">{["Contract", "Full-Time"].map((v) => chip("contractTypes", v))}</div></div>
      <label className="block text-[12.5px] font-semibold">Countries<input value={w.countries} onChange={(e) => setW({ ...w, countries: e.target.value })} className={FIELD} placeholder="United States, Canada" /></label>
      <label className="flex items-center gap-2 text-[13.5px]"><input type="checkbox" checked={w.digest} onChange={(e) => setW({ ...w, digest: e.target.checked })} /> Daily Digest Email — my top 5 finds each morning</label>
      <div className="flex items-center gap-3"><button type="button" onClick={() => void save()} className={BTN} data-want-save>Save</button>{msg && <span className="text-[13px]" role="status">{msg}</span>}</div>
    </div>
  );
}
