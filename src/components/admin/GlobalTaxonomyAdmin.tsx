"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// GT-E005: Admin › Global Taxonomy — Knowledge · Systems · Way of Working. Rename (Enter saves), Hide, re-link item → domain.
type Domain = { id: string; process: string; name: string; gt: boolean; skills: { id: string; name: string; hidden: boolean }[] };
type Item = { id: string; name: string; kind: string; hidden: boolean; domainId: string | null; product: string; vendor: string };
type Role = { id: string; mode: string; name: string; hidden: boolean };
const TH = "border-b border-line px-2 py-2 text-left text-[10.5px] font-bold tracking-[0.1em] text-ink-3";
const TD = "border-b border-state-sunken px-2 py-2 text-[13px] align-middle";
const MODE: Record<string, string> = { IMPLEMENT: "Implement", SUPPORT: "Support", OPERATE: "Do the Work" };

type Attr = { id: string; name: string; choices: string[]; list: string | null; hidden: boolean; businessType: string; commodity: string };
const LIST: Record<string, string> = { US_STATES: "US states", COUNTRIES: "Country list", LANGUAGES: "Language list", FREE: "Typed by the seller" };

export function GlobalTaxonomyAdmin({ tab, domains, items, roles, unlinkedOnly, attributes = [] }: { tab: string; domains: Domain[]; items: Item[]; roles: Role[]; unlinkedOnly: boolean; attributes?: Attr[] }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const call = async (body: object) => {
    setErr(null);
    const r = await fetch("/api/admin/global-taxonomy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setErr(j.error ?? "Could not save that");
    else router.refresh();
  };
  const name = (kind: string, id: string, value: string) => (
    <input defaultValue={value} aria-label="Name" onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { (e.target as HTMLInputElement).value = value; (e.target as HTMLInputElement).blur(); } }}
      onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== value && call({ action: "rename", kind, id, name: e.target.value.trim() })} className="w-full border border-transparent bg-transparent px-1 py-0.5 hover:border-line focus:border-ink" />
  );
  const hide = (kind: string, id: string, hidden: boolean) => <button type="button" onClick={() => call({ action: "hide", kind, id, hidden: !hidden })} className="text-[12px] font-bold text-magenta-dark underline">{hidden ? "Show" : "Hide"}</button>;
  const tabs = [["knowledge", "Knowledge"], ["systems", "Systems"], ["work", "Way of Working"], ["attributes", "Attributes"]];
  const byProcess = [...new Set(domains.map((d) => d.process))];
  return (
    <div data-global-taxonomy-admin>
      <div className="mb-4 flex gap-4 border-b border-line">
        {tabs.map(([k, l]) => <Link key={k} href={`/admin/global-taxonomy?tab=${k}`} className={tab === k ? "border-b-[3px] border-magenta pb-2 text-[14px] font-bold" : "pb-2 text-[14px] text-ink-2"}>{l}</Link>)}
      </div>
      {err && <p role="alert" className="mb-2 text-[13px] font-semibold text-magenta-dark">{err}</p>}
      {tab === "knowledge" && byProcess.map((p) => (
        <section key={p} className="mb-5">
          <h2 className="text-[11px] font-extrabold tracking-[0.12em] text-ink-2">{p.toUpperCase()}</h2>
          <table className="mt-1 w-full border-collapse bg-white"><tbody>
            {domains.filter((d) => d.process === p).map((d) => (
              <tr key={d.id} data-domain={d.name}>
                <td className={`${TD} w-[40%]`}>{d.gt ? name("domain", d.id, d.name) : <span className="px-1">{d.name}</span>}{d.gt && <span className="ml-1 text-[10px] font-bold text-ink-3">NEW</span>}</td>
                <td className={TD}>{d.skills.map((s) => <span key={s.id} className={s.hidden ? "mr-3 inline-flex items-center gap-1 text-ink-3" : "mr-3 inline-flex items-center gap-1"}><span className="w-44">{name("knowledgeSkill", s.id, s.name)}</span>{hide("knowledgeSkill", s.id, s.hidden)}</span>)}</td>
              </tr>
            ))}
          </tbody></table>
        </section>
      ))}
      {tab === "systems" && (
        <>
          <p className="mb-2 text-[13px]"><Link href={`/admin/global-taxonomy?tab=systems${unlinkedOnly ? "" : "&unlinked=1"}`} className="font-bold text-magenta-dark underline">{unlinkedOnly ? "Show all" : "Show unlinked only"}</Link> · {items.length} shown</p>
          <table className="w-full border-collapse bg-white">
            <thead><tr><th className={TH}>VENDOR › PRODUCT</th><th className={TH}>MODULE / TOOL</th><th className={TH}>KIND</th><th className={TH}>KNOWLEDGE DOMAIN</th><th className={TH} /></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} data-item={i.name} className={i.hidden ? "text-ink-3" : ""}>
                  <td className={TD}>{`${i.vendor} › ${i.product}`}</td>
                  <td className={TD}>{name("item", i.id, i.name)}</td>
                  <td className={TD}>{i.kind === "TOOL" ? "Tool" : "Module"}</td>
                  <td className={TD}>
                    <select aria-label="Knowledge domain" value={i.domainId ?? ""} onChange={(e) => call({ action: "link", id: i.id, domainId: e.target.value || null })} className="w-full border border-line px-1.5 py-1 text-[12.5px]">
                      <option value="">— not linked —</option>
                      {byProcess.map((p) => <optgroup key={p} label={p}>{domains.filter((d) => d.process === p).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</optgroup>)}
                    </select>
                  </td>
                  <td className={`${TD} text-right`}>{hide("item", i.id, i.hidden)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {/* Lane 6: search attributes per Business Type — rename, edit the pick-list, hide. */}
      {tab === "attributes" && (
        <table className="w-full border-collapse bg-white" data-attributes-admin>
          <thead><tr><th className={TH}>COMMODITY › BUSINESS TYPE</th><th className={TH}>ATTRIBUTE</th><th className={TH}>CHOICES (· between)</th><th className={TH} /></tr></thead>
          <tbody>
            {attributes.map((a) => (
              <tr key={a.id} data-attribute={a.name} className={a.hidden ? "text-ink-3" : ""}>
                <td className={TD}>{`${a.commodity} › ${a.businessType}`}</td>
                <td className={TD}>{name("attribute", a.id, a.name)}</td>
                <td className={TD}>{a.list ? <span className="px-1 text-ink-2">{LIST[a.list] ?? a.list}</span> : (
                  <input defaultValue={a.choices.join(" · ")} aria-label={`${a.name} choices`} onBlur={(e) => { const next = e.target.value.split("·").map((x) => x.trim()).filter(Boolean); if (next.join("·") !== a.choices.join("·")) void call({ action: "choices", id: a.id, choices: next }); }} className="w-full border border-transparent bg-transparent px-1 py-0.5 hover:border-line focus:border-ink" />
                )}</td>
                <td className={`${TD} w-20 text-right`}>{hide("attribute", a.id, a.hidden)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {tab === "work" && (["IMPLEMENT", "SUPPORT", "OPERATE"] as const).map((m) => (
        <section key={m} className="mb-5">
          <h2 className="text-[11px] font-extrabold tracking-[0.12em] text-ink-2">{MODE[m].toUpperCase()}</h2>
          <table className="mt-1 w-full border-collapse bg-white"><tbody>
            {roles.filter((r) => r.mode === m).map((r) => (
              <tr key={r.id} data-role={r.name} className={r.hidden ? "text-ink-3" : ""}><td className={TD}>{name("role", r.id, r.name)}</td><td className={`${TD} w-20 text-right`}>{hide("role", r.id, r.hidden)}</td></tr>
            ))}
          </tbody></table>
        </section>
      ))}
    </div>
  );
}
