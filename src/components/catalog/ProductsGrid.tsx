"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/shop/ProductCard";
import { DefaultCover } from "@/components/catalog/DefaultCover";

// CG-E003: Your Service Products — one row per product, grouped by type, saved as you go.
// Wide (>1150px): one line. ≤1150px: two-line card. Phone (≤700px): name / price · per · lead / short line / More expands the rest.
type PayEvent = "ACCEPTANCE" | "DOWNLOAD" | "INSTALLATION" | "PAYMENT_REQUEST";
type Row = {
  key: string; id: string | null; serviceTypeId: string; offered: boolean; name: string; short: string; pricing: "FIXED" | "RECURRING";
  paymentEvent: PayEvent; offers: boolean; leadDays: string; price: string; imageUrl: string | null; pdfUrl: string | null;
};
type Grid = { sellerName: string; types: { id: string; name: string; own: boolean }[]; rows: (Omit<Row, "key" | "leadDays" | "price"> & { leadDays: number | null; priceCents: number | null })[] };
const NAME_MAX = 40;
const SHORT_MAX = 50;
const EVENTS: { v: PayEvent; label: string }[] = [{ v: "ACCEPTANCE", label: "Acceptance" }, { v: "DOWNLOAD", label: "Download" }, { v: "INSTALLATION", label: "Installation" }, { v: "PAYMENT_REQUEST", label: "Payment Request" }];
const defaultEvent = (pricing: Row["pricing"]): PayEvent => (pricing === "RECURRING" ? "INSTALLATION" : "ACCEPTANCE");
let seq = 0;
const blank = (serviceTypeId: string): Row => ({ key: `n${++seq}`, id: null, serviceTypeId, offered: false, name: "", short: "", pricing: "FIXED", paymentEvent: "ACCEPTANCE", offers: false, leadDays: "", price: "", imageUrl: null, pdfUrl: null });
const toCents = (v: string) => (v.trim() && Number(v) > 0 ? Math.round(Number(v) * 100) : null);

const LABEL = "block text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3 min-[1151px]:hidden";
const FIELD = "w-full border border-line bg-surface px-2 py-1.5 text-[13.5px]";
const WIDE_COLS = "min-[1151px]:grid min-[1151px]:grid-cols-[minmax(0,1.6fr)_96px_104px_72px_minmax(0,1.6fr)_64px_72px_128px_88px_52px] min-[1151px]:items-center min-[1151px]:gap-2";

export function ProductsGrid() {
  const [g, setG] = useState<Grid | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/catalog/create?grid=products").then((r) => (r.ok ? r.json() : null)).then((d: Grid | null) => {
      if (!d) return setMsg("Couldn't load your products.");
      setG(d);
      const have: Row[] = d.rows.map((r) => ({ ...r, key: r.id ?? `n${++seq}`, leadDays: r.leadDays != null ? String(r.leadDays) : "", price: r.priceCents != null ? String(r.priceCents / 100) : "" }));
      // Each type group starts with one row (an existing product of that type, else empty).
      // Scott 10-17: no pre-made empty product under each type — the type stays, "+ Add" makes a line.
      setRows(have);
    }).catch(() => setMsg("Couldn't load your products."));
  }, []);

  if (!g) return <p className="text-[14px] text-ink-2">{msg ?? "Loading your product types…"}</p>;
  const typeName = (id: string) => g.types.find((t) => t.id === id)?.name ?? "Service Product";
  const first = rows.find((r) => r.offered && r.name.trim());

  return (
    <div data-products-grid>
      <div className={`hidden border-b border-line pb-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3 ${WIDE_COLS}`}>
        <span>Offer · Name</span><span>Price</span><span>Per</span><span>Lead time</span><span>Short description</span><span>Image</span><span>Offers</span><span>Payment Event</span><span>Details PDF</span><span />
      </div>
      {g.types.map((t) => (
        <section key={t.id} data-type-group={t.name} className="mt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-1">
            <h3 className="text-[15px] font-bold">{t.name}{t.own && <span className="ml-2 text-[11px] font-semibold text-ink-3">Your type</span>}</h3>
            <button type="button" onClick={() => setRows((v) => [...v, { ...blank(t.id), offered: true }])} className="text-[13px] font-semibold text-magenta-dark underline underline-offset-4">{rows.some((r) => r.serviceTypeId === t.id) ? `+ Add another ${t.name}` : `+ Add a ${t.name}`}</button>
          </div>
          {rows.filter((r) => r.serviceTypeId === t.id).map((r) => (
            <ProductLine key={r.key} row={r} typeName={t.name} onChange={(next) => setRows((v) => v.map((x) => (x.key === r.key ? next : x)))} />
          ))}
        </section>
      ))}
      <p className="mt-4"><Link href="/catalog/products/new" className="text-[14px] font-bold text-magenta-dark underline underline-offset-4">Create a custom product type →</Link></p>
      {first && (
        <div className="mt-5 max-w-md" data-card-preview>
          <p className="mb-1 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-3">How buyers see it in Shop</p>
          <ProductCard
            own
            signedIn
            p={{
              id: first.id ?? "preview", title: first.name, kind: first.pricing === "RECURRING" ? "DEPLOYABLE" : "DELIVERABLE", pricingType: first.pricing, billingPeriod: first.pricing === "RECURRING" ? "MONTHLY" : null,
              priceCents: toCents(first.price), currency: "USD", durationWeeks: null, providerName: g.sellerName, providerFirst: g.sellerName.split(" ")[0] ?? "", providerLast: g.sellerName.split(" ").slice(1).join(" "),
              providerPhotoUrl: null, providerPersonId: "", providerProfileId: "", coverCode: null, coverUrl: first.imageUrl, coverStyle: first.imageUrl ? null : "D", typeName: typeName(first.serviceTypeId),
              terms: [first.short, first.leadDays ? `${first.leadDays} days` : null].filter(Boolean).join(" · "), orders: 0, fresh: true,
            }}
          />
        </div>
      )}
    </div>
  );
}

function ProductLine({ row, typeName, onChange }: { row: Row; typeName: string; onChange: (r: Row) => void }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(row);

  const save = async (r: Row) => {
    setState("saving");
    setErr(null);
    const res = await fetch("/api/catalog/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stop: "product", id: r.id, serviceTypeId: r.serviceTypeId, offered: r.offered, name: r.name, short: r.short, pricing: r.pricing, paymentEvent: r.paymentEvent, offers: r.offers, leadDays: r.leadDays ? Number(r.leadDays) : null, priceCents: toCents(r.price), imageUrl: r.imageUrl, pdfUrl: r.pdfUrl }),
    }).catch(() => null);
    const j = await res?.json().catch(() => ({}));
    if (!res?.ok) { setState("error"); setErr(j?.error ?? "Didn't save"); return; }
    setState(j.id ? "saved" : "idle");
    if (j.id && j.id !== latest.current.id) onChange({ ...latest.current, id: j.id });
  };
  const set = (patch: Partial<Row>) => {
    const next = { ...row, ...patch };
    latest.current = next;
    onChange(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(latest.current), 600);
  };
  const upload = async (file: File | undefined, kind: "image" | "details") => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/catalog/products/${kind}`, { method: "POST", body: fd }).catch(() => null);
    const j = await res?.json().catch(() => ({}));
    if (!res?.ok) { setState("error"); setErr(j?.error ?? "Upload failed"); return; }
    set(kind === "image" ? { imageUrl: j.url } : { pdfUrl: j.url });
  };
  const off = !row.offered;

  const short = (
    <label className="block min-w-0">
      <span className={LABEL}>Short description <span className="font-normal normal-case">{row.short.length}/{SHORT_MAX}</span></span>
      <input value={row.short} maxLength={SHORT_MAX} onChange={(e) => set({ short: e.target.value })} placeholder="The line on the Shop card" aria-label={`${typeName} short description`} className={FIELD} />
      <span className="hidden text-[10.5px] text-ink-3 min-[1151px]:block">{row.short.length}/{SHORT_MAX}</span>
    </label>
  );

  return (
    <div data-product-row data-offered={row.offered ? "1" : "0"} className={(off ? "opacity-60 " : "") + `grid gap-2 border-b border-line py-3 ${WIDE_COLS}`}>
      {/* Line 1 — slider · Name · Price · Per · Lead time · More */}
      <div className="grid grid-cols-[minmax(0,1.6fr)_96px_104px_72px_52px] items-end gap-2 max-[700px]:grid-cols-3 min-[1151px]:contents">
        <div className="flex items-end gap-2 max-[700px]:col-span-3 min-[1151px]:order-1">
          <button type="button" role="switch" aria-checked={row.offered} aria-label={`Offer ${row.name || typeName}`} onClick={() => set({ offered: !row.offered })} className={row.offered ? "relative mb-1 h-[22px] w-[38px] shrink-0 rounded-full bg-ink" : "relative mb-1 h-[22px] w-[38px] shrink-0 rounded-full bg-[#C9CDDC]"}>
            <span className={row.offered ? "absolute left-[18px] top-[2px] h-[18px] w-[18px] rounded-full bg-white" : "absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full bg-white"} />
          </button>
          <label className="block min-w-0 flex-1">
            <span className={LABEL}>Name</span>
            <input value={row.name} maxLength={NAME_MAX} onChange={(e) => set({ name: e.target.value })} placeholder={typeName} aria-label={`${typeName} name`} className={FIELD} />
          </label>
        </div>
        <label className="block min-[1151px]:order-2">
          <span className={LABEL}>Price</span>
          <span className="flex items-center gap-1"><input inputMode="decimal" value={row.price} onChange={(e) => set({ price: e.target.value })} aria-label={`${typeName} price`} className={FIELD} />{row.pricing === "RECURRING" && <span className="text-[12px] text-ink-2">/mo</span>}</span>
        </label>
        <label className="block min-[1151px]:order-3">
          <span className={LABEL}>Per</span>
          <select value={row.pricing} onChange={(e) => { const pricing = e.target.value as Row["pricing"]; set({ pricing, paymentEvent: row.paymentEvent === defaultEvent(row.pricing) ? defaultEvent(pricing) : row.paymentEvent }); }} aria-label={`${typeName} per`} className={FIELD}>
            <option value="FIXED">One time</option>
            <option value="RECURRING">Monthly</option>
          </select>
        </label>
        <label className="block min-[1151px]:order-4">
          <span className={LABEL}>Lead time</span>
          <input inputMode="numeric" value={row.leadDays} onChange={(e) => set({ leadDays: e.target.value.replace(/\D/g, "") })} placeholder="days" aria-label={`${typeName} lead time in days`} className={FIELD} />
        </label>
        <div className="hidden max-[700px]:col-span-3 max-[700px]:block">{short}</div>
        <div className="flex items-end max-[700px]:col-span-3 min-[1151px]:order-10">
          {row.id ? (
            <>
              <Link href={`/catalog/products?edit=${row.id}`} className="mb-1.5 text-[13px] font-semibold text-magenta-dark underline underline-offset-4 max-[700px]:hidden">More</Link>
              <button type="button" onClick={() => setOpen((v) => !v)} className="hidden text-[13px] font-semibold text-magenta-dark underline underline-offset-4 max-[700px]:inline">{open ? "Less" : "More"}</button>
            </>
          ) : (
            <button type="button" onClick={() => setOpen((v) => !v)} className="hidden text-[13px] font-semibold text-magenta-dark underline underline-offset-4 max-[700px]:inline">{open ? "Less" : "More"}</button>
          )}
        </div>
      </div>
      {/* Line 2 — Image · Short description · Offers · Payment Event · Details PDF (phone: behind More) */}
      <div className={(open ? "" : "max-[700px]:hidden ") + "grid grid-cols-[64px_minmax(0,1.6fr)_72px_128px_88px] items-end gap-2 max-[700px]:grid-cols-2 min-[1151px]:contents"}>
        <div className="min-[1151px]:order-6">
          <span className={LABEL}>Image</span>
          <label className="block h-10 w-10 cursor-pointer overflow-hidden border border-line" title="Upload a picture (optional)">
            {row.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <DefaultCover typeName={typeName} style="D" size={40} />
            )}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void upload(e.target.files?.[0], "image")} aria-label={`${typeName} picture`} />
          </label>
        </div>
        <div className="max-[700px]:hidden min-[1151px]:order-5">{short}</div>
        <label className="block min-[1151px]:order-7">
          <span className={LABEL}>Offers</span>
          <select value={row.offers ? "yes" : "no"} onChange={(e) => set({ offers: e.target.value === "yes" })} aria-label={`${typeName} open to offers`} className={FIELD}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>
        <label className="block min-[1151px]:order-8">
          <span className={LABEL}>Payment Event</span>
          <select value={row.paymentEvent} onChange={(e) => set({ paymentEvent: e.target.value as PayEvent })} aria-label={`${typeName} payment event`} className={FIELD}>
            {EVENTS.map((x) => <option key={x.v} value={x.v}>{x.label}</option>)}
          </select>
        </label>
        <div className="min-[1151px]:order-9">
          <span className={LABEL}>Details PDF</span>
          {row.pdfUrl ? (
            <span className="flex items-center gap-2 text-[12.5px]"><a href={row.pdfUrl} target="_blank" rel="noreferrer" className="font-semibold underline">PDF</a><button type="button" onClick={() => set({ pdfUrl: null })} className="text-ink-3 underline">Remove</button></span>
          ) : (
            <label className="inline-block cursor-pointer border border-line px-2 py-1.5 text-[12.5px] font-semibold">Upload PDF<input type="file" accept="application/pdf" className="sr-only" onChange={(e) => void upload(e.target.files?.[0], "details")} /></label>
          )}
        </div>
        {open && row.id && <Link href={`/catalog/products?edit=${row.id}`} className="col-span-2 hidden text-[13px] font-semibold text-magenta-dark underline underline-offset-4 max-[700px]:block">Open the full page</Link>}
      </div>
      {(state === "saving" || state === "error") && <p role="status" className="text-[12px] text-ink-2 min-[1151px]:order-11 min-[1151px]:col-span-10">{state === "saving" ? "Saving…" : err}</p>}
    </div>
  );
}
