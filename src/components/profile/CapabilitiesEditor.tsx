"use client";

import { useEffect, useMemo, useState } from "react";
import { HelpTip } from "@/components/ui/HelpTip";
import { fieldHelp } from "@/lib/field-guide";

// GT-E004: three plain questions — How do you work with it? · What do you know? · In which system? (behind taxonomy_v2).
type Mode = "IMPLEMENT" | "SUPPORT" | "OPERATE";
type Cap = { id: string; line: string; mode: Mode; source: string; confirmed: boolean };
type Opts = {
  domains: { id: string; process: string; name: string }[];
  skills: { id: string; name: string; domain_id: string }[];
  vendors: { id: string; name: string; products: { id: string; name: string; items: { id: string; name: string; kind: string; domain_id: string | null }[] }[] }[];
  roles: { id: string; name: string; mode: Mode }[];
};
const MODES: [Mode, string][] = [["IMPLEMENT", "I implement it"], ["SUPPORT", "I support it"], ["OPERATE", "I do the work"]];
const SEL = "w-full border border-line bg-white px-3 py-2.5 text-[14px]";
const Q = "mb-1.5 block text-[13px] font-bold text-ink";

export function CapabilitiesEditor() {
  const [data, setData] = useState<{ enabled: boolean; options?: Opts; capabilities?: Cap[] } | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [process, setProcess] = useState("");
  const [domainIds, setDomainIds] = useState<string[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [productId, setProductId] = useState("");
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [roleId, setRoleId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/provider/capabilities").then((r) => (r.ok ? r.json() : { enabled: false })).then(setData).catch(() => setData({ enabled: false })); }, []);
  const o = data?.options;
  const processes = useMemo(() => [...new Set(o?.domains.map((d) => d.process) ?? [])], [o]);
  const vendor = o?.vendors.find((v) => v.id === vendorId);
  const product = vendor?.products.find((p) => p.id === productId);
  // Items in the picked domains first, then the rest.
  const inPicked = (i: { domain_id: string | null }) => !!i.domain_id && domainIds.includes(i.domain_id);
  const items = product ? [...product.items].sort((a, b) => Number(inPicked(b)) - Number(inPicked(a)) || a.name.localeCompare(b.name)) : [];
  const procDomains = o ? o.domains.filter((d) => d.process === process) : [];
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  if (!data?.enabled || !o) return null;

  const post = async (body: object) => {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/provider/capabilities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(j.error ?? "Could not save that"); return false; }
    setData((d) => (d ? { ...d, capabilities: j.capabilities } : d));
    return true;
  };
  const add = async () => {
    if (!mode || !domainIds.length) return setMsg("Answer how you work with it and what you know.");
    if (await post({ action: "addMany", mode, domainIds, systemItemIds: itemIds, workRoleId: roleId || null })) {
      setItemIds([]); setMsg("Added.");
    }
  };
  const confirmAll = async () => {
    for (const c of (data.capabilities ?? []).filter((x) => !x.confirmed)) {
      const m = (document.getElementById(`m-${c.id}`) as HTMLSelectElement | null)?.value;
      if (!(await post({ action: "confirm", id: c.id, mode: m }))) return;
    }
    setMsg("All confirmed.");
  };
  const BOX = "flex items-center gap-2 py-1 text-[13.5px]";
  const caps = data.capabilities ?? [];
  return (
    <section data-capabilities-editor className="mb-6 border border-line bg-white p-4">
      <h2 className="flex items-center text-[17px] font-bold">What You Do<HelpTip label="What I Do" text={fieldHelp("What I Do", "seller")} /></h2>
      <p className="text-[13px] text-ink-2">Pick how you work, tick everything you know, then tick the modules in each product you use (your ticks stay when you switch products). Press Add once.</p>

      <div className="mt-3 grid gap-4">
        <div>
          <span className={Q}>1 · How do you work with it?</span>
          <div className="flex flex-wrap gap-2">
            {MODES.map(([m, l]) => <button key={m} type="button" data-mode={m} onClick={() => { setMode(m); setRoleId(""); }} className={mode === m ? "border border-ink bg-ink px-3 py-2 text-[13.5px] font-semibold text-white" : "border border-ink px-3 py-2 text-[13.5px] font-semibold"}>{l}</button>)}
          </div>
          {mode && o.roles.some((r) => r.mode === mode) && (
            <select aria-label="Role (optional)" value={roleId} onChange={(e) => setRoleId(e.target.value)} className={`${SEL} mt-2`}>
              <option value="">Role (optional)</option>
              {o.roles.filter((r) => r.mode === mode).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
        </div>
        <div>
          <span className={Q}>2 · What do you know?</span>
          <div className="grid gap-2 sm:grid-cols-3">
            <select aria-label="Process" value={process} onChange={(e) => setProcess(e.target.value)} className={SEL}>
              <option value="">Process</option>
              {processes.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {process && (
            <div data-domain-boxes className="mt-2 border border-line p-2.5">
              <label className={`${BOX} font-bold`}><input type="checkbox" checked={procDomains.length > 0 && procDomains.every((d) => domainIds.includes(d.id))} onChange={(e) => setDomainIds(e.target.checked ? [...new Set([...domainIds, ...procDomains.map((d) => d.id)])] : domainIds.filter((id) => !procDomains.some((d) => d.id === id)))} /> All of {process}</label>
              <div className="grid sm:grid-cols-2">
                {procDomains.map((d) => <label key={d.id} className={BOX}><input type="checkbox" checked={domainIds.includes(d.id)} onChange={() => setDomainIds(toggle(domainIds, d.id))} /> {d.name}</label>)}
              </div>
            </div>
          )}
        </div>
        <div>
          <span className={Q}>3 · In which system? <span className="font-normal text-ink-3">(optional)</span></span>
          <div className="grid gap-2 sm:grid-cols-3">
            <select aria-label="Vendor" value={vendorId} onChange={(e) => { setVendorId(e.target.value); setProductId(""); }} className={SEL}>
              <option value="">Vendor</option>
              {o.vendors.filter((v) => v.products.length).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <select aria-label="Product" value={productId} disabled={!vendor} onChange={(e) => setProductId(e.target.value)} className={SEL}>
              <option value="">Product</option>
              {vendor?.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

          </div>
        </div>
        {product && (
          <div data-item-boxes className="-mt-2 max-h-72 overflow-y-auto border border-line p-2.5">
            {domainIds.length > 0 && items.some(inPicked) && (
              <label className={`${BOX} font-bold`}><input type="checkbox" checked={items.filter(inPicked).every((i) => itemIds.includes(i.id))} onChange={(e) => setItemIds(e.target.checked ? [...new Set([...itemIds, ...items.filter(inPicked).map((i) => i.id)])] : itemIds.filter((id) => !items.some((i) => i.id === id && inPicked(i))))} /> All {product.name} modules for what you picked</label>
            )}
            <div className="grid sm:grid-cols-2">
              {items.map((i) => <label key={i.id} className={`${BOX} ${inPicked(i) ? "" : "text-ink-3"}`}><input type="checkbox" checked={itemIds.includes(i.id)} onChange={() => setItemIds(toggle(itemIds, i.id))} /> {i.name}</label>)}
            </div>
          </div>
        )}
        <div className="flex items-center justify-end gap-3">
          {itemIds.length > 0 && <span className="text-[12.5px] text-ink-2">{itemIds.length} module{itemIds.length === 1 ? "" : "s"} ticked (across products) · <button type="button" className="underline" onClick={() => setItemIds([])}>Clear</button></span>}
          {msg && <span role="status" className="text-[13px] font-semibold">{msg}</span>}
          <button type="button" disabled={busy} onClick={add} data-add-capability className="inline-flex min-h-10 items-center bg-ink px-4 text-[13.5px] font-bold text-surface disabled:opacity-40">Add</button>
        </div>
      </div>

      {caps.some((c) => !c.confirmed) && (
        <div className="mt-4 flex justify-end"><button type="button" disabled={busy} onClick={confirmAll} data-confirm-all className="bg-ink px-3 py-1.5 text-[13px] font-bold text-white">Confirm All ({caps.filter((c) => !c.confirmed).length})</button></div>
      )}
      {caps.length > 0 && (
        <ul className="mt-2 border-t border-line" data-capabilities>
          {caps.map((c) => (
            <li key={c.id} data-capability={c.confirmed ? "confirmed" : "unconfirmed"} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-[13.5px]">
              <span className="min-w-0">{c.line}{!c.confirmed && <span className="ml-1.5 text-[11px] font-bold text-ink-3">FROM YOUR SKILLS — CHECK HOW YOU WORK WITH IT</span>}</span>
              <span className="flex items-center gap-2">
                {!c.confirmed && (
                  <>
                    <select aria-label="How you work with it" defaultValue={c.mode} id={`m-${c.id}`} className="border border-line px-2 py-1 text-[12.5px]">{MODES.map(([m, l]) => <option key={m} value={m}>{l}</option>)}</select>
                    <button type="button" disabled={busy} data-confirm-capability onClick={() => post({ action: "confirm", id: c.id, mode: (document.getElementById(`m-${c.id}`) as HTMLSelectElement | null)?.value })} className="bg-ink px-2.5 py-1 text-[12.5px] font-bold text-white">Confirm</button>
                  </>
                )}
                <button type="button" disabled={busy} onClick={() => post({ action: "remove", id: c.id })} className="text-[12.5px] font-semibold underline">Remove</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
