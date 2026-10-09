"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BILLING_CYCLE_LABEL, PAYMENT_TERMS_LABEL } from "@/lib/billing-terms";
import { CoverBand } from "@/components/casing/CoverBand";
import { AREA, BTN, BTN_K, INPUT, LABEL, PaidStrip, Steps, money } from "@/components/catalog/WizardParts";

type Kind = "SERVICE" | "FIXED" | "NOT_TO_EXCEED";
export type EstLine = { kind: Kind; description: string; providerServiceId: string | null; serviceProductId?: string | null; uom: string; quantity: string; rate: string; amount: string };
export type EstimateDraft = {
  id: string | null;
  customerPersonId: string;
  customerEmail: string;
  toEmail: boolean;
  workRequestId: string;
  validUntil: string;
  title: string;
  scope: string;
  assumptions: string;
  exclusions: string;
  message: string;
  paymentTerms: string;
  billingCycle: string;
  lines: EstLine[];
};
type Opt = { id: string; label: string };
type Svc = { id: string; name: string; uom: string; rateCents: number };
type Source = { id: string; label: string; title: string; scope: string; lines: EstLine[] };

const amountOf = (l: EstLine) => (l.kind === "SERVICE" ? Math.round(Number(l.quantity || 0) * Number(l.rate || 0) * 100) : Math.round(Number(l.amount || 0) * 100));
const KIND_LABEL: Record<Kind, string> = { SERVICE: "Service", FIXED: "Fixed", NOT_TO_EXCEED: "Not-to-exceed" };

// CAT-E006: Create a Cost Estimate — Customer · Scope · Price · Payment · Send, with what the customer sees beside it.
export function EstimateWizard({ initial, customers, workRequests, services, sources, providerName }: { initial: EstimateDraft; customers: Opt[]; workRequests: Opt[]; services: Svc[]; sources: Source[]; providerName: string }) {
  const router = useRouter();
  const [d, setD] = useState(initial);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof EstimateDraft>(k: K, v: EstimateDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setLine = (i: number, patch: Partial<EstLine>) => set("lines", d.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = d.lines.reduce((n, l) => n + amountOf(l), 0);
  const cap = d.lines.filter((l) => l.kind === "NOT_TO_EXCEED").reduce((n, l) => n + amountOf(l), 0);
  const customerLabel = d.toEmail ? d.customerEmail || "a customer" : customers.find((c) => c.id === d.customerPersonId)?.label ?? "a customer";
  const hours = d.lines.filter((l) => l.kind === "SERVICE").reduce((n, l) => n + Number(l.quantity || 0), 0);

  const startFrom = (id: string) => {
    const s = sources.find((x) => x.id === id);
    if (s) setD((x) => ({ ...x, title: x.title || s.title, scope: x.scope || s.scope, lines: s.lines }));
  };

  const save = async (send: boolean) => {
    setBusy(true);
    setError(null);
    const estimate = {
      customerPersonId: d.toEmail ? null : d.customerPersonId || null,
      customerEmail: d.toEmail ? d.customerEmail : null,
      workRequestId: d.workRequestId || null,
      title: d.title,
      validUntil: d.validUntil || null,
      scope: d.scope, assumptions: d.assumptions, exclusions: d.exclusions, message: d.message,
      paymentTerms: d.paymentTerms, billingCycle: d.billingCycle,
      lines: d.lines.map((l) => ({ kind: l.kind, description: l.description, providerServiceId: l.providerServiceId, serviceProductId: l.serviceProductId ?? null, uom: l.uom, quantity: l.kind === "SERVICE" ? Number(l.quantity || 0) : null, rateCents: l.kind === "SERVICE" ? Math.round(Number(l.rate || 0) * 100) : null, amountCents: l.kind === "SERVICE" ? null : Math.round(Number(l.amount || 0) * 100) })),
    };
    const r = await fetch("/api/estimates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", id: d.id, estimate, send }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string; id?: string };
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "Could not save the estimate");
    router.push(`/estimates/${j.id}`);
  };

  const paid = ["Customer accepts", "You accept the work order", `Services: timesheet ${BILLING_CYCLE_LABEL[d.billingCycle as keyof typeof BILLING_CYCLE_LABEL].toLowerCase()}`, `Paid ${PAYMENT_TERMS_LABEL[d.paymentTerms as keyof typeof PAYMENT_TERMS_LABEL].toLowerCase()}`];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]" data-estimate-wizard>
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold">{d.id ? "Revise Cost Estimate" : "Create a Cost Estimate"}</h1>
        <p className="mt-1 text-[14px] text-ink-2">Like a service product, but for one customer — their scope, their price.</p>
        <PaidStrip steps={paid} />
        <Steps labels={["Customer", "Scope", "Price", "Payment", "Send"]} at={step} onPick={setStep} />
        <div className="mt-5 grid gap-4">
          {step === 0 && (
            <>
              <fieldset>
                <legend className={LABEL}>Customer</legend>
                <label className="mt-1.5 flex items-center gap-2 text-[14px]"><input type="radio" checked={!d.toEmail} onChange={() => set("toEmail", false)} /> Pick from your connections</label>
                {!d.toEmail && (
                  <select value={d.customerPersonId} onChange={(e) => set("customerPersonId", e.target.value)} className={INPUT} aria-label="Customer">
                    <option value="">Choose…</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                )}
                <label className="mt-2 flex items-center gap-2 text-[14px]"><input type="radio" checked={d.toEmail} onChange={() => set("toEmail", true)} /> Someone not on Panameer — enter email</label>
                {d.toEmail && <input type="email" value={d.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} placeholder="jane@acme.com" className={INPUT} aria-label="Customer email" />}
                <p className="mt-1 text-[12px] text-ink-3">Only this customer can see it. It doesn&apos;t appear on your profile.</p>
              </fieldset>
              <label className={LABEL}>For a work request? (optional)
                <select value={d.workRequestId} onChange={(e) => set("workRequestId", e.target.value)} className={INPUT}>
                  <option value="">No — a direct estimate</option>
                  {workRequests.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
                </select>
              </label>
              {!d.id && sources.length > 0 && (
                <label className={LABEL}>Start from
                  <select defaultValue="" onChange={(e) => startFrom(e.target.value)} className={INPUT}>
                    <option value="">Blank</option>
                    {sources.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </label>
              )}
              <label className={LABEL}>Valid until<input type="date" value={d.validUntil} onChange={(e) => set("validUntil", e.target.value)} className={INPUT} /><span className="mt-1 block text-[12px] font-normal text-ink-3">30 days by default.</span></label>
            </>
          )}
          {step === 1 && (
            <>
              <label className={LABEL}>Title<input value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="Supplier Portal Rollout — Phase 1" className={INPUT} /></label>
              <label className={LABEL}>Scope<textarea value={d.scope} onChange={(e) => set("scope", e.target.value)} rows={4} className={AREA} /></label>
              <label className={LABEL}>Assumptions<textarea value={d.assumptions} onChange={(e) => set("assumptions", e.target.value)} rows={2} className={AREA} /></label>
              <label className={LABEL}>Not included<textarea value={d.exclusions} onChange={(e) => set("exclusions", e.target.value)} rows={2} className={AREA} /></label>
            </>
          )}
          {step === 2 && (
            <>
              <div className="grid gap-3">
                {d.lines.map((l, i) => (
                  <div key={i} className="border border-line p-3" data-estimate-line={l.kind}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">{KIND_LABEL[l.kind]}</span>
                      <button type="button" aria-label="Remove line" onClick={() => set("lines", d.lines.filter((_, j) => j !== i))} className="text-ink-3">×</button>
                    </div>
                    <input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} aria-label="Line" className={INPUT} />
                    {l.kind === "SERVICE" ? (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <label className={LABEL}>Qty ({l.uom.toLowerCase()}s)<input inputMode="decimal" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} className={INPUT} /></label>
                        <label className={LABEL}>Rate ($)<input inputMode="decimal" value={l.rate} onChange={(e) => setLine(i, { rate: e.target.value })} className={INPUT} /></label>
                        <span className="self-end pb-3 text-right text-[14px] font-semibold">{money(amountOf(l))}</span>
                      </div>
                    ) : (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label className={LABEL}>{l.kind === "FIXED" ? "Price ($)" : "Cap ($)"}<input inputMode="decimal" value={l.amount} onChange={(e) => setLine(i, { amount: e.target.value })} className={INPUT} /></label>
                        <span className="self-end pb-3 text-right text-[14px] font-semibold">{money(amountOf(l))}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {services.length > 0 && (
                  <select value="" onChange={(e) => { const s = services.find((x) => x.id === e.target.value); if (s) set("lines", [...d.lines, { kind: "SERVICE", description: s.name, providerServiceId: s.id, uom: s.uom, quantity: "", rate: (s.rateCents / 100).toFixed(2), amount: "" }]); }} className="h-11 border border-ink px-3 text-[13.5px] font-semibold" aria-label="Add from My Services">
                    <option value="">+ Add From My Services</option>
                    {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
                <button type="button" onClick={() => set("lines", [...d.lines, { kind: "FIXED", description: "", providerServiceId: null, uom: "EACH", quantity: "1", rate: "", amount: "" }])} className={BTN}>+ Add Fixed Line</button>
                <button type="button" onClick={() => set("lines", [...d.lines, { kind: "NOT_TO_EXCEED", description: "Travel & expenses", providerServiceId: null, uom: "EACH", quantity: "", rate: "", amount: "" }])} className={BTN}>+ Add Not-to-Exceed</button>
              </div>
              <p className="flex justify-between border-t border-line pt-2 text-[16px] font-bold"><span>Estimate total</span><span>{money(total)}</span></p>
              <p className="text-[12.5px] text-ink-2">Each line keeps its own billing: service lines bill by timesheet each cycle; fixed lines are paid on acceptance; not-to-exceed lines are drawn down by payment request up to the cap.</p>
            </>
          )}
          {step === 3 && (
            <div className="grid grid-cols-2 gap-3">
              <label className={LABEL}>Payment terms<select value={d.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} className={INPUT}>{(["NET15", "NET30", "NET60"] as const).map((k) => <option key={k} value={k}>{PAYMENT_TERMS_LABEL[k]}</option>)}</select></label>
              <label className={LABEL}>Billing cycle (services)<select value={d.billingCycle} onChange={(e) => set("billingCycle", e.target.value)} className={INPUT}>{(["WEEKLY", "MONTHLY"] as const).map((k) => <option key={k} value={k}>{BILLING_CYCLE_LABEL[k]}</option>)}</select></label>
            </div>
          )}
          {step === 4 && (
            <>
              <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-y-2 text-[14px]">
                <dt className="font-semibold text-ink-3">To</dt><dd className="min-w-0 truncate">{customerLabel}</dd>
                <dt className="font-semibold text-ink-3">Total</dt><dd>{money(total)}{cap ? ` (incl. ${money(cap)} cap)` : ""}</dd>
                <dt className="font-semibold text-ink-3">Valid until</dt><dd>{d.validUntil}</dd>
              </dl>
              <label className={LABEL}>Message to customer<textarea value={d.message} onChange={(e) => set("message", e.target.value)} rows={3} className={AREA} /></label>
              <p className="text-[12.5px] text-ink-2">The customer can Accept (it becomes a work order you both accept), Ask for Changes, or Decline.</p>
            </>
          )}
        </div>
        {error && <p role="alert" className="mt-3 text-[13px] font-semibold text-magenta-dark">{error}</p>}
        <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4">
          {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className={BTN}>‹ Back</button>}
          {step < 4 ? (
            <button type="button" onClick={() => setStep(step + 1)} className={BTN_K}>Next ›</button>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={() => save(false)} className={BTN}>Save Draft</button>
              <button type="button" disabled={busy || !d.lines.length || !d.title.trim()} onClick={() => save(true)} data-send-estimate className={BTN_K}>Send Estimate</button>
            </>
          )}
        </div>
      </div>
      <aside className="min-w-0" data-customer-preview>
        <p className="text-[11px] font-bold tracking-[0.1em] text-ink-2">WHAT THE CUSTOMER SEES</p>
        <div className="mt-2 border border-line bg-white">
          <CoverBand code="EST" tone={["#272334", "#6b2f6a"]} className="h-[96px]">Estimate · for {customerLabel}</CoverBand>
          <div className="p-4">
            <b className="block text-[16px] leading-snug">{d.title || "Your estimate"}</b>
            <span className="block text-[12.5px] text-ink-3">{providerName}</span>
            {d.scope && <p className="mt-2 line-clamp-3 text-[13px] text-ink-2">{d.scope}</p>}
            <p className="mt-3 text-[22px] font-bold">{money(total).replace(/\.00$/, "")} <span className="text-[13px] font-normal text-ink-2">estimate</span></p>
            <p className="text-[12.5px] text-ink-2">{[hours ? `${hours} units of service` : null, d.lines.filter((l) => l.kind === "FIXED").length ? `${d.lines.filter((l) => l.kind === "FIXED").length} fixed` : null, cap ? `up to ${money(cap)} drawn down` : null].filter(Boolean).join(" · ")}</p>
            <div className="mt-3 flex gap-2 text-[12.5px] font-semibold"><span className="bg-ink px-3 py-1.5 text-surface">Accept</span><span className="border border-ink px-3 py-1.5">Ask for Changes</span><span className="border border-ink px-3 py-1.5">Decline</span></div>
          </div>
        </div>
      </aside>
    </div>
  );
}
