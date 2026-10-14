"use client";

import { useState } from "react";
import { Field } from "@/components/onboarding/controls";

export type BT = { id: string; name: string; group: string };
const SELECT = "w-full border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-magenta";

// Scott 10-14: two steps — Commodity Group (by name), then the Business Types in it. Only groups that hold a
// Business Type show; the Commodity question always shows (one group = pre-picked). Order follows the list (group sort, then type sort).
export function BusinessTypePicker({ types, commodities = [], value, onChange, hint }: { types: BT[]; commodities?: string[]; value: string; onChange: (id: string) => void; hint: string }) {
  const withTypes = [...new Set(types.map((t) => t.group))];
  const groups = [...commodities, ...withTypes.filter((g) => !commodities.includes(g))];
  const [chosen, setPicked] = useState<string | null>(null);
  // types arrive after first render (fetch), so derive the default instead of freezing it in useState.
  const picked = chosen ?? types.find((t) => t.id === value)?.group ?? (withTypes.length === 1 ? withTypes[0] : "");
  const group = picked;
  const inGroup = types.filter((t) => t.group === group);
  return (
    <>
      {groups.length > 0 && (
        <Field label="Commodity" hint="What kind of services your company sells.">
          <select value={group} onChange={(e) => { setPicked(e.target.value); onChange(""); }} className={SELECT} data-commodity-group>
            <option value="">Pick a commodity</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
      )}
      {group && inGroup.length === 0 && (
        <p className="-mt-2 mb-4 text-[13px] text-ink-2" data-commodity-empty>Business Types for {group} are coming soon. Pick another commodity for now.</p>
      )}
      {group && inGroup.length > 0 && (
        <Field label="Business Type" hint={hint}>
          <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT} data-business-type>
            <option value="">Pick a business type</option>
            {inGroup.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
      )}
    </>
  );
}
