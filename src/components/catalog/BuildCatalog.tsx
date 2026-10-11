"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCents } from "@/lib/display";

// TX-E004: Build Your Catalog — toggle the stock Service Types you offer, set a rate; product-type tiles with "+ Add".
type Unit = "HOUR" | "DAY" | "WEEK" | "MONTH" | "SESSION" | "VISIT" | "EACH";
type SType = { id: string; name: string; description: string | null; units: Unit[]; required: boolean };
type Cat = { id: string; name: string; kind: "SERVICE" | "SERVICE_PRODUCT"; types: SType[] };
type Svc = { serviceTypeId: string; rateCents: number | null; unit: string | null; published: boolean };
type Prod = { serviceTypeId: string; title: string };
const SHORT: Record<Unit, string> = { HOUR: "hr", DAY: "day", WEEK: "wk", MONTH: "mo", SESSION: "session", VISIT: "visit", EACH: "each" };
const LABEL = (u: Unit) => u[0] + u.slice(1).toLowerCase();
const code = (n: string) => n.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function BuildCatalog({ businessTypes, categories, services, products, gate }: { businessTypes: { id: string; name: string }[]; categories: Cat[]; services: Svc[]; products: Prod[]; gate: { ok: boolean; reason: string | null; href: string } }) {
  const [svc, setSvc] = useState<Record<string, Svc>>(Object.fromEntries(services.map((s) => [s.serviceTypeId, s])));
  const [rates, setRates] = useState<Record<string, string>>(Object.fromEntries(services.map((s) => [s.serviceTypeId, s.rateCents != null ? String(s.rateCents / 100) : ""])));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const post = async (body: object) => {
    const r = await fetch("/api/catalog/build", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(j.error ?? "Could not save that");
    return r.ok ? j : null;
  };
  const save = async (t: SType, on: boolean, unit?: Unit) => {
    setMsg(null);
    const cur = svc[t.id];
    const rate = Number(rates[t.id]);
    const j = await post({ action: "service", serviceTypeId: t.id, on, rateCents: rate > 0 ? Math.round(rate * 100) : null, unit: unit ?? (cur?.unit as Unit | undefined) ?? t.units[0] });
    if (!j) return;
    setSvc((s) => {
      const n = { ...s };
      if (on && j.service) n[t.id] = { serviceTypeId: t.id, rateCents: j.service.rateCents, unit: j.service.unit, published: j.service.published };
      else delete n[t.id];
      return n;
    });
  };
  const publish = async () => {
    setBusy(true);
    const j = await post({ action: "publish" });
    setBusy(false);
    if (j) setMsg(j.published ? `Published ${j.published} service${j.published === 1 ? "" : "s"}.` : "Everything priced is already live.");
  };
  const suggest = async (kind: "SERVICE" | "SERVICE_PRODUCT") => {
    const name = window.prompt(kind === "SERVICE" ? "Suggest a Service Type" : "Suggest a Service Product Type");
    if (!name?.trim()) return;
    const j = await post({ action: "suggest", name, kind });
    if (j) setMsg(j.existing ? "That type is already in the Service Catalog." : "Thanks — Panameer reviews it before it's listed.");
  };
  const serviceCats = categories.filter((c) => c.kind === "SERVICE");
  const productCats = categories.filter((c) => c.kind === "SERVICE_PRODUCT");
  const ready = Object.values(svc).filter((s) => s.rateCents != null).length;
  const countFor = (id: string) => products.filter((p) => p.serviceTypeId === id);

  return (
    <div data-build-catalog>
      <p className="mt-3 inline-flex flex-wrap items-center gap-2 border border-line px-3 py-1.5 text-[13.5px]">
        Business Type: <b>{businessTypes.map((b) => b.name).join(" · ")}</b>
        <Link href="/company#business-types" className="font-semibold text-magenta-dark underline underline-offset-4">Change</Link>
      </p>

      <h2 className="mt-7 text-[20px] font-bold">Your Services</h2>
      <p className="text-[13.5px] text-ink-2">Stock service types for {businessTypes.map((b) => b.name).join(" and ")}. Set at least one consulting rate.</p>
      {serviceCats.map((c) => (
        <section key={c.id} className="mt-4">
          <p className="text-[11px] font-extrabold tracking-[0.12em] text-ink-3">{c.name.toUpperCase()}</p>
          <ul className="mt-1">
            {c.types.map((t) => {
              const s = svc[t.id];
              const unit = ((s?.unit as Unit) ?? t.units[0]) as Unit;
              const rate = Number(rates[t.id]);
              return (
                <li key={t.id} data-catalog-type={t.name} className="grid grid-cols-[32px_1fr] items-center gap-3 border-t border-line py-3 sm:grid-cols-[32px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <input type="checkbox" aria-label={`Offer ${t.name}`} checked={!!s} onChange={(e) => save(t, e.target.checked)} className="h-5 w-5 accent-ink" />
                  <span className="min-w-0">
                    <b className="text-[14.5px]">{t.name}</b>
                    {t.required && <span className="ml-2 border border-magenta px-1.5 text-[10px] font-extrabold tracking-[0.08em] text-magenta-dark">REQUIRED</span>}
                    {t.description && <span className="block text-[12.5px] text-ink-2">{t.description}</span>}
                  </span>
                  <span className="col-start-2 flex items-center gap-1.5 sm:col-start-auto">
                    <span className="text-ink-2">$</span>
                    <input inputMode="decimal" aria-label={`${t.name} rate`} value={rates[t.id] ?? ""} onChange={(e) => setRates((r) => ({ ...r, [t.id]: e.target.value }))} onBlur={() => rates[t.id] && save(t, true)} className="h-9 w-24 border border-line px-2 text-[14px]" placeholder="Rate" />
                    <select aria-label={`${t.name} unit`} value={unit} onChange={(e) => s && save(t, true, e.target.value as Unit)} className="h-9 border border-line px-1.5 text-[13px]">
                      {t.units.map((u) => <option key={u} value={u}>{LABEL(u)}</option>)}
                    </select>
                  </span>
                  <span className="col-start-2 text-[12.5px] text-ink-2 sm:col-start-auto" data-buyers-see>
                    {s && rate > 0 ? `${t.name} · ${formatCents(Math.round(rate * 100))}/${SHORT[unit]}` : "—"}
                    {s?.published && <span className="ml-1 text-ink">· live</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <button type="button" onClick={() => suggest("SERVICE")} className="mt-3 text-[13px] font-semibold text-magenta-dark underline underline-offset-4">Offer something else? Suggest a Service Type</button>

      {productCats.length > 0 && (
        <>
          <h2 className="mt-9 text-[20px] font-bold">Your Service Products</h2>
          <p className="text-[13.5px] text-ink-2">Fixed-price offers buyers can buy now. Optional — add them any time.</p>
          {productCats.map((c) => (
            <section key={c.id} className="mt-4">
              <p className="text-[11px] font-extrabold tracking-[0.12em] text-ink-3">{c.name.toUpperCase()}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {c.types.map((t) => {
                  const mine = countFor(t.id);
                  return (
                    <div key={t.id} data-product-type={t.name} className="grid grid-cols-[48px_1fr_auto] items-center gap-3 border border-line p-3">
                      <span className="grid h-12 w-12 place-items-center bg-ink text-[14px] font-extrabold text-white/85">{code(t.name)}</span>
                      <span className="min-w-0">
                        <b className="block text-[14px]">{t.name}</b>
                        <span className="block truncate text-[12px] text-ink-2">{mine.length ? `${mine.length} added · ${mine[0].title}` : "None yet"}</span>
                      </span>
                      <Link href={`/catalog/products/new?type=${t.id}`} className="text-[13px] font-semibold underline underline-offset-4">{mine.length ? "+ Add Another" : "+ Add"}</Link>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          <button type="button" onClick={() => suggest("SERVICE_PRODUCT")} className="mt-3 text-[13px] font-semibold text-magenta-dark underline underline-offset-4">Don&apos;t see yours? Suggest a Service Product Type</button>
        </>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-4">
        <span className="text-[13.5px] text-ink-2">
          {ready} service{ready === 1 ? "" : "s"} and {products.length} service product{products.length === 1 ? "" : "s"} ready · they go live on your profile and in Shop when you publish.
          {!gate.ok && <> <Link href={gate.href} className="font-semibold text-magenta-dark underline">{gate.reason}</Link></>}
        </span>
        <span className="flex gap-2">
          <Link href="/profile" className="inline-flex min-h-11 items-center border border-ink px-5 text-[14px] font-semibold hover:bg-surface-hover">Preview My Profile</Link>
          <button type="button" disabled={busy || !gate.ok || !ready} onClick={publish} data-publish-catalog className="inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40">{busy ? "Publishing…" : "Publish My Catalog"}</button>
        </span>
      </div>
      {msg && <p role="status" className="mt-2 text-right text-[13.5px] font-semibold">{msg}</p>}
    </div>
  );
}
