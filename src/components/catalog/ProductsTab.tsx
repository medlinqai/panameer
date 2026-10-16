"use client";

import { useRouter } from "next/navigation";
import { COVER_STYLES, COVER_STYLE_LABEL, DefaultCover } from "@/components/catalog/DefaultCover";
import { useRef, useState } from "react";
import { formatCents } from "@/lib/display";
import type { PayPlan, Pricing, ProductForm } from "@/lib/catalog-products";

// MC-E006: My Catalog › Service Products — list + the Create card (mockup D). Saves as Draft; Publish checks the six must-haves.
type PType = { id: string; name: string; pricing_model: string | null; units: string[]; delivery: string | null; lead_time_days: number | null; serviceCategory: { name: string } | null };
type Product = { id: string; status: string; typeName: string | null; form: ProductForm };
type Domain = { id: string; process: string; name: string };
const EMPTY: ProductForm = { title: "", serviceTypeId: null, summary: "", images: [], pricing: "FIXED", priceCents: null, delivery: null, leadTimeDays: null, durationWeeks: null, domainIds: [], skillIds: [], deliverables: [], payPlan: "ON_DELIVERY", coverStyle: "A", openToOffers: false, offerFloorCents: null };
const PRICING: [Pricing, string, string][] = [["FIXED", "Fixed", "Each"], ["MONTHLY", "Monthly", "Month"], ["HOURLY", "Hourly", "Hour"]];
const PER: Record<Pricing, string> = { FIXED: "", MONTHLY: "/month", HOURLY: "/hr" };
const DELIVERY: Record<string, string> = { OFFSITE: "Offsite", ONSITE: "Onsite", EITHER: "Either" };
const PLANS: [PayPlan, string][] = [["ON_DELIVERY", "On delivery"], ["SPLIT", "50% start · 50% delivery"], ["MONTHLY_ADVANCE", "Monthly in advance"]];
const SHORT: Record<string, string> = { "Procure-to-Pay": "P2P", "Order-to-Cash": "O2C", "Record-to-Report": "R2R", "Hire-to-Retire": "H2R", "Plan-to-Produce": "Plan to Produce" };
const pricingFor = (m: string | null): Pricing => (m === "RECURRING" ? "MONTHLY" : m === "TIME" ? "HOURLY" : "FIXED");
const LBL = "flex flex-col gap-1.5 text-[12px] font-bold text-ink-2";
const INPUT = "w-full border border-line bg-surface px-2.5 py-2 text-[13px] font-normal text-ink";
const SEC = "border-b border-[#ECEEF4] p-4";
const N = "mb-2.5 text-[11px] font-extrabold tracking-[0.14em] text-magenta";

export function ProductsTab({ types, products, domains, skills, sellGaps, editId, typeId = null, onSaved }: { types: PType[]; products: Product[]; domains: Domain[]; skills: { id: string; name: string }[]; sellGaps: unknown[]; editId: string | null; typeId?: string | null; /** Embedded (Create What You Sell): reload in place instead of navigating to My Catalog. */ onSaved?: (editId: string | null) => void }) {
  const router = useRouter();
  const start = products.find((p) => p.id === editId);
  const [id, setId] = useState<string | null>(start?.id ?? null);
  const preset = !start && typeId ? types.find((t) => t.id === typeId) : undefined;
  const [f, setF] = useState<ProductForm>(start?.form ?? (preset ? { ...EMPTY, serviceTypeId: preset.id, pricing: pricingFor(preset.pricing_model), delivery: (preset.delivery as ProductForm["delivery"]) ?? null, leadTimeDays: preset.lead_time_days } : EMPTY));
  const [price, setPrice] = useState(start?.form.priceCents != null ? String(start.form.priceCents / 100) : "");
  const [open, setOpen] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(!!start || !!preset);
  const [allTypes, setAllTypes] = useState(types);
  const [newType, setNewType] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const type = allTypes.find((t) => t.id === f.serviceTypeId) ?? null;
  const processes = [...new Set(domains.map((d) => d.process))];

  const edit = (p: Product | null) => {
    setId(p?.id ?? null);
    setF(p?.form ?? EMPTY);
    setPrice(p?.form.priceCents != null ? String(p.form.priceCents / 100) : "");
    setMsg(null);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
  };
  const pickType = (tid: string) => {
    if (tid === "__new__") { setNewType(""); return; }
    const t = allTypes.find((x) => x.id === tid);
    setF((x) => ({ ...x, serviceTypeId: tid || null, ...(t && !id ? { pricing: pricingFor(t.pricing_model), delivery: (t.delivery as ProductForm["delivery"]) ?? x.delivery, leadTimeDays: t.lead_time_days ?? x.leadTimeDays } : {}) }));
  };
  const addType = async () => {
    const name = (newType ?? "").trim();
    if (name.length < 3) return;
    setBusy("type");
    const r = await fetch("/api/catalog/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "addType", name }) });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) return setMsg(j.error ?? "Could not add that type");
    const t = { id: j.type.id as string, name: j.type.name as string, pricing_model: "FIXED", units: ["EACH"], delivery: "OFFSITE", lead_time_days: null, serviceCategory: { name: "Your Types" } } as unknown as PType;
    setAllTypes((xs) => (xs.some((x) => x.id === t.id) ? xs : [...xs, t]));
    setNewType(null);
    setF((x) => ({ ...x, serviceTypeId: t.id }));
  };
  const upload = async (files: FileList | null) => {
    for (const file of Array.from(files ?? []).slice(0, 5 - f.images.length)) {
      setBusy("upload");
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/catalog/products/image", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      setBusy(null);
      if (!r.ok) return setMsg(j.error ?? "Could not upload that picture");
      setF((x) => ({ ...x, images: [...x.images, j.url].slice(0, 5) }));
    }
  };
  const move = (from: number, to: number) => setF((x) => { const a = [...x.images]; const [m] = a.splice(from, 1); a.splice(to, 0, m); return { ...x, images: a }; });
  const post = async (body: object, label: string) => {
    setBusy(label);
    setMsg(null);
    const r = await fetch("/api/catalog/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) { setMsg(j.error ?? "Could not save that"); return null; }
    return j as { id: string };
  };
  const save = async (publish: boolean) => {
    const n = Number(price);
    const j = await post({ action: "save", id, publish, form: { ...f, priceCents: price.trim() && n >= 0 ? Math.round(n * 100) : null } }, publish ? "publish" : "save");
    if (!j) return;
    setMsg(publish ? "Published — it's live in Shop and on your profile." : "Saved as a draft.");
    if (onSaved) return onSaved(publish ? null : j.id);
    router.replace(publish ? "/catalog/products" : `/catalog/products?edit=${j.id}#create`, { scroll: false });
    router.refresh();
  };
  const publishRow = async (pid: string) => { if (await post({ action: "publish", id: pid }, pid)) { if (onSaved) onSaved(null); else router.refresh(); } };
  const toggle = (k: "domainIds" | "skillIds", v: string) => set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]);

  return (
    <div data-products-tab>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-ink-2">Fixed-price and monthly offers buyers can buy in Shop.</p>
        <button type="button" data-add-product onClick={() => edit(null)} className="inline-flex min-h-10 shrink-0 items-center bg-ink px-4 text-[13.5px] font-semibold text-surface hover:bg-ink-hover">Add a Service Product</button>
      </div>
      {products.length === 0 && !showForm && <p className="mt-6 border border-dashed border-line p-4 text-center text-[13.5px] text-ink-3">No Service Products yet. Click Add a Service Product to create your first one.</p>}
      {products.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {products.map((p) => (
            <div key={p.id} data-product={p.form.title} className="flex gap-3 border border-line p-3">
              {p.form.images[0]
                ? <img src={p.form.images[0]} alt="" className="h-[72px] w-[72px] flex-none object-cover" />
                : <DefaultCover typeName={p.typeName} style={p.form.coverStyle} size={72} />}
              <span className="min-w-0 flex-1">
                <b className="text-[14px]">{p.form.title}</b>
                <span className={p.status === "PUBLISHED" ? "ml-1.5 inline-block border border-ink px-1.5 py-px align-middle text-[10px] font-bold tracking-[0.08em]" : "ml-1.5 inline-block border border-dashed border-line px-1.5 py-px align-middle text-[10px] font-bold tracking-[0.08em] text-ink-2"}>{p.status === "PUBLISHED" ? "LIVE" : "DRAFT"}</span>
                <small className="mt-1 block text-[12px] text-ink-3">{[p.typeName, `${p.form.priceCents != null ? formatCents(p.form.priceCents) : "$—"}${PER[p.form.pricing]}`, p.form.delivery && DELIVERY[p.form.delivery], p.form.leadTimeDays != null && `${p.form.leadTimeDays}-day lead`].filter(Boolean).join(" · ")}</small>
                <span className="mt-1.5 block text-[12px]">
                  <button type="button" onClick={() => edit(p)} className="font-bold text-magenta-dark underline">Edit</button>
                  {p.status !== "PUBLISHED" && <> · <button type="button" disabled={!!busy} onClick={() => publishRow(p.id)} data-publish-row className="font-bold text-magenta-dark underline">Publish</button></>}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {showForm && <div ref={formRef} id="create" className="mt-5 scroll-mt-24 border-2 border-ink" data-product-form>
        <div className="flex flex-wrap items-center justify-between gap-2 bg-ink px-4 py-3 text-white">
          <b className="text-[15px]">{id ? `Edit ${f.title || "Service Product"}` : "Create a Service Product"}</b>
          <span className="text-[12px] text-[#B9BDD0]">Saves as Draft · nothing goes live until you publish</span>
        </div>

        <section className={SEC}>
          <p className={N}>1 · WHAT IT IS</p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className={LBL}>Name<input value={f.title} onChange={(e) => set("title", e.target.value)} className={INPUT} aria-label="Name" /></label>
            <label className={LBL}>Type
              <select value={f.serviceTypeId ?? ""} onChange={(e) => pickType(e.target.value)} className={INPUT} aria-label="Type">
                <option value="">Choose a type</option>
                {allTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                <option value="__new__">+ Add a Type…</option>
              </select>
              {newType !== null && (
                <span data-add-type className="mt-1 flex gap-2">
                  <input autoFocus value={newType} onChange={(e) => setNewType(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addType(); } if (e.key === "Escape") setNewType(null); }} placeholder="New type, e.g. Data Migration Toolkit" maxLength={60} className={INPUT} aria-label="New type name" />
                  <button type="button" disabled={(newType ?? "").trim().length < 3 || busy === "type"} onClick={addType} className="shrink-0 bg-ink px-3 text-[13px] font-semibold text-surface disabled:opacity-40">Add</button>
                </span>
              )}
            </label>
          </div>
          <label className={`${LBL} mt-3`}>Description<textarea value={f.summary} onChange={(e) => set("summary", e.target.value)} className={`${INPUT} min-h-16`} aria-label="Description" /></label>
        </section>

        <section className={SEC}>
          <p className={N}>2 · PICTURES <span className="font-semibold tracking-normal text-ink-3">up to 5 · first is the cover · drag to reorder</span></p>
          <div className="flex flex-wrap gap-2.5">
            {f.images.map((url, i) => (
              <div key={url} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null && drag !== i) move(drag, i); setDrag(null); }}
                className={i === 0 ? "relative h-[88px] w-[88px] cursor-move border border-line outline outline-2 outline-ink" : "relative h-[88px] w-[88px] cursor-move border border-line"} data-picture={i}>
                <img src={url} alt="" className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute inset-x-0 bottom-0 bg-ink py-0.5 text-center text-[9px] font-extrabold tracking-[0.1em] text-white">COVER</span>}
                <button type="button" aria-label="Remove picture" onClick={() => set("images", f.images.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 h-5 w-5 bg-white/90 text-[12px] leading-none">×</button>
                {i > 0 && <button type="button" aria-label="Make cover" onClick={() => move(i, 0)} className="absolute left-0.5 top-0.5 bg-white/90 px-1 text-[9px] font-bold">COVER</button>}
              </div>
            ))}
            {f.images.length < 5 && (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy === "upload"} className="grid h-[88px] w-[88px] place-items-center border border-dashed border-ink-3 bg-surface text-center text-[12px] font-bold text-ink-2">
                {busy === "upload" ? "Uploading…" : <>+ Add<br />Picture</>}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          </div>
          {/* No picture yet? Pick a Panameer cover — it shows in Shop until you add a picture (Scott 2026-10-12). */}
          <div className={f.images.length ? "mt-3 opacity-60" : "mt-3"} data-cover-styles>
            <p className="mb-1.5 text-[12px] font-bold text-ink-2">{f.images.length ? "Panameer cover (used if you remove your pictures)" : "No picture yet? Pick a Panameer cover"}</p>
            <div className="flex flex-wrap gap-2.5">
              {COVER_STYLES.map((cs) => (
                <button key={cs} type="button" data-cover-style={cs} aria-pressed={f.coverStyle === cs} onClick={() => set("coverStyle", cs)} className={f.coverStyle === cs ? "flex flex-col items-center gap-1 outline outline-2 outline-offset-2 outline-ink" : "flex flex-col items-center gap-1 opacity-80 hover:opacity-100"}>
                  <DefaultCover typeName={type?.name} style={cs} size={72} />
                  <span className="text-[11px] font-semibold text-ink-2">{COVER_STYLE_LABEL[cs]}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={SEC}>
          <p className={N}>3 · PRICE {type && !id && <span className="font-semibold tracking-normal text-magenta-dark">· pre-filled from {type.name} defaults</span>}</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <span className={LBL}>Pricing
              <span className="inline-flex border border-ink">
                {PRICING.map(([k, l]) => <button key={k} type="button" onClick={() => set("pricing", k)} className={f.pricing === k ? "bg-ink px-3 py-2 text-[13px] font-semibold text-white" : "px-3 py-2 text-[13px] font-semibold text-ink"}>{l}</button>)}
              </span>
            </span>
            <label className={LBL}>Price
              <span className="inline-flex items-center border border-line bg-surface"><span className="px-2 text-ink-3">$</span><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border-0 px-1 py-2 text-[13px] font-normal outline-none" aria-label="Price" /></span>
            </label>
            <label className={LBL}>Unit<input readOnly value={PRICING.find(([k]) => k === f.pricing)![2]} className={`${INPUT} bg-[#FAFAFC]`} aria-label="Unit" /></label>
          </div>
          {/* MO-E001: Open to Offers, with an optional private floor. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2" data-open-to-offers>
            <button type="button" role="switch" aria-checked={!!f.openToOffers} aria-label="Open to Offers" onClick={() => set("openToOffers", !f.openToOffers)} className={f.openToOffers ? "relative h-[22px] w-[38px] rounded-full bg-ink" : "relative h-[22px] w-[38px] rounded-full bg-[#C9CDDC]"}>
              <span className={f.openToOffers ? "absolute left-[18px] top-[2px] h-[18px] w-[18px] rounded-full bg-white" : "absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full bg-white"} />
            </button>
            <span className="text-[13px] font-bold">Open to Offers <span className="font-normal text-ink-3">· buyers can Make an Offer</span></span>
            {f.openToOffers && (
              <label className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
                Decline offers below
                <span className="inline-flex items-center border border-line bg-surface"><span className="px-1.5 text-ink-3">$</span><input inputMode="decimal" aria-label="Offer floor" value={f.offerFloorCents != null ? String(f.offerFloorCents / 100) : ""} onChange={(e) => set("offerFloorCents", e.target.value.trim() && Number(e.target.value) > 0 ? Math.round(Number(e.target.value) * 100) : null)} className="w-20 border-0 py-1.5 text-[13px] outline-none" /></span>
                automatically <span className="text-ink-3">(only you see this)</span>
              </label>
            )}
          </div>
        </section>

        <section className={SEC}>
          <p className={N}>4 · DELIVERY</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <label className={LBL}>Delivery
              <select value={f.delivery ?? ""} onChange={(e) => set("delivery", (e.target.value || null) as ProductForm["delivery"])} className={INPUT} aria-label="Delivery">
                <option value="">—</option>{Object.entries(DELIVERY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label className={LBL}>Lead Time <em className="font-medium not-italic text-ink-3">days before you can start</em><input inputMode="numeric" value={f.leadTimeDays ?? ""} onChange={(e) => set("leadTimeDays", e.target.value ? Number(e.target.value) || 0 : null)} className={INPUT} aria-label="Lead time" /></label>
            <label className={LBL}>Duration <em className="font-medium not-italic text-ink-3">weeks to deliver</em><input inputMode="numeric" value={f.durationWeeks ?? ""} onChange={(e) => set("durationWeeks", e.target.value ? Number(e.target.value) || 0 : null)} className={INPUT} aria-label="Duration" /></label>
          </div>
        </section>

        <section className={SEC}>
          <p className={N}>5 · WHERE IT FITS <span className="font-semibold tracking-normal text-ink-3">· lets buyers and the Optimization assessment find it</span></p>
          <p className="mb-1.5 text-[12px] font-bold text-ink-2">Process Area</p>
          <div className="flex flex-wrap gap-1.5">
            {processes.map((pr) => {
              const n = domains.filter((d) => d.process === pr && f.domainIds.includes(d.id)).length;
              return <button key={pr} type="button" data-process={pr} onClick={() => setOpen(open === pr ? null : pr)} className={n ? "border border-ink bg-ink px-2.5 py-1 text-[12.5px] text-white" : open === pr ? "border border-ink px-2.5 py-1 text-[12.5px]" : "border border-line px-2.5 py-1 text-[12.5px]"}>{`${SHORT[pr] ?? pr}${n ? ` · ${n}` : ""}`}</button>;
            })}
          </div>
          {open && (
            <div className="mt-2 flex flex-wrap gap-1.5 border-l-2 border-magenta pl-3">
              {domains.filter((d) => d.process === open).map((d) => <button key={d.id} type="button" data-domain={d.name} onClick={() => toggle("domainIds", d.id)} className={f.domainIds.includes(d.id) ? "border border-ink bg-ink px-2.5 py-1 text-[12px] text-white" : "border border-line px-2.5 py-1 text-[12px]"}>{d.name}</button>)}
            </div>
          )}
          <p className="mb-1.5 mt-3 text-[12px] font-bold text-ink-2">Skills from your profile</p>
          <div className="flex flex-wrap gap-1.5">
            {skills.length ? skills.map((s) => <button key={s.id} type="button" onClick={() => toggle("skillIds", s.id)} className={f.skillIds.includes(s.id) ? "border border-ink bg-ink px-2.5 py-1 text-[12.5px] text-white" : "border border-line px-2.5 py-1 text-[12.5px]"}>{s.name}</button>) : <span className="text-[12.5px] text-ink-3">Add skills in My Profile › Skills.</span>}
          </div>
        </section>

        <section className={SEC}>
          <p className={N}>6 · DETAILS <span className="font-semibold tracking-normal text-ink-3">· optional</span></p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className={LBL}>Deliverables <em className="font-medium not-italic text-ink-3">one per line</em><textarea value={f.deliverables.join("\n")} onChange={(e) => set("deliverables", e.target.value.split("\n"))} className={`${INPUT} min-h-16`} aria-label="Deliverables" /></label>
            <label className={LBL}>Payment Terms
              <select value={f.pricing === "MONTHLY" ? "MONTHLY_ADVANCE" : f.payPlan} disabled={f.pricing === "MONTHLY"} onChange={(e) => set("payPlan", e.target.value as PayPlan)} className={INPUT} aria-label="Payment terms">
                {PLANS.filter(([k]) => (f.pricing === "MONTHLY") === (k === "MONTHLY_ADVANCE")).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-3 border border-dashed border-line bg-[#FAFAFC] p-3 text-[13px] text-ink-3" data-r2-value-factors>
            <b className="text-ink-2">R2 · VALUE FACTORS</b><br />Coming after launch: how much this product saves (e.g. % of invoice processing time) so the Optimization assessment can recommend and price it automatically. Process Area above is captured now so nothing has to be re-entered.
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#FAFAFC] px-4 py-3.5">
          <span className="text-[12.5px] text-ink-2">Publish needs: name, type, description, a cover, price, delivery.</span>
          <span className="flex gap-2">
            <button type="button" disabled={!!busy} onClick={() => save(false)} className="inline-flex min-h-10 items-center border border-ink px-4 text-[13.5px] font-bold disabled:opacity-40">{busy === "save" ? "Saving…" : "Save Draft"}</button>
            <button type="button" disabled={!!busy} onClick={() => save(true)} data-publish-product className="inline-flex min-h-10 items-center bg-ink px-4 text-[13.5px] font-bold text-surface disabled:opacity-40">{busy === "publish" ? "Publishing…" : "Publish"}</button>
          </span>
        </div>
        {msg && <p role="status" className="px-4 pb-3 text-right text-[13px] font-semibold">{msg}</p>}
      </div>}
    </div>
  );
}
