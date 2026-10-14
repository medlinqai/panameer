"use client";

import { useState } from "react";
import { Field } from "@/components/onboarding/controls";

export type BT = { id: string; name: string; group: string };
const SELECT = "w-full border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none focus:border-magenta";

// Scott 10-14: two steps — Commodity Group (by name), then the Business Types in it. Only groups that hold a
// Business Type show; one group = picked for you. Order follows the list (group sort, then type sort).
export function BusinessTypePicker({ types, value, onChange, hint }: { types: BT[]; value: string; onChange: (id: string) => void; hint: string }) {
  const groups = [...new Set(types.map((t) => t.group))];
  const [picked, setPicked] = useState(() => types.find((t) => t.id === value)?.group ?? (groups.length === 1 ? groups[0] : ""));
  const group = groups.length === 1 ? groups[0] : picked;
  const inGroup = types.filter((t) => t.group === group);
  return (
    <>
      {groups.length > 1 && (
        <Field label="Commodity">
          <select value={group} onChange={(e) => { setPicked(e.target.value); onChange(""); }} className={SELECT} data-commodity-group>
            <option value="">Pick a commodity</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </Field>
      )}
      {group && (
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
