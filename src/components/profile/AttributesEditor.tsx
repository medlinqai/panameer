"use client";

import { useEffect, useState } from "react";
import { fieldHelp } from "@/lib/field-guide";
import { HelpTip } from "@/components/ui/HelpTip";

// Lane 6: the few pick-from-list facts buyers in your trade check (e.g. licensed states). Renders nothing while taxonomy_v2 is off.
type Attr = { id: string; name: string; businessType: string; multi: boolean; options: string[] | null; values: string[] };

export function AttributesEditor({ help }: { help?: string | null }) {
  const [attrs, setAttrs] = useState<Attr[] | null>(null);
  const [free, setFree] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { fetch("/api/provider/attributes").then((r) => (r.ok ? r.json() : { enabled: false })).then((j) => setAttrs(j.enabled ? j.attributes : [])).catch(() => setAttrs([])); }, []);
  if (!attrs?.length) return null;
  const save = async (a: Attr, values: string[]) => {
    setMsg(null);
    const r = await fetch("/api/provider/attributes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attributeId: a.id, values }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setMsg(j.error ?? "Could not save that");
    setAttrs(j.attributes);
  };
  const toggle = (a: Attr, v: string) => save(a, a.values.includes(v) ? a.values.filter((x) => x !== v) : a.multi ? [...a.values, v] : [v]);
  return (
    <section data-attributes-editor className="mb-6 border border-line bg-white p-4">
      <h2 className="flex items-center text-[17px] font-bold">For Your Trade<HelpTip label="Attributes" text={help ?? fieldHelp("Attributes", "seller")} /></h2>
      <p className="text-[13px] text-ink-2">Buyers filter on these. Saves as you pick.</p>
      {attrs.map((a) => (
        <div key={a.id} data-attribute={a.name} className="mt-3">
          <p className="mb-1 text-[13px] font-bold">{a.name} <span className="font-normal text-ink-3">· {a.businessType}{a.multi ? " · pick any" : ""}</span></p>
          {a.options ? (
            a.options.length > 12 ? (
              <select multiple={a.multi} aria-label={a.name} value={a.multi ? a.values : a.values[0] ?? ""} onChange={(e) => save(a, Array.from(e.target.selectedOptions).map((o) => o.value))} className="h-28 w-full border border-line px-2 text-[13px]">
                {!a.multi && <option value="">—</option>}
                {a.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {a.options.map((o) => <button key={o} type="button" data-choice={o} onClick={() => toggle(a, o)} className={a.values.includes(o) ? "border border-ink bg-ink px-2.5 py-1 text-[12.5px] text-white" : "border border-line px-2.5 py-1 text-[12.5px]"}>{o}</button>)}
              </div>
            )
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {a.values.map((v) => <button key={v} type="button" onClick={() => toggle(a, v)} className="border border-ink bg-ink px-2.5 py-1 text-[12.5px] text-white">{v} ×</button>)}
              <input aria-label={`Add ${a.name}`} value={free[a.id] ?? ""} onChange={(e) => setFree((f) => ({ ...f, [a.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter" && (free[a.id] ?? "").trim()) { e.preventDefault(); void save(a, [...a.values, free[a.id].trim()]); setFree((f) => ({ ...f, [a.id]: "" })); } }} placeholder="Type and press Enter" className="border border-line px-2 py-1 text-[12.5px]" />
            </div>
          )}
        </div>
      ))}
      {msg && <p role="status" className="mt-2 text-[13px] font-semibold">{msg}</p>}
    </section>
  );
}
