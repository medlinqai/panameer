"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_TERMS_LABEL, PAYMENT_TRIGGER_LABEL } from "@/lib/billing-terms";
import { CoverBand } from "@/components/casing/CoverBand";
import { AREA, BTN, BTN_K, INPUT, LABEL, PaidStrip, PublishBar, Steps, money } from "@/components/catalog/WizardParts";

type Kind = "DELIVERABLE" | "DEPLOYABLE" | "BLANKET";
type Milestone = { label: string; trigger: string; percent: string };
export type ProductDraft = {
  id: string | null;
  kind: Kind;
  title: string;
  summary: string;
  included: string;
  weeks: string;
  coverCode: string;
  process: string;
  domainIds: string[];
  price: string;
  billingPeriod: "MONTHLY" | "ANNUAL";
  paymentTerms: string;
  paymentTrigger: string;
  schedule: boolean;
  milestones: Milestone[];
};
type Domain = { id: string; process: string; name: string };

const KINDS: { k: Kind; label: string; line: string }[] = [
  { k: "DELIVERABLE", label: "Deliverable", line: "A defined scope delivered once — a dashboard, a configuration, an assessment." },
  { k: "DEPLOYABLE", label: "AI Agent", line: "Something you deploy that keeps running — billed monthly or yearly." },
  { k: "BLANKET", label: "Blanket", line: "A not-to-exceed amount drawn down as work happens — e.g. $6,000 of consulting and travel." },
];
const PRICING: Record<Kind, string> = { DELIVERABLE: "Fixed price — one price for the whole product.", DEPLOYABLE: "Recurring — per month or per year.", BLANKET: "Not-to-exceed — a cap, paid only for what's drawn." };
const TERMS = ["IMMEDIATE", "NET15", "NET30", "NET60"] as const;
const TRIGGERS = ["DOWNLOAD", "INSTALLATION", "ACCEPTANCE", "PAYMENT_REQUEST"] as const;
const M_TRIGGERS = ["ORDER_ACCEPTED", ...TRIGGERS] as const;
const kindLabel = (k: Kind) => KINDS.find((x) => x.k === k)!.label;
const lower = (k: string) => (PAYMENT_TRIGGER_LABEL[k as keyof typeof PAYMENT_TRIGGER_LABEL] ?? k).toLowerCase();

// CAT-E003: Create a Service Product — What · Price · Payment · Review, with the buyer's view beside it.
export function ProductWizard({ initial, domains, gate, providerName }: { initial: ProductDraft; domains: Domain[]; gate: { ok: boolean; href: string; reason: string | null }; providerName: string }) {
  const router = useRouter();
  const [d, setD] = useState(initial);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const priceCents = Math.round(Number(d.price || 0) * 100);
  const agent = d.kind === "DEPLOYABLE";
  const useSchedule = d.schedule && !agent;
  const total = d.milestones.reduce((n, m) => n + (Number(m.percent) || 0), 0);
  const processes = [...new Set(domains.map((x) => x.process))].sort();
  const code = (d.coverCode || d.title.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 3) || "PRD").toUpperCase();

  const save = async (publish: boolean) => {
    if (useSchedule && total !== 100) return setError(`The payment schedule must add up to 100% — it's ${total}% now.`);
    setBusy(true);
    setError(null);
    const pkg = {
      title: d.title,
      summary: d.summary,
      kind: d.kind,
      pricingType: agent ? "RECURRING" : d.kind === "BLANKET" ? "NOT_TO_EXCEED" : "FIXED",
      billingPeriod: agent ? d.billingPeriod : null,
      priceCents: priceCents || null,
      durationWeeks: agent || !d.weeks ? null : Number(d.weeks),
      coverCode: d.coverCode || null,
      capabilityDomainIds: d.domainIds,
      deliverables: agent ? [] : d.included.split("\n").map((x) => x.replace(/^[•\-*]\s*/, "").trim()).filter(Boolean),
      paymentTerms: d.paymentTerms,
      paymentTrigger: d.paymentTrigger,
      milestones: agent ? [] : useSchedule ? d.milestones.map((m) => ({ label: m.label, percent: Number(m.percent), trigger: m.trigger })) : [{ label: "In full", percent: 100, trigger: d.paymentTrigger }],
    };
    const r = await fetch("/api/provider/packages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "wizard", serviceProductId: d.id, package: pkg, publish }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "Could not save the product");
    router.push("/profile#my-service-products");
    router.refresh();
  };

  const paid = agent
    ? ["Order accepted", `Billed ${d.billingPeriod === "ANNUAL" ? "yearly" : "monthly"}`, `Paid ${PAYMENT_TERMS_LABEL[d.paymentTerms as keyof typeof PAYMENT_TERMS_LABEL].toLowerCase()}`]
    : d.kind === "BLANKET"
      ? ["Order accepted", "Submit a payment request as work is done", "Customer approves", `Paid ${PAYMENT_TERMS_LABEL[d.paymentTerms as keyof typeof PAYMENT_TERMS_LABEL].toLowerCase()}`]
      : useSchedule
        ? [...d.milestones.map((m) => `${m.percent || 0}% on ${lower(m.trigger)}`), `Each paid ${PAYMENT_TERMS_LABEL[d.paymentTerms as keyof typeof PAYMENT_TERMS_LABEL].toLowerCase()}`]
        : ["Order accepted", `Report ${lower(d.paymentTrigger)}`, "Customer approves", `Paid ${PAYMENT_TERMS_LABEL[d.paymentTerms as keyof typeof PAYMENT_TERMS_LABEL].toLowerCase()}`];

  const setM = (i: number, k: keyof Milestone, v: string) => set("milestones", d.milestones.map((m, j) => (j === i ? { ...m, [k]: v } : m)));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]" data-product-wizard>
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold">{d.id ? "Edit Service Product" : "Create a Service Product"}</h1>
        <p className="mt-1 text-[14px] text-ink-2">A packaged offer with one price, sold to any buyer.</p>
        <PaidStrip steps={paid} />
        <Steps labels={["What", "Price", "Payment", "Review"]} at={step} onPick={setStep} />
        <div className="mt-5 grid gap-4">
          {step === 0 && (
            <>
              <fieldset className="grid gap-2 sm:grid-cols-3">
                <legend className={LABEL}>Kind</legend>
                {KINDS.map((k) => (
                  <button key={k.k} type="button" aria-pressed={d.kind === k.k} onClick={() => set("kind", k.k)} className={"border p-3 text-left " + (d.kind === k.k ? "border-ink bg-ink text-surface" : "border-line hover:border-ink")}>
                    <b className="block text-[14px]">{k.label}</b>
                    <span className={"mt-0.5 block text-[12px] " + (d.kind === k.k ? "text-surface/80" : "text-ink-2")}>{k.line}</span>
                  </button>
                ))}
              </fieldset>
              <label className={LABEL}>Title<input value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="Procurement Spend Dashboard (OTBI)" className={INPUT} /></label>
              <label className={LABEL}>Summary<textarea value={d.summary} onChange={(e) => set("summary", e.target.value)} rows={3} className={AREA} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={LABEL}>Business process
                  <select value={d.process} onChange={(e) => setD((x) => ({ ...x, process: e.target.value, domainIds: [] }))} className={INPUT}>
                    <option value="">Choose…</option>
                    {processes.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <div>
                  <p className={LABEL}>Capability domains</p>
                  <div className="mt-1 flex max-h-[120px] flex-wrap gap-1.5 overflow-y-auto">
                    {domains.filter((x) => x.process === d.process).map((x) => (
                      <button key={x.id} type="button" aria-pressed={d.domainIds.includes(x.id)} onClick={() => set("domainIds", d.domainIds.includes(x.id) ? d.domainIds.filter((y) => y !== x.id) : [...d.domainIds, x.id])} className={"border px-2 py-1 text-[12px] font-semibold " + (d.domainIds.includes(x.id) ? "border-ink bg-ink text-surface" : "border-line")}>{x.name}</button>
                    ))}
                  </div>
                </div>
              </div>
              {!agent && <label className={LABEL}>What&apos;s included (one per line)<textarea value={d.included} onChange={(e) => set("included", e.target.value)} rows={3} className={AREA} /></label>}
              <div className="grid grid-cols-2 gap-3">
                {!agent && <label className={LABEL}>Delivery time (weeks)<input inputMode="numeric" value={d.weeks} onChange={(e) => set("weeks", e.target.value)} className={INPUT} /></label>}
                <label className={LABEL}>Cover code<input maxLength={4} value={d.coverCode} onChange={(e) => set("coverCode", e.target.value.toUpperCase())} placeholder="DSH" className={INPUT} /><span className="mt-1 block text-[12px] font-normal text-ink-3">Shown faded on the colored cover.</span></label>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <p className="text-[14px]"><b>Pricing:</b> {PRICING[d.kind]}</p>
              <div className="grid grid-cols-2 gap-3">
                <label className={LABEL}>{d.kind === "BLANKET" ? "Not to exceed ($)" : "Price ($)"}<input inputMode="decimal" value={d.price} onChange={(e) => set("price", e.target.value)} className={INPUT} /></label>
                {agent && <label className={LABEL}>Per<select value={d.billingPeriod} onChange={(e) => set("billingPeriod", e.target.value as "MONTHLY" | "ANNUAL")} className={INPUT}><option value="MONTHLY">Month</option><option value="ANNUAL">Year</option></select></label>}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className={LABEL}>Payment terms<select value={d.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} className={INPUT}>{TERMS.map((k) => <option key={k} value={k}>{PAYMENT_TERMS_LABEL[k]}</option>)}</select></label>
                <label className={LABEL}>Payment trigger<select value={d.paymentTrigger} onChange={(e) => set("paymentTrigger", e.target.value)} className={INPUT}>{TRIGGERS.map((k) => <option key={k} value={k}>{PAYMENT_TRIGGER_LABEL[k]}</option>)}</select></label>
              </div>
              {!agent && d.kind !== "BLANKET" && (
                <fieldset>
                  <legend className={LABEL}>How it&apos;s paid</legend>
                  <label className="mt-1.5 flex items-center gap-2 text-[14px]"><input type="radio" checked={!d.schedule} onChange={() => set("schedule", false)} /> In full — paid once, when the trigger happens.</label>
                  <label className="mt-1 flex items-center gap-2 text-[14px]"><input type="radio" checked={d.schedule} onChange={() => set("schedule", true)} /> Payment schedule — paid in parts that add up to 100%.</label>
                </fieldset>
              )}
              {useSchedule && d.kind !== "BLANKET" && (
                <div data-schedule>
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_64px_84px_24px] gap-2 text-[11.5px] font-bold text-ink-3"><span>Milestone</span><span>Trigger</span><span>%</span><span className="text-right">Amount</span><span /></div>
                  {d.milestones.map((m, i) => (
                    <div key={i} className="mt-1.5 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_64px_84px_24px] items-center gap-2">
                      <input value={m.label} onChange={(e) => setM(i, "label", e.target.value)} aria-label="Milestone" className={INPUT + " mt-0"} />
                      <select value={m.trigger} onChange={(e) => setM(i, "trigger", e.target.value)} aria-label="Trigger" className={INPUT + " mt-0"}>{M_TRIGGERS.map((k) => <option key={k} value={k}>{PAYMENT_TRIGGER_LABEL[k]}</option>)}</select>
                      <input inputMode="numeric" value={m.percent} onChange={(e) => setM(i, "percent", e.target.value)} aria-label="Percent" className={INPUT + " mt-0"} />
                      <span className="text-right text-[13px]">{money(Math.round((priceCents * (Number(m.percent) || 0)) / 100))}</span>
                      <button type="button" aria-label="Remove milestone" onClick={() => set("milestones", d.milestones.filter((_, j) => j !== i))} className="text-ink-3">×</button>
                    </div>
                  ))}
                  <div className="mt-2 flex items-center justify-between text-[13px]">
                    <button type="button" onClick={() => set("milestones", [...d.milestones, { label: "", trigger: "ACCEPTANCE", percent: "" }])} className="font-bold text-magenta-dark underline underline-offset-4">+ Add Milestone</button>
                    <span className={total === 100 ? "font-bold" : "font-bold text-magenta-dark"}>Total {total}% · {money(Math.round((priceCents * total) / 100))}</span>
                  </div>
                </div>
              )}
            </>
          )}
          {step === 3 && (
            <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-y-2 text-[14px]">
              <dt className="font-semibold text-ink-3">Kind</dt><dd>{kindLabel(d.kind)}{!agent && d.weeks ? ` · ${d.weeks} weeks` : ""}</dd>
              <dt className="font-semibold text-ink-3">Price</dt><dd>{money(priceCents)} {agent ? `per ${d.billingPeriod === "ANNUAL" ? "year" : "month"}` : d.kind === "BLANKET" ? "not to exceed" : "fixed"}</dd>
              <dt className="font-semibold text-ink-3">Payment</dt><dd>{useSchedule ? d.milestones.map((m) => `${m.percent}% on ${lower(m.trigger)}`).join(" · ") : agent ? "Each period" : `In full on ${lower(d.paymentTrigger)}`} · {PAYMENT_TERMS_LABEL[d.paymentTerms as keyof typeof PAYMENT_TERMS_LABEL]}</dd>
            </dl>
          )}
        </div>
        {error && <p role="alert" className="mt-3 text-[13px] font-semibold text-magenta-dark">{error}</p>}
        {step < 3 ? (
          <div className="mt-5 flex gap-3 border-t border-line pt-4">
            {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className={BTN}>‹ Back</button>}
            <button type="button" onClick={() => setStep(step + 1)} className={BTN_K}>Next ›</button>
          </div>
        ) : (
          <PublishBar canPublish={gate.ok && priceCents > 0 && !!d.title.trim()} gateHref={gate.href} gateReason={gate.reason} busy={busy} onSave={save} />
        )}
      </div>
      <aside className="min-w-0" data-buyer-preview>
        <p className="text-[11px] font-bold tracking-[0.1em] text-ink-2">WHAT BUYERS SEE</p>
        <div className="mt-2 border border-line bg-white">
          <CoverBand code={code} tone={d.kind === "DEPLOYABLE" ? ["#1a2a30", "#2f5a6b"] : d.kind === "BLANKET" ? ["#2b2219", "#6a4a2f"] : ["#272334", "#4b3e6e"]} className="h-[96px]">{kindLabel(d.kind)}</CoverBand>
          <div className="p-4">
            <b className="block text-[16px] leading-snug">{d.title || "Your product"}</b>
            <span className="block text-[12.5px] text-ink-3">{providerName}</span>
            {d.summary && <p className="mt-2 line-clamp-3 text-[13px] text-ink-2">{d.summary}</p>}
            <p className="mt-3 text-[22px] font-bold">{priceCents ? money(priceCents).replace(/\.00$/, "") : "$—"} <span className="text-[13px] font-normal text-ink-2">{agent ? `/ ${d.billingPeriod === "ANNUAL" ? "year" : "month"}` : d.kind === "BLANKET" ? "not to exceed" : "fixed"}</span></p>
            <p className="text-[12.5px] text-ink-2">{[!agent && d.weeks ? `Delivered in ${d.weeks} weeks` : null, useSchedule ? d.milestones.map((m) => `${m.percent}% on ${lower(m.trigger)}`).join(", ") : null].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
