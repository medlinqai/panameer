"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// TX-E005: Commodity Group › Business Type › Service Category › Service Type, with the universal fields and the Suggested queue.
type Unit = "HOUR" | "DAY" | "WEEK" | "MONTH" | "SESSION" | "VISIT" | "EACH";
const DELIVERY = [["OFFSITE", "Offsite"], ["ONSITE", "Onsite"], ["EITHER", "Either"]] as const;
export type TType = { id: string; name: string; pricing_model: string | null; units: Unit[]; delivery: string | null; lead_time_days: number | null; commodity_code: string | null; required: boolean; used: number };
export type TCat = { id: string; name: string; kind: string; types: TType[] };
export type TBt = { id: string; name: string; hidden: boolean; uses_skills: boolean; categories: TCat[] };
export type TGroup = { id: string; name: string; segments: string[]; hidden: boolean; businessTypes: TBt[] };
const UNITS: Unit[] = ["HOUR", "DAY", "WEEK", "MONTH", "SESSION", "VISIT", "EACH"];
const SEL = "h-8 border border-line bg-white px-1.5 text-[12.5px]";
const BTN = "border border-line px-2 py-0.5 text-[12px] font-semibold hover:border-ink";

export function ServiceTaxonomyAdmin({ groups, suggested }: { groups: TGroup[]; suggested: { id: string; name: string; kind: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<Record<string, string>>({});
  const call = async (body: object) => {
    setError(null);
    const r = await fetch("/api/admin/service-taxonomy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setError(j.error ?? "Could not save that");
    else router.refresh();
  };
  const Move = ({ level, id }: { level: string; id: string }) => (
    <span className="inline-flex gap-1">
      <button type="button" aria-label="Move up" onClick={() => call({ action: "move", level, id, dir: -1 })} className={BTN}>↑</button>
      <button type="button" aria-label="Move down" onClick={() => call({ action: "move", level, id, dir: 1 })} className={BTN}>↓</button>
    </span>
  );
  const categories = groups.flatMap((g) => g.businessTypes.flatMap((b) => b.categories.map((c) => ({ id: c.id, label: `${b.name} › ${c.name}`, kind: c.kind }))));
  const allTypes = groups.flatMap((g) => g.businessTypes.flatMap((b) => b.categories.flatMap((c) => c.types.map((t) => ({ id: t.id, label: `${b.name} › ${t.name}` })))));

  return (
    <div data-service-taxonomy-admin>
      {error && <p role="alert" className="mb-3 text-[13px] font-semibold text-magenta-dark">{error}</p>}
      <section data-suggested className="mb-8 border border-line bg-white p-4">
        <h2 className="text-[17px] font-bold">Suggested ({suggested.length})</h2>
        {suggested.length === 0 ? (
          <p className="mt-1 text-[13.5px] text-ink-2">Nothing waiting. Providers suggest types from Build Your Catalog and the Shop filter.</p>
        ) : (
          <ul className="mt-2">
            {suggested.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 border-t border-line py-2 text-[13.5px]">
                <b className="min-w-[180px]">{s.name}</b>
                <span className="text-[11.5px] text-ink-3">{s.kind === "SERVICE_PRODUCT" ? "Service Product Type" : "Service Type"}</span>
                <select aria-label="Approve into category" value={pick[`a${s.id}`] ?? ""} onChange={(e) => setPick({ ...pick, [`a${s.id}`]: e.target.value })} className={SEL}>
                  <option value="">Category…</option>
                  {categories.filter((c) => c.kind === s.kind).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <button type="button" disabled={!pick[`a${s.id}`]} onClick={() => call({ action: "approve", id: s.id, categoryId: pick[`a${s.id}`] })} className={BTN + " disabled:opacity-40"}>Approve</button>
                <select aria-label="Merge into" value={pick[`m${s.id}`] ?? ""} onChange={(e) => setPick({ ...pick, [`m${s.id}`]: e.target.value })} className={SEL}>
                  <option value="">Merge into…</option>
                  {allTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <button type="button" disabled={!pick[`m${s.id}`]} onClick={() => call({ action: "merge", id: s.id, into: pick[`m${s.id}`] })} className={BTN + " disabled:opacity-40"}>Merge</button>
                <button type="button" onClick={() => { const n = window.prompt("Rename", s.name); if (n?.trim()) call({ action: "rename", id: s.id, name: n }); }} className={BTN}>Rename</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {groups.map((g) => (
        <section key={g.id} data-commodity-group={g.name} className={"mb-6 " + (g.hidden ? "opacity-60" : "")}>
          <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink pb-1">
            <h2 className="text-[18px] font-bold">{g.name}</h2>
            <span className="text-[12px] text-ink-3">UNSPSC {g.segments.join(" · ")}</span>
            {g.hidden && <span className="text-[11px] font-bold text-ink-3">PARKED</span>}
            <span className="ml-auto inline-flex gap-1"><Move level="group" id={g.id} /><button type="button" onClick={() => call({ action: "hide", level: "group", id: g.id, hidden: !g.hidden })} className={BTN}>{g.hidden ? "Show" : "Hide"}</button></span>
          </div>
          {g.businessTypes.map((b) => (
            <div key={b.id} className={"ml-3 mt-3 " + (b.hidden ? "opacity-60" : "")}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15.5px] font-bold">{b.name}</h3>
                <span className="text-[11.5px] text-ink-3">{b.uses_skills ? "uses skills" : "no skills"}</span>
                <span className="ml-auto inline-flex gap-1"><Move level="businessType" id={b.id} /><button type="button" onClick={() => call({ action: "hide", level: "businessType", id: b.id, hidden: !b.hidden })} className={BTN}>{b.hidden ? "Show" : "Hide"}</button></span>
              </div>
              {b.categories.map((c) => (
                <div key={c.id} className="ml-3 mt-2">
                  <p className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.12em] text-ink-3">{c.name.toUpperCase()} · {c.kind === "SERVICE" ? "SERVICES" : "SERVICE PRODUCTS"} <Move level="category" id={c.id} /></p>
                  <table className="mt-1 w-full text-left text-[12.5px]">
                    <thead><tr className="text-ink-3"><th className="py-1">Type</th><th>Pricing</th><th>Units</th><th>Delivery</th><th>Lead (days)</th><th>Commodity Code</th><th>Required</th><th>In use</th><th /></tr></thead>
                    <tbody>
                      {c.types.map((t) => (
                        <tr key={t.id} data-type={t.name} className="border-t border-line">
                          <td className="py-1.5 font-semibold">{t.name}</td>
                          <td><select aria-label="Pricing model" value={t.pricing_model ?? ""} onChange={(e) => call({ action: "update", id: t.id, fields: { pricing_model: e.target.value || null } })} className={SEL}><option value="">—</option>{["TIME", "FIXED", "RECURRING", "QUOTE"].map((x) => <option key={x} value={x}>{x[0] + x.slice(1).toLowerCase()}</option>)}</select></td>
                          <td>
                            <span className="flex flex-wrap gap-1">{UNITS.map((u) => (
                              <label key={u} className="inline-flex items-center gap-0.5"><input type="checkbox" checked={t.units.includes(u)} onChange={(e) => call({ action: "update", id: t.id, fields: { units: e.target.checked ? [...t.units, u] : t.units.filter((x) => x !== u) } })} />{u[0] + u.slice(1).toLowerCase()}</label>
                            ))}</span>
                          </td>
                          <td><select aria-label="Delivery" value={t.delivery ?? ""} onChange={(e) => call({ action: "update", id: t.id, fields: { delivery: e.target.value || null } })} className={SEL}><option value="">—</option>{DELIVERY.map(([x, l]) => <option key={x} value={x}>{l}</option>)}</select></td>
                          <td><input defaultValue={t.lead_time_days ?? ""} aria-label="Lead time days" inputMode="numeric" onBlur={(e) => call({ action: "update", id: t.id, fields: { lead_time_days: e.target.value ? Number(e.target.value) : null } })} className={SEL + " w-14"} /></td>
                          <td><input defaultValue={t.commodity_code ?? ""} aria-label="Commodity code" maxLength={8} onBlur={(e) => e.target.value !== (t.commodity_code ?? "") && call({ action: "update", id: t.id, fields: { commodity_code: e.target.value.trim() || null } })} className={SEL + " w-24 font-mono"} /></td>
                          <td><input type="checkbox" aria-label="Required" checked={t.required} onChange={(e) => call({ action: "update", id: t.id, fields: { required: e.target.checked } })} /></td>
                          <td className="tabular-nums text-ink-2">{t.used}</td>
                          <td className="text-right"><Move level="type" id={t.id} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
