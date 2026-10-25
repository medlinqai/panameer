"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PERIODS, type PeriodKey } from "@/lib/dashboard/periods";

// MD-E004: This Quarter · Last 90 Days · This Year.
export function PeriodSelect({ value }: { value: PeriodKey }) {
  const router = useRouter();
  const sp = useSearchParams();
  return (
    <select value={value} aria-label="Period" onChange={(e) => { const q = new URLSearchParams(sp?.toString() ?? ""); q.set("period", e.target.value); router.push(`/dashboard?${q.toString()}`, { scroll: false }); }} className="rounded-[6px] border border-line bg-white px-2 py-1.5 text-[13px] font-semibold" data-period>
      {PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </select>
  );
}
