"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FilterParams } from "@/lib/job-filters";

const box = "min-w-0 border-2 border-ink bg-white px-2.5 py-2.5 text-[14px]";

// XA-E005: filters along the search bar (like Shop) — Search · Skills · Modules · Rate · Where · Kind · Country · Source;
// Save as My Job Agent stores them as the Job Agent's criteria, with the Daily Digest switch.
export function JobFilterBar({ action, values, sources, hidden = {}, digest }: { action: string; values: FilterParams; sources: string[]; hidden?: Record<string, string>; digest: boolean }) {
  const router = useRouter();
  const [v, setV] = useState<FilterParams>(values);
  const [dg, setDg] = useState(digest);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof FilterParams) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  const split = (s?: string) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const save = async () => {
    setMsg("Saving…");
    const rate = Number((v.rate ?? "").replace(/[^0-9.]/g, ""));
    const r = await fetch("/api/job-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skills: split(v.skills), modules: split(v.modules), rateFloorCents: rate > 0 ? Math.round(rate * 100) : null, workTypes: v.where ? [v.where] : [], contractTypes: v.contract ? [v.contract] : [], countries: split(v.country), digest: dg }) }).catch(() => null);
    setMsg(r?.ok ? "Saved as your Job Agent." : "Couldn't save — try again.");
    if (r?.ok) router.refresh();
  };
  return (
    <form action={action} role="search" className="mt-4" data-job-filter-bar>
      {Object.entries(hidden).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />)}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-0">
        <input name="q" value={v.q ?? ""} onChange={set("q")} placeholder="Search jobs…" aria-label="Search jobs" className={`${box} col-span-2 sm:flex-[2_1_220px] sm:border-r-0`} />
        <input name="skills" value={v.skills ?? ""} onChange={set("skills")} placeholder="Skills" aria-label="Skills" className={`${box} sm:w-[140px] sm:border-r-0`} />
        <input name="modules" value={v.modules ?? ""} onChange={set("modules")} placeholder="Modules" aria-label="Modules" className={`${box} sm:w-[130px] sm:border-r-0`} />
        <input name="rate" value={v.rate ?? ""} onChange={set("rate")} inputMode="decimal" placeholder="Rate $/hr" aria-label="Lowest rate ($/hr)" className={`${box} sm:w-[100px] sm:border-r-0`} />
        <select name="where" value={v.where ?? ""} onChange={set("where")} aria-label="Where" className={`${box} sm:border-r-0`}><option value="">Where</option><option>Remote</option><option>Hybrid</option><option>Onsite</option></select>
        <select name="contract" value={v.contract ?? ""} onChange={set("contract")} aria-label="Kind" className={`${box} sm:border-r-0`}><option value="">Kind</option><option>Contract</option><option>Full-Time</option></select>
        <input name="country" value={v.country ?? ""} onChange={set("country")} placeholder="Country" aria-label="Country" className={`${box} sm:w-[120px] sm:border-r-0`} />
        <select name="source" value={v.source ?? ""} onChange={set("source")} aria-label="Source" className={`${box} sm:border-r-0`}><option value="">Source</option>{sources.map((s) => <option key={s}>{s}</option>)}</select>
        <button type="submit" className="col-span-2 bg-ink px-5 py-2.5 text-[14px] font-bold text-surface hover:bg-ink-hover">Search</button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
        <button type="button" onClick={save} className="font-bold text-magenta-ink underline underline-offset-4" data-save-agent>Save as My Job Agent</button>
        <label className="flex items-center gap-1.5"><input type="checkbox" className="h-4 w-4 accent-ink" checked={dg} onChange={(e) => setDg(e.target.checked)} />Daily Digest</label>
        {msg && <span className="text-ink-2" role="status">{msg}</span>}
      </div>
    </form>
  );
}
