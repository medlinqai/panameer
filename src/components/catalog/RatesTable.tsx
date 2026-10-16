"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buyersSee, EXPENSES_LABEL } from "@/lib/rate-display";

// MC-E005: My Catalog › Services — the business type's rate types; toggle, rate, expenses. Saves as you go; draft until published.
type Unit = "HOUR" | "DAY" | "WEEK" | "MONTH" | "SESSION" | "VISIT" | "EACH";
export type RateType = { id: string; name: string; description: string | null; units: Unit[]; delivery: string | null; custom?: boolean };
export type RateRow = { id: string; serviceTypeId: string; rateCents: number | null; unit: string | null; published: boolean; expenses: string | null; hoursIncluded: number | null; offersOverride?: boolean | null; overrideCents?: number | null };
const PER: Record<string, string> = { HOUR: "/hr", DAY: "/day", WEEK: "/wk", MONTH: "/mo", SESSION: "/session", VISIT: "/visit", EACH: "each" };
const DELIVERY: Record<string, string> = { ONSITE: "Onsite", OFFSITE: "Offsite", EITHER: "Either" };
const EXPENSES = ["AT_COST", "INCLUDED", "NOT_APPLICABLE"] as const;
const COLS = "md:grid-cols-[56px_minmax(0,1.5fr)_minmax(0,1.15fr)_minmax(0,1fr)_72px_minmax(0,1.3fr)]";
export const ADD_RATE_EVENT = "pm:add-rate";
const dollars = (c: number | null | undefined) => (c != null ? String(c / 100) : "");

export function RatesTable({ types, rows, registration, gate, multiProvider = false, openToOffers = false, inRun = false }: { types: RateType[]; rows: RateRow[]; registration: { ONSITE: number | null; OFFSITE: number | null }; gate: { ok: boolean; reason: string | null; href: string }; multiProvider?: boolean; openToOffers?: boolean; /** Inside Create What You Sell: no Publish — Go Live publishes. */ inRun?: boolean }) {
  const [svc, setSvc] = useState<Record<string, RateRow>>(Object.fromEntries(rows.map((r) => [r.serviceTypeId, r])));
  const [rate, setRate] = useState<Record<string, string>>(Object.fromEntries(rows.map((r) => [r.serviceTypeId, dollars(r.rateCents)])));
  const [hrs, setHrs] = useState<Record<string, string>>(Object.fromEntries(rows.map((r) => [r.serviceTypeId, r.hoursIncluded ? String(r.hoursIncluded) : ""])));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [nw, setNw] = useState({ name: "", unit: "HOUR", delivery: "OFFSITE" });
  // The "+ Add a Rate Type" button sits at the top of the page (beside the subtitle) and opens the form here.
  useEffect(() => {
    const open = () => setAdding(true);
    window.addEventListener(ADD_RATE_EVENT, open);
    return () => window.removeEventListener(ADD_RATE_EVENT, open);
  }, []);

  const post = async (body: object) => {
    const r = await fetch("/api/catalog/build", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(j.error ?? "Could not save that");
    return r.ok ? j : null;
  };
  const save = async (t: RateType, on: boolean, patch: { expenses?: string; offersOverride?: boolean | null } = {}) => {
    setMsg(null);
    const n = Number(rate[t.id]);
    const h = Number(hrs[t.id]);
    const j = await post({ action: "service", serviceTypeId: t.id, on, rateCents: n > 0 ? Math.round(n * 100) : null, unit: t.units[0], hoursIncluded: t.units[0] === "MONTH" ? (h > 0 ? h : null) : undefined, ...patch });
    if (!j) return;
    setSvc((m) => {
      const next = { ...m };
      if (on && j.service) next[t.id] = { ...next[t.id], id: j.service.id, serviceTypeId: t.id, rateCents: j.service.rateCents, unit: j.service.unit, published: j.service.published, expenses: j.service.expenses, hoursIncluded: j.service.hoursIncluded, offersOverride: j.service.offersOverride };
      else delete next[t.id];
      return next;
    });
  };
  // BT-E005: only when the company has more than one provider.
  const override = async (t: RateType, s: RateRow) => {
    const v = window.prompt(`Your own rate for ${t.name} (blank uses the company rate)`, s.overrideCents != null ? String(s.overrideCents / 100) : "");
    if (v === null) return;
    const cents = v.trim() && Number(v) > 0 ? Math.round(Number(v) * 100) : null;
    const r = await fetch("/api/catalog/rate-override", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceId: s.id, rateCents: cents, unit: s.unit }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setMsg(j.error ?? "Could not save that");
    setSvc((m) => ({ ...m, [t.id]: { ...s, overrideCents: cents } }));
  };
  const addRate = async () => {
    setMsg(null);
    setBusy(true);
    const j = await post({ action: "addRate", ...nw });
    setBusy(false);
    if (!j) return;
    setAdding(false);
    setNw({ name: "", unit: "HOUR", delivery: "OFFSITE" });
    router.refresh();
  };
  const publish = async () => {
    setBusy(true);
    const j = await post({ action: "publish" });
    setBusy(false);
    if (j) {
      setMsg(j.published ? `Published ${j.published} rate${j.published === 1 ? "" : "s"}.` : "Everything priced is already live.");
      // Rows flip to LIVE in place (the server published every priced, active rate).
      setSvc((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.rateCents != null ? { ...v, published: true } : v])));
    }
  };
  const ready = Object.values(svc).filter((s) => s.rateCents != null).length;
  const drafts = Object.values(svc).filter((s) => s.rateCents != null && !s.published).length;

  return (
    <div data-rates-table>
      {adding && (
        <div data-add-rate className="mt-3 flex flex-wrap items-end gap-3 border border-line p-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[12px] font-bold text-ink-2">Service Name
            <input autoFocus value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter" && nw.name.trim().length >= 3) addRate(); if (e.key === "Escape") setAdding(false); }} placeholder="e.g. Weekend Hourly" maxLength={60} className="border border-line px-2 py-2 text-[13.5px] font-normal text-ink" />
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-bold text-ink-2">Per
            <select value={nw.unit} onChange={(e) => setNw({ ...nw, unit: e.target.value })} className="border border-line bg-surface px-2 py-2 text-[13px] font-normal text-ink">
              {(["HOUR", "DAY", "WEEK", "MONTH", "SESSION", "EACH"] as const).map((u) => <option key={u} value={u}>{u[0] + u.slice(1).toLowerCase()}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-bold text-ink-2">Delivery
            <select value={nw.delivery} onChange={(e) => setNw({ ...nw, delivery: e.target.value })} className="border border-line bg-surface px-2 py-2 text-[13px] font-normal text-ink">
              {Object.entries(DELIVERY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <button type="button" disabled={busy || nw.name.trim().length < 3} onClick={addRate} className="min-h-10 bg-ink px-4 text-[13.5px] font-semibold text-surface disabled:opacity-40">Add</button>
          <button type="button" onClick={() => setAdding(false)} className="min-h-10 px-2 text-[13px] font-semibold text-magenta-dark underline underline-offset-4">Cancel</button>
        </div>
      )}
      <div className={`mt-5 hidden border-b border-line pb-2 text-[10.5px] font-bold tracking-[0.1em] text-ink-3 md:grid md:gap-3 ${COLS}`}>
        <span>OFFER</span><span>RATE TYPE</span><span>YOUR RATE</span><span>EXPENSES</span><span>DELIVERY</span><span>BUYERS SEE</span>
      </div>
      <ul className="mt-2 md:mt-0">
        {types.map((t) => {
          const s = svc[t.id];
          const on = !!s;
          const unit = t.units[0] ?? "HOUR";
          const reg = t.delivery === "ONSITE" || t.delivery === "OFFSITE" ? registration[t.delivery] : null;
          const fromReg = on && reg != null && s.rateCents === reg;
          const n = Number(rate[t.id]);
          const see = on ? buyersSee({ rateCents: n > 0 ? Math.round(n * 100) : null, unit, delivery: t.delivery, expenses: s.expenses, hoursIncluded: Number(hrs[t.id]) || null }) : null;
          return (
            <li key={t.id} data-rate-type={t.name} data-on={on ? "1" : "0"} className={`grid grid-cols-[48px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-b border-[#ECEEF4] py-3 md:gap-3 ${COLS}`}>
              <button type="button" role="switch" aria-checked={on} aria-label={`Offer ${t.name}`} onClick={() => save(t, !on)} className={on ? "relative h-[22px] w-[38px] rounded-full bg-ink" : "relative h-[22px] w-[38px] rounded-full bg-[#C9CDDC]"}>
                <span className={on ? "absolute left-[18px] top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-[left]" : "absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-[left]"} />
              </button>
              <span className={on ? "min-w-0" : "min-w-0 text-ink-3"}>
                <b className="text-[14px]">{t.name}</b>
                {t.custom && <span data-custom-rate title="Your own rate type — Panameer may add it for everyone" className="ml-1.5 inline-block border border-dashed border-ink-3 px-1.5 py-px align-middle text-[10px] font-bold tracking-[0.08em] text-ink-2">CUSTOM</span>}
                {fromReg && <span data-from-registration className="ml-1.5 inline-block border border-magenta px-1.5 py-px align-middle text-[10px] font-bold tracking-[0.08em] text-magenta-dark">FROM REGISTRATION</span>}
                {t.description && <small className="block text-[12px] text-ink-3">{t.description}</small>}
              </span>
              <span className={on ? "col-start-2 flex flex-wrap items-center gap-2 md:col-start-auto" : "col-start-2 flex flex-wrap items-center gap-2 opacity-45 md:col-start-auto"}>
                <span className="inline-flex items-center border border-line bg-surface">
                  <span className="px-2 text-[13px] text-ink-3">$</span>
                  <input inputMode="decimal" aria-label={`${t.name} rate`} value={rate[t.id] ?? ""} placeholder="—" onChange={(e) => setRate((r) => ({ ...r, [t.id]: e.target.value }))} onBlur={() => rate[t.id] && save(t, true)} className="w-[78px] border-0 px-1 py-2 text-[13.5px] outline-none" />
                  <span className="px-2 text-[13px] text-ink-3">{PER[unit]}</span>
                </span>
                {unit === "MONTH" && (
                  <span className="inline-flex items-center gap-1 text-[12.5px] text-ink-2">
                    for <input inputMode="numeric" aria-label={`${t.name} hours included`} value={hrs[t.id] ?? ""} onChange={(e) => setHrs((h) => ({ ...h, [t.id]: e.target.value }))} onBlur={() => on && save(t, true)} className="w-14 border border-line px-2 py-2 text-[13px]" /> hrs
                  </span>
                )}
              </span>
              <span className={on ? "col-start-2 md:col-start-auto" : "col-start-2 opacity-45 md:col-start-auto"}>
                <select aria-label={`${t.name} expenses`} value={s?.expenses ?? (t.delivery === "ONSITE" ? "AT_COST" : "NOT_APPLICABLE")} disabled={!on} onChange={(e) => save(t, true, { expenses: e.target.value })} className="w-full border border-line bg-surface px-2 py-2 text-[13px]">
                  {EXPENSES.map((x) => <option key={x} value={x}>{EXPENSES_LABEL[x]}</option>)}
                </select>
              </span>
              <span className="col-start-2 text-[13px] text-ink-2 md:col-start-auto">{t.delivery ? DELIVERY[t.delivery] : "—"}</span>
              <span data-buyers-see className={on ? "col-start-2 text-[13px] md:col-start-auto" : "col-start-2 text-[13px] text-ink-3 md:col-start-auto"}>
                {on ? see ?? "Add a rate" : "Hidden until on"}
                {s?.published ? <span className="ml-1.5 inline-block border border-ink px-1.5 py-px align-middle text-[10px] font-bold tracking-[0.08em]">LIVE</span> : on && s?.rateCents != null ? <span data-draft className="ml-1.5 inline-block border border-dashed border-ink-3 px-1.5 py-px align-middle text-[10px] font-bold tracking-[0.08em] text-ink-2">DRAFT</span> : null}
                {/* Lane 7: this Service's own Open to Offers (else the seller's switch). */}
                {s && (
                  <label className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-2" data-service-offers>
                    <input type="checkbox" checked={s.offersOverride ?? openToOffers} onChange={(e) => save(t, true, { offersOverride: e.target.checked === openToOffers ? null : e.target.checked })} className="h-3.5 w-3.5 accent-ink" />
                    Open to offers
                  </label>
                )}
                {multiProvider && s && (
                  <button type="button" onClick={() => override(t, s)} data-override-rate className="block text-[12px] font-semibold text-magenta-dark underline underline-offset-4">
                    {s.overrideCents != null ? `Your rate $${s.overrideCents / 100}` : "Override My Rate"}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[13.5px] text-ink-2">Fixed-price work — reports, dashboards, AI agents, integrations — goes in <Link href="/catalog/products" className="font-bold text-magenta-dark underline underline-offset-4">Service Products</Link>.</p>
      {inRun ? (
        <p className="mt-6 border-t-2 border-ink pt-4 text-[13.5px] text-ink-2">Turn on the rates you charge, or skip to Products if you only sell fixed-price packages. Saved as you go; everything goes live when you Enable My Catalog.</p>
      ) : (
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-4">
        <span className="text-[13.5px] text-ink-2">
          Saved as you go. {drafts ? <>Publish makes {drafts === 1 ? "your draft rate" : `your ${drafts} draft rates`} live; after that, changes go live right away.</> : <>All your rates are live; changes go live right away.</>} Service Products publish on their own tab.
          {!gate.ok && <> <Link href={gate.href} className="font-semibold text-magenta-dark underline">{gate.reason}</Link></>}
        </span>
        <button type="button" disabled={busy || !gate.ok || !drafts} onClick={publish} data-publish-catalog className="inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40">{busy ? "Publishing…" : "Publish My Rates"}</button>
      </div>
      )}
      {msg && <p role="status" className="mt-2 text-right text-[13.5px] font-semibold">{msg}</p>}
    </div>
  );
}
