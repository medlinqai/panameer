"use client";

import { useEffect, useMemo, useState } from "react";

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
  const [domainId, setDomainId] = useState("");
  const [skillId, setSkillId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [productId, setProductId] = useState("");
  const [itemId, setItemId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/provider/capabilities").then((r) => (r.ok ? r.json() : { enabled: false })).then(setData).catch(() => setData({ enabled: false })); }, []);
  const o = data?.options;
  const processes = useMemo(() => [...new Set(o?.domains.map((d) => d.process) ?? [])], [o]);
  const vendor = o?.vendors.find((v) => v.id === vendorId);
  const product = vendor?.products.find((p) => p.id === productId);
  // Items for the chosen domain first, then the rest.
  const items = product ? [...product.items].sort((a, b) => Number(b.domain_id === domainId) - Number(a.domain_id === domainId)) : [];
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
    if (!mode || !domainId) return setMsg("Answer how you work with it and what you know.");
    if (await post({ action: "add", mode, domainId, knowledgeSkillId: skillId || null, systemItemId: itemId || null, workRoleId: roleId || null })) {
      setSkillId(""); setItemId(""); setMsg("Added.");
    }
  };
  const caps = data.capabilities ?? [];
  return (
    <section data-capabilities-editor className="mb-6 border border-line bg-white p-4">
      <h2 className="text-[17px] font-bold">What You Do</h2>
      <p className="text-[13px] text-ink-2">The same knowledge, three ways of working with it. Add each one you offer.</p>

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
            <select aria-label="Process" value={process} onChange={(e) => { setProcess(e.target.value); setDomainId(""); setSkillId(""); }} className={SEL}>
              <option value="">Process</option>
              {processes.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select aria-label="Capability Domain" value={domainId} disabled={!process} onChange={(e) => { setDomainId(e.target.value); setSkillId(""); }} className={SEL}>
              <option value="">Capability Domain</option>
              {o.domains.filter((d) => d.process === process).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {o.skills.some((s) => s.domain_id === domainId) && (
              <select aria-label="Skill (optional)" value={skillId} onChange={(e) => setSkillId(e.target.value)} className={SEL}>
                <option value="">Skill (optional)</option>
                {o.skills.filter((s) => s.domain_id === domainId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
        </div>
        <div>
          <span className={Q}>3 · In which system? <span className="font-normal text-ink-3">(optional)</span></span>
          <div className="grid gap-2 sm:grid-cols-3">
            <select aria-label="Vendor" value={vendorId} onChange={(e) => { setVendorId(e.target.value); setProductId(""); setItemId(""); }} className={SEL}>
              <option value="">Vendor</option>
              {o.vendors.filter((v) => v.products.length).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <select aria-label="Product" value={productId} disabled={!vendor} onChange={(e) => { setProductId(e.target.value); setItemId(""); }} className={SEL}>
              <option value="">Product</option>
              {vendor?.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select aria-label="Module or Tool" value={itemId} disabled={!product} onChange={(e) => setItemId(e.target.value)} className={SEL}>
              <option value="">Module / Tool</option>
              {items.map((i) => <option key={i.id} value={i.id}>{`${i.name}${domainId && i.domain_id === domainId ? " ★" : ""}`}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          {msg && <span role="status" className="text-[13px] font-semibold">{msg}</span>}
          <button type="button" disabled={busy} onClick={add} data-add-capability className="inline-flex min-h-10 items-center bg-ink px-4 text-[13.5px] font-bold text-surface disabled:opacity-40">Add</button>
        </div>
      </div>

      {caps.length > 0 && (
        <ul className="mt-4 border-t border-line" data-capabilities>
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
