"use client";

import { useEffect, useState } from "react";
import { RatesTable, type RateRow, type RateType } from "@/components/catalog/RatesTable";
import { ProductsTab } from "@/components/catalog/ProductsTab";

type Data = { businessTypes: string[]; types: RateType[]; rows: RateRow[]; registration: { ONSITE: number | null; OFFSITE: number | null }; gate: { ok: boolean; reason: string | null; href: string }; multiProvider: boolean; openToOffers: boolean };

// SO-E004 Get Found › Your Rates: My Catalog › Services' rates table, the same component and data.
export function GetFoundRates() {
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => {
    fetch("/api/onboarding/provider/rates").then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => setD(null));
  }, []);
  if (!d) return <p className="text-[14px] text-ink-2">Loading your rate types…</p>;
  if (!d.businessTypes.length) return <p className="border-l-2 border-magenta py-1 pl-3 text-[14.5px]">Pick your company&apos;s business type first — it decides which rate types you get.</p>;
  return (
    <div data-get-found-rates>
      <p className="inline-flex flex-wrap items-center gap-2 border border-line px-3 py-1.5 text-[12.5px] text-ink-2">Business Type: <b className="text-ink">{d.businessTypes.join(" · ")}</b></p>
      <RatesTable key={d.rows.map((r) => r.serviceTypeId).join()} types={d.types} rows={d.rows} registration={d.registration} gate={d.gate} multiProvider={d.multiProvider} openToOffers={d.openToOffers} inRun />
    </div>
  );
}

/** Go Live: the rates buyers will see, with Edit back to Your Rates. */
export function GoLiveRates({ onEdit }: { onEdit: () => void }) {
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => {
    fetch("/api/onboarding/provider/rates").then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => setD(null));
  }, []);
  const name = new Map((d?.types ?? []).map((t) => [t.id, t.name]));
  const on = (d?.rows ?? []).filter((r) => r.rateCents != null);
  return (
    <section data-go-live-rates className="mb-5 border border-line">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <b className="text-[15px]">Your Rates</b>
        <button type="button" onClick={onEdit} className="text-[13.5px] font-bold text-magenta hover:underline">Edit</button>
      </div>
      {!d ? (
        <p className="px-5 py-3 text-[14px] text-ink-2">Loading…</p>
      ) : on.length ? (
        <ul>{on.map((r) => <li key={r.id} className="flex justify-between gap-3 border-b border-line px-5 py-2.5 text-[14.5px] last:border-0"><span>{name.get(r.serviceTypeId) ?? "Rate"}</span><b className="tabular-nums">${(r.rateCents! / 100).toLocaleString("en-US")}{r.unit ? ` / ${r.unit.toLowerCase()}` : ""}</b></li>)}</ul>
      ) : (
        <p className="px-5 py-3 text-[14px] text-magenta-dark">No rate yet — add at least one.</p>
      )}
    </section>
  );
}

/** Scott 10-16: Create What You Sell › Products — My Catalog's Service Products, kept inside the run. Optional. */
export function GetFoundProducts() {
  type P = Parameters<typeof ProductsTab>[0];
  const [d, setD] = useState<Omit<P, "editId" | "onSaved"> | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    fetch("/api/onboarding/provider/products").then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => setD(null));
  }, [n]);
  if (!d) return <p className="text-[14px] text-ink-2">Loading your products…</p>;
  return (
    <div data-get-found-products>
      <ProductsTab key={`${n}|${editId ?? ""}`} {...d} editId={editId} onSaved={(id) => { setEditId(id); setN((x) => x + 1); }} />
    </div>
  );
}
