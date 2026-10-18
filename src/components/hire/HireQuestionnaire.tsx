"use client";

import Link from "next/link";
import { useState } from "react";
import type { HireInput, HireMatch } from "@/lib/hire-questionnaire";

// SH2-E004: Hire — the need first (Upwork-style), then named matches; checked ones get proposal requests on the Job.
const STEPS = ["The work", "Skills", "Scope", "Budget", "Details"];
const CHIP_ON = "border border-ink bg-ink px-3 py-1.5 text-[13px] font-semibold text-surface";
const CHIP_OFF = "border border-line bg-white px-3 py-1.5 text-[13px] font-semibold text-ink hover:border-ink";
const OPT_ON = "flex flex-col items-start border-2 border-ink bg-white p-3 text-left";
const OPT_OFF = "flex flex-col items-start border border-line bg-white p-3 text-left hover:border-ink";
const FIELD = "mt-1 block w-full border border-line bg-white px-3 py-2.5 text-[14.5px] font-normal text-ink";
const BTN = "inline-flex min-h-10 items-center justify-center bg-ink px-5 text-[14px] font-bold text-surface hover:bg-ink-hover disabled:opacity-40";
const GHOST = "inline-flex min-h-10 items-center justify-center border border-ink bg-white px-5 text-[14px] font-bold text-ink hover:bg-surface-hover disabled:opacity-40";

type Props = { categories: string[]; howLong: { value: string; label: string }[]; sizes: { value: string; line: string }[]; shipTos: { id: string; label: string }[] };

export function HireQuestionnaire({ categories, howLong, sizes, shipTos }: Props) {
  const [step, setStep] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [f, setF] = useState<HireInput>({ category: "", title: "", skills: [], size: "Medium", howLong: "ONE_TO_3_MONTHS", where: "OFFSITE", shipToId: shipTos[0]?.id ?? null, budgetType: "HOURLY", budgetMin: null, budgetMax: null, details: "" });
  const [suggested, setSuggested] = useState<string[]>([]);
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<HireMatch[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sent, setSent] = useState<number | null>(null);
  const set = (patch: Partial<HireInput>) => setF((x) => ({ ...x, ...patch }));

  const call = async (body: object) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/hire", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as Record<string, unknown>;
    setBusy(false);
    if (!r?.ok) { setError((j.error as string) ?? "That didn't work."); return null; }
    return j;
  };

  const next = async () => {
    if (step === 0) {
      if (!f.category || f.title.trim().length < 3) { setError("Pick a Category and give it a short title."); return; }
      const j = await call({ action: "suggest", category: f.category, title: f.title });
      if (!j) return;
      const skills = (j.skills as string[]) ?? [];
      setSuggested(skills);
      if (!f.skills.length) set({ skills: skills.slice(0, 4) });
    }
    if (step < 4) {
      const j = await call({ action: "save", jobId, input: f });
      if (!j) return;
      setJobId(j.jobId as string);
      setStep(step + 1);
      return;
    }
    const j = await call({ action: "matches", jobId, input: f });
    if (!j) return;
    setJobId(j.jobId as string);
    const m = (j.matches as HireMatch[]) ?? [];
    setMatches(m);
    setPicked(new Set(m.slice(0, 2).map((x) => x.personId)));
    setStep(5);
  };

  const request = async () => {
    const j = await call({ action: "request", jobId, personIds: [...picked] });
    if (j) setSent(((j.created as unknown[]) ?? []).length + ((j.alreadyInvited as unknown[]) ?? []).length);
  };

  const toggleSkill = (k: string) => set({ skills: f.skills.includes(k) ? f.skills.filter((x) => x !== k) : [...f.skills, k] });

  return (
    <div className="mt-4 grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]" data-hire>
      <ol className="flex gap-3 overflow-x-auto text-[13.5px] md:block md:space-y-2" data-hire-rail>
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? "whitespace-nowrap font-bold text-magenta-dark" : i < step ? "whitespace-nowrap font-semibold text-ink" : "whitespace-nowrap text-ink-3"}>
            <span aria-hidden className={i < step ? "mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-ink text-[11px] text-white" : i === step ? "mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-magenta text-[11px] text-white" : "mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-[#C9CDDC] text-[11px] text-white"}>{i < step ? "✓" : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      <section className="min-w-0 rounded-[10px] border border-line bg-white p-5">
        {step === 0 && (
          <>
            <h2 className="text-[19px] font-extrabold">What do you need done?</h2>
            <p className="text-[13.5px] text-ink-2">Pick the closest category and give it a short title.</p>
            <p className="mb-1.5 mt-4 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-3">Category</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => <button key={c} type="button" aria-pressed={f.category === c} onClick={() => set({ category: c, skills: [] })} className={f.category === c ? CHIP_ON : CHIP_OFF}>{c}</button>)}
            </div>
            <label className="mt-4 block text-[13px] font-bold">
              Title <span className="font-normal text-ink-3">e.g. “Google Ads + local SEO for an HVAC company”</span>
              <input value={f.title} onChange={(e) => set({ title: e.target.value })} maxLength={140} className={FIELD} />
            </label>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="text-[19px] font-extrabold">What skills should they have?</h2>
            <p className="text-[13.5px] text-ink-2">We suggested these from your title. Add or remove any.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[...new Set([...suggested, ...f.skills])].map((k) => <button key={k} type="button" aria-pressed={f.skills.includes(k)} onClick={() => toggleSkill(k)} className={f.skills.includes(k) ? CHIP_ON : CHIP_OFF}>{k}</button>)}
            </div>
            <div className="mt-3 flex gap-2">
              <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Add a skill" aria-label="Add a skill" className="min-w-0 flex-1 border border-line px-3 py-2 text-[14px]" />
              <button type="button" className={GHOST} onClick={() => { const k = extra.trim(); if (k && !f.skills.includes(k)) set({ skills: [...f.skills, k] }); setExtra(""); }}>Add</button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-[19px] font-extrabold">How big is it?</h2>
            <p className="text-[13.5px] text-ink-2">This helps us match the right size of supplier.</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {sizes.map((o) => <button key={o.value} type="button" aria-pressed={f.size === o.value} onClick={() => set({ size: o.value })} className={f.size === o.value ? OPT_ON : OPT_OFF}><b className="text-[14px]">{o.value}</b><small className="text-[12px] text-ink-2">{o.line}</small></button>)}
            </div>
            <label className="mt-4 block text-[13px] font-bold">How long
              <select value={f.howLong} onChange={(e) => set({ howLong: e.target.value })} className={FIELD}>{howLong.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}</select>
            </label>
            <label className="mt-3 block text-[13px] font-bold">Where
              <select value={f.where === "ONSITE" ? `ONSITE:${f.shipToId ?? ""}` : f.where} onChange={(e) => { const v = e.target.value; if (v.startsWith("ONSITE:")) set({ where: "ONSITE", shipToId: v.slice(7) || null }); else set({ where: v as HireInput["where"] }); }} className={FIELD}>
                <option value="OFFSITE">Offsite</option>
                {shipTos.length ? shipTos.map((s) => <option key={s.id} value={`ONSITE:${s.id}`}>Onsite — {s.label}</option>) : <option value="ONSITE:">Onsite</option>}
                <option value="EITHER">Either</option>
              </select>
            </label>
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="text-[19px] font-extrabold">What&apos;s your budget?</h2>
            <p className="text-[13.5px] text-ink-2">You can change it later. Suppliers propose their own rate.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {([["HOURLY", "Hourly rate", "Pay for time worked"], ["FIXED", "Fixed price", "One price for the job"]] as const).map(([v, t, l]) => <button key={v} type="button" aria-pressed={f.budgetType === v} onClick={() => set({ budgetType: v })} className={f.budgetType === v ? OPT_ON : OPT_OFF}><b className="text-[14px]">{t}</b><small className="text-[12px] text-ink-2">{l}</small></button>)}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-[13px] font-bold">From ($)<input inputMode="numeric" value={f.budgetMin ?? ""} onChange={(e) => set({ budgetMin: e.target.value ? Number(e.target.value.replace(/[^0-9.]/g, "")) : null })} className={FIELD} /></label>
              <label className="text-[13px] font-bold">To ($)<input inputMode="numeric" value={f.budgetMax ?? ""} onChange={(e) => set({ budgetMax: e.target.value ? Number(e.target.value.replace(/[^0-9.]/g, "")) : null })} className={FIELD} /></label>
            </div>
            <p className="mt-1 text-[12.5px] text-ink-3">{f.budgetType === "HOURLY" ? "Per hour." : "For the whole job."}</p>
          </>
        )}
        {step === 4 && (
          <>
            <h2 className="text-[19px] font-extrabold">Anything else they should know?</h2>
            <p className="text-[13.5px] text-ink-2">Describe it in your own words.</p>
            <label className="mt-4 block text-[13px] font-bold">Details
              <textarea value={f.details} onChange={(e) => set({ details: e.target.value })} rows={6} maxLength={4000} className={FIELD} />
            </label>
          </>
        )}
        {step === 5 && matches && (
          <div data-hire-matches>
            <h2 className="text-[19px] font-extrabold">Your matches</h2>
            <p className="text-[13.5px] text-ink-2">Ranked by skill fit, then rate inside your budget. Pick who should send a proposal.</p>
            {matches.length === 0 ? (
              <p className="mt-4 text-[14px] text-ink-3">No one in {f.category} matches yet. Your job is saved as a draft — <Link href={`/work-requests/${jobId}`} className="font-semibold text-magenta-dark underline">open it</Link> to post it so suppliers can find it.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {matches.map((m) => (
                  <li key={m.personId} className="flex items-start gap-3 py-3" data-hire-match={m.name}>
                    <input type="checkbox" checked={picked.has(m.personId)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(m.personId)) n.delete(m.personId); else n.add(m.personId); return n; })} aria-label={`Select ${m.name}`} className="mt-1 h-4 w-4 accent-[var(--color-ink,#272334)]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold">{m.company ? `${m.company} · ` : ""}{m.name}</p>
                      <p className="text-[13px] text-ink-2">{m.line}</p>
                      <p className="mt-1 flex flex-wrap gap-1.5 text-[11.5px]">
                        {m.matched.map((k) => <span key={k} className="border border-line bg-bg-soft px-1.5">{k}</span>)}
                        <span className="border border-ink px-1.5 font-semibold">{m.fit}% fit</span>
                        {m.inBudget && <span className="border border-line px-1.5">In budget</span>}
                      </p>
                    </div>
                    <div className="text-right text-[13px]">
                      {m.rate && <b className="block">{m.rate}</b>}
                      <Link href={`/providers/${m.profileId}`} className="font-semibold text-magenta-dark underline underline-offset-4">View profile</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {matches.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" className={BTN} disabled={busy || !picked.size || sent != null} onClick={request} data-request-proposals>{sent != null ? "Requests sent" : "Request proposals"}</button>
                <span className="text-[13px] text-ink-2">{picked.size} selected</span>
                {sent != null && <Link href={`/work-requests/${jobId}`} className="text-[13.5px] font-semibold text-magenta-dark underline underline-offset-4">View the job →</Link>}
              </div>
            )}
          </div>
        )}

        {error && <p role="alert" className="mt-3 text-[13.5px] font-semibold text-magenta-dark">{error}</p>}
        {step < 5 && (
          <div className="mt-5 flex justify-between gap-3 border-t border-line pt-4">
            <button type="button" className={GHOST} disabled={step === 0 || busy} onClick={() => setStep(step - 1)}>Back</button>
            <button type="button" className={BTN} disabled={busy} onClick={next}>{busy ? "Saving…" : step === 4 ? "Show my matches" : `Next: ${STEPS[step + 1]}`}</button>
          </div>
        )}
        {step === 5 && <button type="button" className="mt-4 text-[13px] font-semibold text-ink-2 underline" onClick={() => { setStep(4); setSent(null); }}>Change my answers</button>}
      </section>
    </div>
  );
}
