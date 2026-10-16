"use client";

import { useState } from "react";
import { fieldHelp } from "@/lib/field-guide";
import { HelpTip } from "@/components/ui/HelpTip";

export type BT = { id: string; name: string; group: string; description?: string | null; groupDescription?: string | null };
const LABEL = "mb-1.5 flex items-center text-[14px] font-bold text-ink";
const SELECT = "w-full border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-magenta";

// Scott 10-14: two steps — Commodity Group (by name), then the Business Types in it. Only groups that hold a
// Business Type show; the Commodity question always shows (one group = pre-picked). Order follows the list (group sort, then type sort).
export function BusinessTypePicker({ types, commodities = [], value, onChange, hint, inline = false }: { types: BT[]; commodities?: string[]; value: string; onChange: (id: string) => void; hint: string; /** Scott 10-16: Commodity | Business Type side by side, one hint under both. */ inline?: boolean }) {
  const withTypes = [...new Set(types.map((t) => t.group))];
  const groups = [...commodities, ...withTypes.filter((g) => !commodities.includes(g))];
  const [chosen, setPicked] = useState<string | null>(null);
  // types arrive after first render (fetch), so derive the default instead of freezing it in useState.
  const picked = chosen ?? types.find((t) => t.id === value)?.group ?? (withTypes.length === 1 ? withTypes[0] : "");
  const group = picked;
  const inGroup = types.filter((t) => t.group === group);
  const body = (
    <>
      {groups.length > 0 && (
        <div>
          <span className={LABEL}>Commodity<HelpTip label={group || "Commodity"} text={group ? inGroup[0]?.groupDescription ?? "What kind of services your company sells." : "What kind of services your company sells — pick one to see examples."} /></span>
          <select value={group} onChange={(e) => { setPicked(e.target.value); onChange(""); }} className={SELECT} data-commodity-group>
            <option value="">Pick a commodity</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          {!inline && <span className="mt-1 block text-[13px] text-ink-2">What kind of services your company sells.</span>}
        </div>
      )}
      {group && inGroup.length === 0 && (
        <p className="-mt-2 mb-4 text-[13px] text-ink-2" data-commodity-empty>Business Types for {group} are coming soon. Pick another commodity for now.</p>
      )}
      {group && inGroup.length > 0 && (
        <div>
          <span className={LABEL}>Business Type<HelpTip label={inGroup.find((b) => b.id === value)?.name ?? "Business Type"} text={inGroup.find((b) => b.id === value)?.description ?? fieldHelp("Business Type", "seller")} /></span>
          <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT} data-business-type>
            <option value="">Pick a business type</option>
            {inGroup.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {!inline && <span className="mt-1 block text-[13px] text-ink-2">{hint}</span>}
        </div>
      )}
    </>
  );
  if (!inline) return body;
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">{body}</div>
      <span className="mt-1 block text-[13px] text-ink-2">{hint}</span>
    </div>
  );
}
