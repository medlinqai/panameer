"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HelpTip } from "@/components/ui/HelpTip";
import { CategoryIcon } from "@/components/shop/CategoryIcon";
import { CATEGORY_ICONS, type CategoryIconKey } from "@/lib/shop-categories";

// CH-E001 (was TX-E005 / MC-E007): Category › Business Type › Service Types (rates) and Service Product Types.
// Add · Rename (inline: Enter saves, Esc cancels) · Hide · Delete at every level; Delete only when nothing uses it.
type Unit = "HOUR" | "DAY" | "WEEK" | "MONTH" | "SESSION" | "VISIT" | "EACH";
const DELIVERY = [["OFFSITE", "Offsite"], ["ONSITE", "Onsite"], ["EITHER", "Either"]] as const;
const PRICING = [["TIME", "Hourly"], ["FIXED", "Fixed"], ["RECURRING", "Monthly"], ["QUOTE", "Quote"]] as const;
const UNITS: Unit[] = ["HOUR", "DAY", "WEEK", "MONTH", "SESSION", "VISIT", "EACH"];
export type TType = { id: string; name: string; description: string | null; pricing_model: string | null; units: Unit[]; delivery: string | null; lead_time_days: number | null; commodity_code: string | null; default_on: boolean; hidden: boolean; used: number; use: { sellers: number; products: number; rates: number } };
export type TCat = { id: string; name: string; kind: string; hidden: boolean; types: TType[] };
export type TBt = { id: string; name: string; hidden: boolean; uses_skills: boolean; companies: number; description: string | null; categories: TCat[] };
export type TGroup = { id: string; name: string; segments: string[]; hidden: boolean; description: string | null; icon: string | null; tileLine: string | null; showInShop: boolean; rates: TType[]; businessTypes: TBt[] };
const SEL = "h-8 border border-line bg-white px-1.5 text-[12.5px]";
const BTN = "border border-line bg-white px-2 py-0.5 text-[12px] font-semibold hover:border-ink";
const LNK = "ml-2 text-[12px] font-bold text-magenta-dark underline";
const RED = "ml-2 text-[12px] font-bold text-[#C0392B] underline";
const TH = "border-b border-line px-2 py-2 text-left text-[10.5px] font-bold tracking-[0.1em] text-ink-3";
const TD = "border-b border-[#ECEEF4] px-2 py-2.5 align-middle text-[13px]";
const unitLabel = (u: string) => u[0] + u.slice(1).toLowerCase();

export function ServiceTaxonomyAdmin({ groups, suggested }: { groups: TGroup[]; suggested: { id: string; name: string; kind: string }[] }) {
  const router = useRouter();
  // CH-E004: "Used by" lists, loaded on demand.
  const [usedBy, setUsedBy] = useState<Record<string, string[] | null>>({});
  const showUsedBy = async (level: "businessType" | "type", id: string) => {
    if (usedBy[id] !== undefined) { setUsedBy((u) => { const n = { ...u }; delete n[id]; return n; }); return; }
    setUsedBy((u) => ({ ...u, [id]: null }));
    const r = await fetch("/api/admin/service-taxonomy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "usedBy", level, id }) });
    const j = (await r.json().catch(() => ({}))) as { names?: string[] };
    setUsedBy((u) => ({ ...u, [id]: j.names ?? [] }));
  };
  const UsedBy = ({ id }: { id: string }) => usedBy[id] === undefined ? null : (
    <span className="mt-1 block text-[12px] text-ink-2" data-used-by>{usedBy[id] === null ? "Loading…" : usedBy[id]!.length ? `Used by: ${usedBy[id]!.join(" · ")}` : "Nobody uses it yet."}</span>
  );
  const counts = (u: { sellers: number; products: number; rates: number }) => `${u.sellers} seller${u.sellers === 1 ? "" : "s"} · ${u.products} product${u.products === 1 ? "" : "s"} · ${u.rates} rate${u.rates === 1 ? "" : "s"}`;
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
  // TX2-E003: one rate table, used for a commodity's Rates and any business-type-level service categories.
  const rateTable = (rows: TType[]) => (
  <table className="mt-1 w-full border-collapse" data-rate-types>
    <thead><tr><th className={TH}>SERVICE TYPE</th><th className={TH}>UNIT</th><th className={TH}>DELIVERY</th><th className={TH}>COMMODITY CODE</th><th className={TH}>ON BY DEFAULT</th><th className={TH}>USED BY (SELLERS · PRODUCTS · RATES)</th><th className={TH} /></tr></thead>
    <tbody>
      {rows.map((t) => (
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
          <td className={`${TD} whitespace-nowrap text-[12px] tabular-nums`}>{counts(t.use)}{t.use.sellers + t.use.products + t.use.rates > 0 && <button type="button" onClick={() => showUsedBy("type", t.id)} className={LNK}>Used By</button>}<UsedBy id={t.id} /></td>
          <td className={`${TD} text-right`}><Move level="type" id={t.id} /><Acts level="type" id={t.id} name={t.name} used={t.used} hidden={t.hidden} /></td>
        </tr>
      ))}
    </tbody>
  </table>
  );
  const categories = groups.flatMap((g) => g.businessTypes.flatMap((b) => b.categories.map((c) => ({ id: c.id, label: `${b.name} › ${c.name}`, kind: c.kind }))));
  const allTypes = groups.flatMap((g) => g.businessTypes.flatMap((b) => b.categories.flatMap((c) => c.types.map((t) => ({ id: t.id, label: `${b.name} › ${t.name}` })))));
  const update = (id: string, fields: object) => call({ action: "update", id, fields });
  const allBts = groups.flatMap((g) => g.businessTypes.map((b) => ({ id: b.id, label: `${g.name} › ${b.name}` })));

  return (
    <div data-service-taxonomy-admin>
      {error && <p role="alert" className="mb-3 text-[13px] font-semibold text-magenta-dark">{error}</p>}
      {/* CH-E002: the top level is editable — a new Category starts with no Business Types. */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => open("addTop")} className={BTN}>+ Add Category</button>
        {inline({ k: "addTop", initial: "", placeholder: "Category name", onSave: (v) => call({ action: "addTopCategory", name: v }) })}
      </div>

      {groups.map((g) => (
        <section key={g.id} data-commodity-group={g.name} className={g.hidden ? "mb-8 opacity-60" : "mb-8"}>
          <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink pb-1.5">
            {g.icon && <CategoryIcon icon={g.icon as CategoryIconKey} className="h-6 w-6 text-magenta" />}
            {edit?.key === `rg:${g.id}` ? inline({ k: `rg:${g.id}`, initial: g.name, onSave: (v) => call({ action: "renameTopCategory", id: g.id, name: v }) }) : <h2 className="text-[18px] font-bold">{g.name}</h2>}
            <button type="button" onClick={() => open(`rg:${g.id}`, g.name)} className={LNK}>Rename</button>
            <HelpTip label={g.name} text={g.description} />
            <button type="button" onClick={() => open(`d:${g.id}`, g.description ?? "")} className={LNK}>{g.description ? "Edit description" : "+ Description"}</button>
            <span className="text-[12px] text-ink-3">UNSPSC {g.segments.join(" · ")}</span>
            {g.hidden && <span className="text-[11px] font-bold text-ink-3">HIDDEN</span>}
            <span className="ml-auto inline-flex items-center gap-1">
              <Move level="group" id={g.id} />
              <button type="button" onClick={() => call({ action: "hide", level: "group", id: g.id, hidden: !g.hidden })} className={BTN}>{g.hidden ? "Show" : "Hide"}</button>
              {g.businessTypes.length === 0 && g.rates.every((t) => t.used === 0) && <button type="button" onClick={() => window.confirm(`Delete ${g.name}? Nothing uses it.`) && call({ action: "deleteTopCategory", id: g.id })} className={RED}>Delete</button>}
              <button type="button" onClick={() => open(`ab:${g.id}`)} className={LNK}>+ Add Business Type</button>
            </span>
          </div>
          <div className="mt-2">{inline({ k: `ab:${g.id}`, initial: "", placeholder: "Business Type name", onSave: (v) => call({ action: "addBusinessType", id: g.id, name: v }) })}</div>
          <div>{inline({ k: `d:${g.id}`, initial: g.description ?? "", placeholder: "Examples, in plain words", onSave: (v) => call({ action: "describe", level: "group", id: g.id, description: v }) })}</div>
          {g.description && <p className="mt-1 text-[13px] text-ink-2">{g.description}</p>}
          {/* CH-E002: the Shop tile — icon, one line, shown in Shop and Hire or not. */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]" data-category-tile-fields>
            <span className="text-[10.5px] font-extrabold tracking-[0.12em] text-ink-2">SHOP TILE</span>
            <select aria-label="Icon" value={g.icon ?? ""} onChange={(e) => call({ action: "tile", id: g.id, icon: e.target.value || null })} className={SEL}>
              <option value="">Icon…</option>
              {CATEGORY_ICONS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            {edit?.key === `tl:${g.id}` ? inline({ k: `tl:${g.id}`, initial: g.tileLine ?? "", placeholder: "One line under the name", onSave: (v) => call({ action: "tile", id: g.id, tile_line: v }) }) : <span className="text-ink-2">{g.tileLine ?? "No line yet"}</span>}
            <button type="button" onClick={() => open(`tl:${g.id}`, g.tileLine ?? "")} className={LNK}>Edit Line</button>
            <button type="button" role="switch" aria-checked={g.showInShop} aria-label={`${g.name} shows in Shop`} onClick={() => call({ action: "tile", id: g.id, show_in_shop: !g.showInShop })} className={g.showInShop ? "relative ml-2 h-[22px] w-[38px] rounded-full bg-ink" : "relative ml-2 h-[22px] w-[38px] rounded-full bg-[#C9CDDC]"}>
              <span className={g.showInShop ? "absolute left-[18px] top-[2px] h-[18px] w-[18px] rounded-full bg-white" : "absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full bg-white"} />
            </button>
            <span className="text-ink-2">Show in Shop and Hire</span>
          </div>
          {/* TX2-E003: rates are set per commodity — every business type in it offers these. */}
          <div data-commodity-rates={g.name} className="mt-3 border border-line bg-white p-4">
            <div className="flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.12em] text-ink-2">{`SERVICE TYPES (RATES) · ALL ${g.name.toUpperCase()} BUSINESS TYPES`} <button type="button" onClick={() => open(`atg:${g.id}`)} className={LNK}>+ Add Service Type</button></div>
            {inline({ k: `atg:${g.id}`, initial: "", placeholder: "Rate type name", onSave: (v) => call({ action: "addType", id: g.id, to: "commodity", name: v }) })}
            {g.rates.length ? rateTable(g.rates) : <p className="mt-1 text-[13px] text-ink-3">No rates yet.</p>}
          </div>

          {g.businessTypes.map((b) => {
            const used = b.companies + b.categories.reduce((n, c) => n + c.types.reduce((m, t) => m + t.used, 0), 0);
            const rateCats = b.categories.filter((c) => c.kind === "SERVICE");
            const productCats = b.categories.filter((c) => c.kind === "SERVICE_PRODUCT");
            return (
              <div key={b.id} data-business-type={b.name} className={b.hidden ? "mt-4 border border-line bg-white p-4 opacity-60" : "mt-4 border border-line bg-white p-4"}>
                <div className="flex flex-wrap items-center gap-2">
                  {edit?.key === `r:${b.id}` ? inline({ k: `r:${b.id}`, initial: b.name, onSave: (v) => call({ action: "renameAt", level: "businessType", id: b.id, name: v }) }) : <h3 className="text-[16px] font-bold">{b.name}</h3>}
                  <HelpTip label={b.name} text={b.description} />
                  <button type="button" onClick={() => open(`d:${b.id}`, b.description ?? "")} className={LNK}>{b.description ? "Edit description" : "+ Description"}</button>
                  {b.uses_skills && <span className="border border-line px-1.5 text-[10px] font-bold tracking-[0.08em] text-ink-2">USES SKILLS</span>}
                  <span className="text-[12px] text-ink-3">{`${b.companies} ${b.companies === 1 ? "COMPANY" : "COMPANIES"}`} · {counts(b.categories.flatMap((c) => c.types).reduce((m, t) => ({ sellers: m.sellers + t.use.sellers, products: m.products + t.use.products, rates: m.rates + t.use.rates }), { sellers: 0, products: 0, rates: 0 }))}</span>
                  <button type="button" onClick={() => showUsedBy("businessType", b.id)} className={LNK}>Used By</button>
                  <select aria-label={`Move ${b.name} to…`} value="" onChange={(e) => e.target.value && call({ action: "moveBusinessType", id: b.id, to: e.target.value })} className={SEL}>
                    <option value="">Move to…</option>
                    {groups.filter((x) => x.id !== g.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                  {b.hidden && <span className="text-[11px] font-bold text-ink-3">HIDDEN</span>}
                  <span className="ml-auto inline-flex items-center"><Move level="businessType" id={b.id} /><Acts level="businessType" id={b.id} name={b.name} used={used} hidden={b.hidden} /></span>
                </div>
                {inline({ k: `d:${b.id}`, initial: b.description ?? "", placeholder: "Examples, in plain words", onSave: (v) => call({ action: "describe", level: "businessType", id: b.id, description: v }) })}
                <UsedBy id={b.id} />

                {rateCats.some((c) => c.types.length) && (
                  <>
                    <div className="mt-4 text-[10.5px] font-extrabold tracking-[0.12em] text-ink-2">{`SERVICE TYPES (RATES) · ONLY ${b.name.toUpperCase()}`}</div>
                    {rateTable(rateCats.flatMap((c) => c.types))}
                  </>
                )}

                <div className="mt-6 flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.12em] text-ink-2">SERVICE PRODUCT TYPES <button type="button" onClick={() => open(`ac:${b.id}`)} className={LNK}>+ Add Category</button></div>
                {inline({ k: `ac:${b.id}`, initial: "", placeholder: "Category name", onSave: (v) => call({ action: "addCategory", id: b.id, name: v, kind: "SERVICE_PRODUCT" }) })}
                <table className="mt-1 w-full border-collapse" data-product-types>
                  <thead><tr><th className={TH}>TYPE</th><th className={TH}>PRICING</th><th className={TH}>UNIT</th><th className={TH}>DELIVERY</th><th className={TH}>LEAD (DAYS)</th><th className={TH}>COMMODITY CODE</th><th className={TH}>USED BY (SELLERS · PRODUCTS · RATES)</th><th className={TH} /></tr></thead>
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
                            <td className={`${TD} whitespace-nowrap text-[12px] tabular-nums`}>{counts(t.use)}{t.use.sellers + t.use.products + t.use.rates > 0 && <button type="button" onClick={() => showUsedBy("type", t.id)} className={LNK}>Used By</button>}<UsedBy id={t.id} /></td>
                            <td className={`${TD} text-right`}>
                              <select aria-label={`Move ${t.name} to…`} value="" onChange={(e) => e.target.value && call({ action: "moveType", id: t.id, to: e.target.value })} className={`${SEL} mr-1 w-28`}>
                                <option value="">Move to…</option>
                                {allBts.filter((x) => x.id !== b.id).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                              </select>
                              <Move level="type" id={t.id} /><Acts level="type" id={t.id} name={t.name} used={t.used} hidden={t.hidden} />
                            </td>
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
          <p className="mt-1 text-[13.5px] text-ink-2">Nothing waiting. Members suggest types from Catalog and the Shop filter.</p>
        ) : (
          <ul className="mt-2">
            {suggested.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 border-t border-line py-2 text-[13.5px]">
                {edit?.key === `s:${s.id}` ? inline({ k: `s:${s.id}`, initial: s.name, onSave: (v) => call({ action: "rename", id: s.id, name: v }) }) : <b className="min-w-[180px]">{s.name}</b>}
                <span className="text-[11.5px] text-ink-3">{s.kind === "SERVICE_PRODUCT" ? "Service Product Type" : "Service Type"}</span>
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
