"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// TX-E005 / MC-E007: Commodity Group › Business Type › Rate Types (Services) and Service Product Types.
// Add · Rename (inline: Enter saves, Esc cancels) · Hide · Delete at every level; Delete only when nothing uses it.
type Unit = "HOUR" | "DAY" | "WEEK" | "MONTH" | "SESSION" | "VISIT" | "EACH";
const DELIVERY = [["OFFSITE", "Offsite"], ["ONSITE", "Onsite"], ["EITHER", "Either"]] as const;
const PRICING = [["TIME", "Hourly"], ["FIXED", "Fixed"], ["RECURRING", "Monthly"], ["QUOTE", "Quote"]] as const;
const UNITS: Unit[] = ["HOUR", "DAY", "WEEK", "MONTH", "SESSION", "VISIT", "EACH"];
export type TType = { id: string; name: string; description: string | null; pricing_model: string | null; units: Unit[]; delivery: string | null; lead_time_days: number | null; commodity_code: string | null; default_on: boolean; hidden: boolean; used: number };
export type TCat = { id: string; name: string; kind: string; hidden: boolean; types: TType[] };
export type TBt = { id: string; name: string; hidden: boolean; uses_skills: boolean; companies: number; categories: TCat[] };
export type TGroup = { id: string; name: string; segments: string[]; hidden: boolean; businessTypes: TBt[] };
const SEL = "h-8 border border-line bg-white px-1.5 text-[12.5px]";
const BTN = "border border-line bg-white px-2 py-0.5 text-[12px] font-semibold hover:border-ink";
const LNK = "ml-2 text-[12px] font-bold text-magenta-dark underline";
const RED = "ml-2 text-[12px] font-bold text-[#C0392B] underline";
const TH = "border-b border-line px-2 py-2 text-left text-[10.5px] font-bold tracking-[0.1em] text-ink-3";
const TD = "border-b border-[#ECEEF4] px-2 py-2.5 align-middle text-[13px]";
const unitLabel = (u: string) => u[0] + u.slice(1).toLowerCase();

export function ServiceTaxonomyAdmin({ groups, suggested }: { groups: TGroup[]; suggested: { id: string; name: string; kind: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [edit, setEdit] = useState<{ key: string; value: string } | null>(null);
  const call = async (body: object) => {
    setError(null);
    const r = await fetch("/api/admin/service-taxonomy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setError(j.error ?? "Could not save that"); return false; }
    router.refresh();
    return true;
  };
  // One inline editor at a time — rename or add. Enter saves, Esc cancels.
  const inline = ({ k, initial, placeholder, onSave }: { k: string; initial: string; placeholder?: string; onSave: (v: string) => Promise<boolean> }) => {
    if (edit?.key !== k) return null;
    const save = async () => { if (edit.value.trim() && (await onSave(edit.value))) setEdit(null); };
    return (
      <span className="inline-flex items-center gap-1.5 bg-[#FBF4FB] px-1 py-0.5" data-inline-edit>
        <input autoFocus value={edit.value} placeholder={placeholder} aria-label={placeholder ?? "Name"} onChange={(e) => setEdit({ key: k, value: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEdit(null); }} className="h-8 w-56 border border-line px-2 text-[13px]" />
        <button type="button" onClick={save} className="bg-ink px-2 py-1 text-[12px] font-bold text-white">Save</button>
        <button type="button" onClick={() => setEdit(null)} className={BTN}>Cancel</button>
        {initial && <span className="sr-only">{initial}</span>}
      </span>
    );
  };
  const open = (k: string, v = "") => setEdit({ key: k, value: v });
  const Move = ({ level, id }: { level: string; id: string }) => (
    <span className="inline-flex gap-1">
      <button type="button" aria-label="Move up" onClick={() => call({ action: "move", level, id, dir: -1 })} className={BTN}>↑</button>
      <button type="button" aria-label="Move down" onClick={() => call({ action: "move", level, id, dir: 1 })} className={BTN}>↓</button>
    </span>
  );
  // Delete when nothing uses it; otherwise Hide (and Show when hidden).
  const Acts = ({ level, id, name, used, hidden }: { level: "businessType" | "category" | "type"; id: string; name: string; used: number; hidden: boolean }) => (
    <span className="whitespace-nowrap">
      <button type="button" onClick={() => open(`r:${id}`, name)} className={LNK}>Rename</button>
      {hidden ? <button type="button" onClick={() => call({ action: "hide", level, id, hidden: false })} className={LNK}>Show</button>
        : used > 0 ? <button type="button" onClick={() => call({ action: "hide", level, id, hidden: true })} className={LNK}>Hide</button>
        : <button type="button" data-delete onClick={() => window.confirm(`Delete ${name}? Nothing uses it.`) && call({ action: "delete", level, id })} className={RED}>Delete</button>}
    </span>
  );
  const categories = groups.flatMap((g) => g.businessTypes.flatMap((b) => b.categories.map((c) => ({ id: c.id, label: `${b.name} › ${c.name}`, kind: c.kind }))));
  const allTypes = groups.flatMap((g) => g.businessTypes.flatMap((b) => b.categories.flatMap((c) => c.types.map((t) => ({ id: t.id, label: `${b.name} › ${t.name}` })))));
  const update = (id: string, fields: object) => call({ action: "update", id, fields });

  return (
    <div data-service-taxonomy-admin>
      {error && <p role="alert" className="mb-3 text-[13px] font-semibold text-magenta-dark">{error}</p>}

      {groups.map((g) => (
        <section key={g.id} data-commodity-group={g.name} className={g.hidden ? "mb-8 opacity-60" : "mb-8"}>
          <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink pb-1.5">
            <h2 className="text-[18px] font-bold">{g.name}</h2>
            <span className="text-[12px] text-ink-3">UNSPSC {g.segments.join(" · ")}</span>
            {g.hidden && <span className="text-[11px] font-bold text-ink-3">PARKED</span>}
            <span className="ml-auto inline-flex items-center gap-1">
              <Move level="group" id={g.id} />
              <button type="button" onClick={() => call({ action: "hide", level: "group", id: g.id, hidden: !g.hidden })} className={BTN}>{g.hidden ? "Show" : "Hide"}</button>
              <button type="button" onClick={() => open(`ab:${g.id}`)} className={LNK}>+ Add Business Type</button>
            </span>
          </div>
          <div className="mt-2">{inline({ k: `ab:${g.id}`, initial: "", placeholder: "Business Type name", onSave: (v) => call({ action: "addBusinessType", id: g.id, name: v }) })}</div>

          {g.businessTypes.map((b) => {
            const used = b.companies + b.categories.reduce((n, c) => n + c.types.reduce((m, t) => m + t.used, 0), 0);
            const rateCats = b.categories.filter((c) => c.kind === "SERVICE");
            const productCats = b.categories.filter((c) => c.kind === "SERVICE_PRODUCT");
            return (
              <div key={b.id} data-business-type={b.name} className={b.hidden ? "mt-4 border border-line bg-white p-4 opacity-60" : "mt-4 border border-line bg-white p-4"}>
                <div className="flex flex-wrap items-center gap-2">
                  {edit?.key === `r:${b.id}` ? inline({ k: `r:${b.id}`, initial: b.name, onSave: (v) => call({ action: "renameAt", level: "businessType", id: b.id, name: v }) }) : <h3 className="text-[16px] font-bold">{b.name}</h3>}
                  {b.uses_skills && <span className="border border-line px-1.5 text-[10px] font-bold tracking-[0.08em] text-ink-2">USES SKILLS</span>}
                  <span className="text-[12px] text-ink-3">{`${b.companies} ${b.companies === 1 ? "COMPANY" : "COMPANIES"}`}</span>
                  {b.hidden && <span className="text-[11px] font-bold text-ink-3">HIDDEN</span>}
                  <span className="ml-auto inline-flex items-center"><Move level="businessType" id={b.id} /><Acts level="businessType" id={b.id} name={b.name} used={used} hidden={b.hidden} /></span>
                </div>

                <div className="mt-4 flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.12em] text-ink-2">RATE TYPES · SERVICES <button type="button" onClick={() => open(`at:${b.id}`)} className={LNK}>+ Add Rate Type</button></div>
                {inline({ k: `at:${b.id}`, initial: "", placeholder: "Rate type name", onSave: (v) => call({ action: "addType", id: b.id, to: "businessType", name: v }) })}
                <table className="mt-1 w-full border-collapse" data-rate-types>
                  <thead><tr><th className={TH}>RATE TYPE</th><th className={TH}>UNIT</th><th className={TH}>DELIVERY</th><th className={TH}>COMMODITY CODE</th><th className={TH}>ON BY DEFAULT</th><th className={TH}>IN USE</th><th className={TH} /></tr></thead>
                  <tbody>
                    {rateCats.flatMap((c) => c.types).map((t) => (
                      <tr key={t.id} data-type={t.name} className={t.hidden ? "text-ink-3" : ""}>
                        <td className={TD}>
                          {edit?.key === `r:${t.id}` ? inline({ k: `r:${t.id}`, initial: t.name, onSave: (v) => call({ action: "renameAt", level: "type", id: t.id, name: v }) }) : <b>{t.name}</b>}
                          {t.hidden && <span className="ml-1.5 text-[10px] font-bold tracking-[0.08em]">HIDDEN</span>}
                          {t.description && <small className="block text-[12px] text-ink-3">{t.description}</small>}
                        </td>
                        <td className={TD}><select aria-label="Unit" value={t.units[0] ?? ""} onChange={(e) => update(t.id, { units: [e.target.value] })} className={SEL}>{UNITS.map((u) => <option key={u} value={u}>{unitLabel(u)}</option>)}</select></td>
                        <td className={TD}><select aria-label="Delivery" value={t.delivery ?? ""} onChange={(e) => update(t.id, { delivery: e.target.value || null })} className={SEL}><option value="">—</option>{DELIVERY.map(([x, l]) => <option key={x} value={x}>{l}</option>)}</select></td>
                        <td className={TD}><input defaultValue={t.commodity_code ?? ""} aria-label="Commodity code" maxLength={8} onBlur={(e) => e.target.value !== (t.commodity_code ?? "") && update(t.id, { commodity_code: e.target.value.trim() || null })} className={`${SEL} w-24 font-mono`} /></td>
                        <td className={TD}>
                          <button type="button" role="switch" aria-checked={t.default_on} aria-label={`${t.name} on by default`} data-default-on={t.default_on ? "1" : "0"} onClick={() => call({ action: "defaultOn", id: t.id, on: !t.default_on })} className={t.default_on ? "relative h-[22px] w-[38px] rounded-full bg-ink" : "relative h-[22px] w-[38px] rounded-full bg-[#C9CDDC]"}>
                            <span className={t.default_on ? "absolute left-[18px] top-[2px] h-[18px] w-[18px] rounded-full bg-white" : "absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full bg-white"} />
                          </button>
                        </td>
                        <td className={`${TD} tabular-nums`}>{t.used}</td>
                        <td className={`${TD} text-right`}><Move level="type" id={t.id} /><Acts level="type" id={t.id} name={t.name} used={t.used} hidden={t.hidden} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-6 flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.12em] text-ink-2">SERVICE PRODUCT TYPES <button type="button" onClick={() => open(`ac:${b.id}`)} className={LNK}>+ Add Category</button></div>
                {inline({ k: `ac:${b.id}`, initial: "", placeholder: "Category name", onSave: (v) => call({ action: "addCategory", id: b.id, name: v, kind: "SERVICE_PRODUCT" }) })}
                <table className="mt-1 w-full border-collapse" data-product-types>
                  <thead><tr><th className={TH}>TYPE</th><th className={TH}>PRICING</th><th className={TH}>UNIT</th><th className={TH}>DELIVERY</th><th className={TH}>LEAD (DAYS)</th><th className={TH}>COMMODITY CODE</th><th className={TH}>IN USE</th><th className={TH} /></tr></thead>
                  {productCats.map((c) => {
                    const cUsed = c.types.reduce((n, t) => n + t.used, 0);
                    return (
                      <tbody key={c.id} data-category={c.name} className={c.hidden ? "opacity-60" : ""}>
                        <tr>
                          <td colSpan={8} className="px-2 pb-1 pt-4 text-[10.5px] font-extrabold tracking-[0.12em] text-ink-2">
                            {edit?.key === `r:${c.id}` ? inline({ k: `r:${c.id}`, initial: c.name, onSave: (v) => call({ action: "renameAt", level: "category", id: c.id, name: v }) }) : c.name.toUpperCase()}
                            {c.hidden && <span className="ml-1.5">· HIDDEN</span>}
                            <Move level="category" id={c.id} />
                            <Acts level="category" id={c.id} name={c.name} used={cUsed} hidden={c.hidden} />
                            <button type="button" onClick={() => open(`atc:${c.id}`)} className={LNK}>+ Add Type</button>
                            <div>{inline({ k: `atc:${c.id}`, initial: "", placeholder: "Type name", onSave: (v) => call({ action: "addType", id: c.id, to: "category", name: v }) })}</div>
                          </td>
                        </tr>
                        {c.types.map((t) => (
                          <tr key={t.id} data-type={t.name} className={t.hidden ? "text-ink-3" : ""}>
                            <td className={TD}>{edit?.key === `r:${t.id}` ? inline({ k: `r:${t.id}`, initial: t.name, onSave: (v) => call({ action: "renameAt", level: "type", id: t.id, name: v }) }) : <b>{t.name}</b>}{t.hidden && <span className="ml-1.5 text-[10px] font-bold tracking-[0.08em]">HIDDEN</span>}</td>
                            <td className={TD}><select aria-label="Pricing model" value={t.pricing_model ?? ""} onChange={(e) => update(t.id, { pricing_model: e.target.value || null })} className={SEL}><option value="">—</option>{PRICING.map(([x, l]) => <option key={x} value={x}>{l}</option>)}</select></td>
                            <td className={TD}><select aria-label="Unit" value={t.units[0] ?? ""} onChange={(e) => update(t.id, { units: [e.target.value] })} className={SEL}>{UNITS.map((u) => <option key={u} value={u}>{unitLabel(u)}</option>)}</select></td>
                            <td className={TD}><select aria-label="Delivery" value={t.delivery ?? ""} onChange={(e) => update(t.id, { delivery: e.target.value || null })} className={SEL}><option value="">—</option>{DELIVERY.map(([x, l]) => <option key={x} value={x}>{l}</option>)}</select></td>
                            <td className={TD}><input defaultValue={t.lead_time_days ?? ""} aria-label="Lead time days" inputMode="numeric" onBlur={(e) => update(t.id, { lead_time_days: e.target.value ? Number(e.target.value) : null })} className={`${SEL} w-14`} /></td>
                            <td className={TD}><input defaultValue={t.commodity_code ?? ""} aria-label="Commodity code" maxLength={8} onBlur={(e) => e.target.value !== (t.commodity_code ?? "") && update(t.id, { commodity_code: e.target.value.trim() || null })} className={`${SEL} w-24 font-mono`} /></td>
                            <td className={`${TD} tabular-nums`}>{t.used}</td>
                            <td className={`${TD} text-right`}><Move level="type" id={t.id} /><Acts level="type" id={t.id} name={t.name} used={t.used} hidden={t.hidden} /></td>
                          </tr>
                        ))}
                      </tbody>
                    );
                  })}
                </table>
              </div>
            );
          })}
        </section>
      ))}

      <section data-suggested className="mb-8 border border-line bg-white p-4">
        <h2 className="text-[17px] font-bold">Member Suggestions ({suggested.length})</h2>
        {suggested.length === 0 ? (
          <p className="mt-1 text-[13.5px] text-ink-2">Nothing waiting. Members suggest types from My Catalog and the Shop filter.</p>
        ) : (
          <ul className="mt-2">
            {suggested.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 border-t border-line py-2 text-[13.5px]">
                {edit?.key === `s:${s.id}` ? inline({ k: `s:${s.id}`, initial: s.name, onSave: (v) => call({ action: "rename", id: s.id, name: v }) }) : <b className="min-w-[180px]">{s.name}</b>}
                <span className="text-[11.5px] text-ink-3">{s.kind === "SERVICE_PRODUCT" ? "Service Product Type" : "Rate Type"}</span>
                <select aria-label="Approve into category" value={pick[`a${s.id}`] ?? ""} onChange={(e) => setPick({ ...pick, [`a${s.id}`]: e.target.value })} className={SEL}>
                  <option value="">Category…</option>
                  {categories.filter((c) => c.kind === s.kind).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <button type="button" disabled={!pick[`a${s.id}`]} onClick={() => call({ action: "approve", id: s.id, categoryId: pick[`a${s.id}`] })} className={`${BTN} disabled:opacity-40`}>Approve</button>
                <select aria-label="Merge into" value={pick[`m${s.id}`] ?? ""} onChange={(e) => setPick({ ...pick, [`m${s.id}`]: e.target.value })} className={SEL}>
                  <option value="">Merge into…</option>
                  {allTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <button type="button" disabled={!pick[`m${s.id}`]} onClick={() => call({ action: "merge", id: s.id, into: pick[`m${s.id}`] })} className={`${BTN} disabled:opacity-40`}>Merge</button>
                <button type="button" onClick={() => open(`s:${s.id}`, s.name)} className={BTN}>Rename</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
