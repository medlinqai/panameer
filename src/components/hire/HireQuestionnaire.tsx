"use client";

import Link from "next/link";
import { useState } from "react";
import type { HireMatch } from "@/lib/hire-questionnaire";
import type { SdContract, ServiceDescription } from "@/lib/service-description";

// SD-E003: Hire follows the Service Description standard. Step 1 can start from an uploaded posting (read like a résumé);
// every step is then prefilled with "from your posting" hints; Next saves the draft Job.
const STEPS = ["The Work", "Where", "Contract", "Who", "When & Rate", "Request Proposals"];
const CHIP_ON = "rounded-full border border-magenta-dark bg-[#fbeafb] px-3.5 py-1.5 text-[13px] font-semibold text-magenta-dark";
const CHIP_OFF = "rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] font-medium text-ink hover:border-magenta-dark";
const OPT_ON = "flex flex-col items-start rounded-[10px] border border-magenta-dark bg-white p-3 text-left ring-1 ring-magenta-dark";
const OPT_OFF = "flex flex-col items-start rounded-[10px] border border-line bg-white p-3 text-left hover:border-magenta-dark";
const FIELD = "mt-1 block w-full rounded-[8px] border border-line bg-white px-3 py-2.5 text-[14.5px] font-normal text-ink";
const LABEL = "mt-4 block text-[13px] font-bold";
const BTN = "inline-flex min-h-10 items-center justify-center bg-ink px-5 text-[14px] font-bold text-surface hover:bg-ink-hover disabled:opacity-40";
const GHOST = "inline-flex min-h-10 items-center justify-center border border-ink bg-white px-5 text-[14px] font-bold text-ink hover:bg-surface-hover disabled:opacity-40";
const CONTRACTS: { value: SdContract; line: string }[] = [
  { value: "C2C", line: "Corp-to-corp, through their company" },
  { value: "W2", line: "On a staffing firm's payroll" },
  { value: "C2H", line: "Contract to hire" },
  { value: "1099", line: "Independent contractor" },
];
const WORKSITES = [["OFFSITE", "Offsite", "Works from their own place"], ["ONSITE", "Onsite", "At your site"], ["HYBRID", "Hybrid", "Some days at your site"]] as const;

type Hierarchy = { name: string; businessTypes: { id: string; name: string; usesSkills: boolean }[] }[];
type Props = {
  hierarchy: Hierarchy;
  howLong: { value: string; label: string }[];
  roles: { id: string; label: string }[];
  initial: ServiceDescription;
  initialJobId: string | null;
  initialStep: number;
};

export function HireQuestionnaire({ hierarchy, howLong, roles, initial, initialJobId, initialStep }: Props) {
  const categories = hierarchy.map((h) => h.name);
  const [step, setStep] = useState(initialStep);
  const [jobId, setJobId] = useState<string | null>(initialJobId);
  const [f, setF] = useState<ServiceDescription>(initial);
  const [start, setStart] = useState<"choose" | "upload" | "form">(initialJobId || initial.title ? "form" : "choose");
  const [paste, setPaste] = useState("");
  const [suggested, setSuggested] = useState<string[]>([]);
  // PC-E002: the parsed Category › Business Type is shown as a playback; Change opens the chips.
  const [changing, setChanging] = useState(false);
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<HireMatch[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sent, setSent] = useState<number | null>(null);
  const set = (patch: Partial<ServiceDescription>) => setF((x) => ({ ...x, ...patch }));
  const from = (k: string) => (f.fromPosting.includes(k) ? <span className="ml-2 rounded-full bg-[#fbeafb] px-2 py-0.5 text-[11px] font-semibold text-magenta-dark" data-from-posting>from your posting</span> : null);

  const call = async (body: object) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/hire", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as Record<string, unknown>;
    setBusy(false);
    if (!r?.ok) { setError((j.error as string) ?? "That didn't work."); return null; }
    return j;
  };

  const read = async (file: File | null) => {
    setBusy(true);
    setError(null);
    const body = new FormData();
    if (file) body.set("file", file);
    else body.set("text", paste);
    const r = await fetch("/api/hire/parse", { method: "POST", body }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { sd?: ServiceDescription; error?: string };
    setBusy(false);
    if (!r?.ok || !j.sd) { setError(j.error ?? "We couldn't read that posting."); return; }
    setF({ ...j.sd, category: j.sd.category || f.category });
    setChanging(j.sd.classConfidence === "low" || !j.sd.businessTypeId);
    setStart("form");
  };

  const next = async () => {
    if (step === 0) {
      if (!f.category || !f.businessTypeId || f.title.trim().length < 3) { setError("Pick a Category and Business Type, and give it a short title."); return; }
      if (!f.skills.length && !f.customSkills.length) {
        const j = await call({ action: "suggest", category: f.category, title: f.title });
        if (j) setSuggested((j.skills as string[]) ?? []);
      }
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

  // PC-E002: a new Business Type re-reads WHO from the posting (pass 2 only); What, Where, Contract, When and Rate stay.
  const pickBusinessType = async (b: { id: string; name: string; usesSkills: boolean }) => {
    set({ businessTypeId: b.id, businessType: b.name, usesSkills: b.usesSkills, classConfidence: null });
    setChanging(false);
    if (!f.sourceText || b.id === f.businessTypeId) return;
    const j = await call({ action: "reparseWho", sourceText: f.sourceText, businessTypeId: b.id });
    const who = j?.who as Partial<ServiceDescription> | undefined;
    if (who) setF((x) => ({ ...x, ...who, fromPosting: [...x.fromPosting.filter((k) => !["roleId", "domains", "product", "skills", "customSkills", "years", "education", "credentials", "specialties", "responsibilities", "required", "niceToHave"].includes(k)), ...(who.fromPosting ?? [])] }));
  };

  const addSkill = async (name: string) => {
    const n = name.trim();
    if (!n) return;
    const j = await call({ action: "resolveSkill", name: n });
    const hit = j?.skill as { id: string; name: string } | null | undefined;
    if (hit && !f.skills.some((s) => s.id === hit.id)) set({ skills: [...f.skills, hit] });
    else if (!hit && !f.customSkills.includes(n)) set({ customSkills: [...f.customSkills, n] });
    setExtra("");
  };
  const listField = (k: "credentials" | "domains", label: string, hint: string) => (
    <label className={LABEL}>{label} <span className="font-normal text-ink-3">{hint}</span>{from(k)}
      <input value={f[k].join(", ")} onChange={(e) => set({ [k]: e.target.value.split(",").map((x) => x.trimStart()).filter((x, i, a) => x || i === a.length - 1) } as Partial<ServiceDescription>)} onBlur={(e) => set({ [k]: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) } as Partial<ServiceDescription>)} className={FIELD} />
    </label>
  );

  return (
    <div className="mt-4 grid gap-7 rounded-[14px] border border-line bg-white p-5 md:grid-cols-[220px_minmax(0,1fr)] md:p-6" data-hire>
      <ol className="flex gap-1 overflow-x-auto text-[14px] md:block md:space-y-1" data-hire-rail>
        {STEPS.map((s, i) => (
          <li key={s} className={"flex items-center gap-2.5 whitespace-nowrap rounded-[8px] px-2.5 py-2 font-semibold " + (i === step ? "bg-[#fbeafb] text-magenta-dark" : i < step ? "text-ink" : "text-ink-2")}>
            <span aria-hidden className={"inline-grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11.5px] " + (i < step ? "bg-magenta-dark text-white" : i === step ? "border-[1.5px] border-magenta-dark" : "border-[1.5px] border-line")}>{i < step ? "✓" : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      <section className="min-w-0">
        {step === 0 && start === "choose" && (
          <div data-hire-start>
            <h2 className="text-[19px] font-extrabold">What do you need done?</h2>
            <p className="text-[13.5px] text-ink-2">Start from a posting you already have, or fill it in yourself.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setStart("upload")} className={OPT_OFF} data-upload-posting><b className="text-[15px]">Upload a Posting</b><small className="text-[12.5px] text-ink-2">Paste it or drop a Word / PDF file — we fill in the steps, you check them.</small></button>
              <button type="button" onClick={() => setStart("form")} className={OPT_OFF}><b className="text-[15px]">Fill It In Myself</b><small className="text-[12.5px] text-ink-2">Five short steps.</small></button>
            </div>
          </div>
        )}
        {step === 0 && start === "upload" && (
          <div data-hire-upload>
            <h2 className="text-[19px] font-extrabold">Upload a posting</h2>
            <p className="text-[13.5px] text-ink-2">From LinkedIn or anywhere. Names, emails and phone numbers are taken out before we read it.</p>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border-2 border-dashed border-line bg-bg-soft px-4 py-6 text-center hover:border-magenta-dark"
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) void read(file); }}>
              <b className="text-[14.5px]">Drop a .docx or .pdf here</b>
              <span className="text-[12.5px] text-ink-2">or click to choose a file</span>
              <input type="file" accept=".docx,.pdf,.doc,.txt" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void read(file); }} />
            </label>
            <label className={LABEL}>Or paste the posting
              <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={8} className={FIELD} placeholder="Paste the whole posting here" />
            </label>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" className={BTN} disabled={busy || paste.trim().length < 60} onClick={() => read(null)}>{busy ? "Reading…" : "Read My Posting"}</button>
              <button type="button" className={GHOST} disabled={busy} onClick={() => setStart("form")}>Fill It In Myself</button>
            </div>
          </div>
        )}
        {step === 0 && start === "form" && (
          <>
            <h2 className="text-[19px] font-extrabold">What do you need done?</h2>
            <p className="text-[13.5px] text-ink-2">Pick the closest category, give it a short title and say what the work is.</p>
            {f.businessTypeId && !changing ? (
              <p className="mt-4 flex flex-wrap items-center gap-2 text-[14px]" data-class-playback>
                <b>{f.category} › {f.businessType}</b>
                {f.classConfidence && f.classConfidence !== "low" && from("businessType")}
                <button type="button" onClick={() => setChanging(true)} className="text-[13px] font-semibold text-magenta-dark underline underline-offset-4">Change</button>
              </p>
            ) : (
              <>
                {f.classConfidence === "low" && <p className="mt-4 text-[13.5px] font-semibold text-magenta-dark">We weren&apos;t sure — pick the closest.</p>}
                <p className="mb-1.5 mt-4 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-3">Category</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => <button key={c} type="button" aria-pressed={f.category === c} onClick={() => set({ category: c, ...(c !== f.category ? { businessTypeId: null, businessType: "" } : {}) })} className={f.category === c ? CHIP_ON : CHIP_OFF}>{c}</button>)}
                </div>
                {f.category && (
                  <>
                    <p className="mb-1.5 mt-3 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-3">Business Type</p>
                    <div className="flex flex-wrap gap-2" data-business-types>
                      {(hierarchy.find((h) => h.name === f.category)?.businessTypes ?? []).map((b) => (
                        <button key={b.id} type="button" aria-pressed={f.businessTypeId === b.id} onClick={() => pickBusinessType(b)} className={f.businessTypeId === b.id ? CHIP_ON : CHIP_OFF}>{b.name}</button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            <label className={LABEL}>Title{from("title")}
              <input value={f.title} onChange={(e) => set({ title: e.target.value })} maxLength={140} className={FIELD} placeholder="e.g. Oracle Cloud Procurement Functional Consultant" />
            </label>
            <label className={LABEL}>Summary{from("summary")}
              <textarea value={f.summary} onChange={(e) => set({ summary: e.target.value })} rows={3} maxLength={4000} className={FIELD} />
            </label>
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="text-[19px] font-extrabold">Where is the work?</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {WORKSITES.map(([v, t, l]) => <button key={v} type="button" aria-pressed={f.worksite === v} onClick={() => set({ worksite: v })} className={f.worksite === v ? OPT_ON : OPT_OFF}><b className="text-[14px]">{t}</b><small className="text-[12px] text-ink-2">{l}</small></button>)}
            </div>
            {f.fromPosting.includes("worksite") && <p className="mt-1">{from("worksite")}</p>}
            <div className="grid gap-x-3 sm:grid-cols-3">
              <label className={LABEL}>City{from("city")}<input value={f.city} onChange={(e) => set({ city: e.target.value })} className={FIELD} /></label>
              <label className={LABEL}>State<input value={f.state} onChange={(e) => set({ state: e.target.value })} className={FIELD} /></label>
              <label className={LABEL}>Country<input value={f.country} onChange={(e) => set({ country: e.target.value })} className={FIELD} /></label>
            </div>
            {f.worksite && f.worksite !== "OFFSITE" && (
              <label className={LABEL}>Onsite days per week{from("onsiteDays")}
                <input inputMode="numeric" value={f.onsiteDays ?? ""} onChange={(e) => set({ onsiteDays: e.target.value ? Math.min(7, Number(e.target.value.replace(/\D/g, ""))) : null })} className={`${FIELD} max-w-[120px]`} />
              </label>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-[19px] font-extrabold">How will you contract them?</h2>
            <p className="text-[13.5px] text-ink-2">Pick every type you accept.{from("contractTypes")}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {CONTRACTS.map((c) => {
                const on = f.contractTypes.includes(c.value);
                return <button key={c.value} type="button" aria-pressed={on} onClick={() => set({ contractTypes: on ? f.contractTypes.filter((x) => x !== c.value) : [...f.contractTypes, c.value] })} className={on ? OPT_ON : OPT_OFF}><b className="text-[14px]">{c.value}</b><small className="text-[12px] text-ink-2">{c.line}</small></button>;
              })}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="text-[19px] font-extrabold">Who do you need?</h2>
            {f.usesSkills && <div className="grid gap-x-3 sm:grid-cols-2">
              <label className={LABEL}>Role{from("roleId")}
                <select value={f.roleId ?? ""} onChange={(e) => set({ roleId: e.target.value || null })} className={FIELD}><option value="">Any role</option>{roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
              </label>
              <label className={LABEL}>Product{from("product")}<input value={f.product} onChange={(e) => set({ product: e.target.value })} className={FIELD} placeholder="Fusion Cloud, EBS, PeopleSoft…" /></label>
            </div>}
            {f.usesSkills && listField("domains", "Domain", "(P2P, O2C, R2R…)")}
            <p className="mb-1.5 mt-4 text-[13px] font-bold">{f.usesSkills ? "Skills" : "What they provide"}{from("skills")}</p>
            <div className="flex flex-wrap gap-2" data-hire-skills>
              {f.skills.map((s) => <button key={s.id} type="button" onClick={() => set({ skills: f.skills.filter((x) => x.id !== s.id) })} className={CHIP_ON} aria-label={`Remove ${s.name}`}>{s.name} ×</button>)}
              {f.customSkills.map((s) => <button key={s} type="button" onClick={() => set({ customSkills: f.customSkills.filter((x) => x !== s) })} className={CHIP_OFF} aria-label={`Remove ${s}`}>{s} ×</button>)}
              {suggested.filter((s) => !f.customSkills.includes(s) && !f.skills.some((k) => k.name === s)).map((s) => <button key={s} type="button" onClick={() => addSkill(s)} className="rounded-full border border-dashed border-line px-3.5 py-1.5 text-[13px] text-ink-2 hover:border-magenta-dark">+ {s}</button>)}
            </div>
            <div className="mt-2 flex gap-2">
              <input value={extra} onChange={(e) => setExtra(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addSkill(extra); } }} placeholder="Add a skill" aria-label="Add a skill" className="min-w-0 flex-1 rounded-[8px] border border-line px-3 py-2 text-[14px]" />
              <button type="button" className={GHOST} onClick={() => addSkill(extra)}>Add</button>
            </div>
            <div className="grid gap-x-3 sm:grid-cols-2">
              <label className={LABEL}>Years of experience{from("years")}<input inputMode="numeric" value={f.years ?? ""} onChange={(e) => set({ years: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })} className={FIELD} /></label>
              <label className={LABEL}>Education{from("education")}<input value={f.education} onChange={(e) => set({ education: e.target.value })} className={FIELD} /></label>
            </div>
            {listField("credentials", "Credentials", "(comma separated)")}
            <label className={LABEL}>Responsibilities <span className="font-normal text-ink-3">(one per line)</span>{from("responsibilities")}<textarea value={f.responsibilities} onChange={(e) => set({ responsibilities: e.target.value })} rows={4} className={FIELD} /></label>
            <label className={LABEL}>Required{from("required")}<textarea value={f.required} onChange={(e) => set({ required: e.target.value })} rows={3} className={FIELD} /></label>
            <label className={LABEL}>Nice to have{from("niceToHave")}<textarea value={f.niceToHave} onChange={(e) => set({ niceToHave: e.target.value })} rows={2} className={FIELD} /></label>
          </>
        )}
        {step === 4 && (
          <>
            <h2 className="text-[19px] font-extrabold">When, and what&apos;s your budget?</h2>
            <div className="grid gap-x-3 sm:grid-cols-3">
              <label className={LABEL}>Start{from("startText")}<input value={f.startText} onChange={(e) => set({ startText: e.target.value })} className={FIELD} placeholder="ASAP, within 2 weeks…" /></label>
              <label className={LABEL}>Or a date<input type="date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} className={FIELD} /></label>
              <label className={LABEL}>How long{from("duration")}
                <select value={f.duration ?? ""} onChange={(e) => set({ duration: (e.target.value || null) as ServiceDescription["duration"] })} className={FIELD}><option value="">Not sure yet</option>{howLong.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}</select>
              </label>
            </div>
            <p className="mb-1.5 mt-5 text-[13px] font-bold">Rate{from("budget")}</p>
            <div className="grid grid-cols-2 gap-2">
              {([["HOURLY", "Hourly rate", "Pay for time worked"], ["FIXED", "Fixed price", "One price for the job"]] as const).map(([v, t, l]) => <button key={v} type="button" aria-pressed={f.budgetType === v} onClick={() => set({ budgetType: v })} className={f.budgetType === v ? OPT_ON : OPT_OFF}><b className="text-[14px]">{t}</b><small className="text-[12px] text-ink-2">{l}</small></button>)}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-[13px] font-bold">From ($)<input inputMode="numeric" value={f.budgetMin ?? ""} onChange={(e) => set({ budgetMin: e.target.value ? Number(e.target.value.replace(/[^0-9.]/g, "")) : null })} className={FIELD} /></label>
              <label className="text-[13px] font-bold">To ($)<input inputMode="numeric" value={f.budgetMax ?? ""} onChange={(e) => set({ budgetMax: e.target.value ? Number(e.target.value.replace(/[^0-9.]/g, "")) : null })} className={FIELD} /></label>
            </div>
            <p className="mt-1 text-[12.5px] text-ink-3">{f.budgetType === "FIXED" ? "For the whole job." : "Per hour. Postings often leave this out — add yours."}</p>
          </>
        )}
        {step === 5 && matches && (
          <div data-hire-matches>
            <h2 className="text-[19px] font-extrabold">Your matches</h2>
            <p className="text-[13.5px] text-ink-2">Ranked by role, skills, product and location, then rate inside your budget. Pick who should send a proposal.</p>
            {matches.length === 0 ? (
              <p className="mt-4 text-[14px] text-ink-3">No one in {f.category} matches yet. Your Service Description is saved as a draft — <Link href={`/work-requests/${jobId}`} className="font-semibold text-magenta-dark underline">open it</Link>.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {matches.map((m) => (
                  <li key={m.personId} className="flex items-start gap-3 py-3" data-hire-match={m.name}>
                    <input type="checkbox" checked={picked.has(m.personId)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(m.personId)) n.delete(m.personId); else n.add(m.personId); return n; })} aria-label={`Select ${m.name}`} className="mt-1 h-4 w-4 accent-[var(--color-ink,#272334)]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold">{m.company ? `${m.company} · ` : ""}{m.name}</p>
                      <p className="text-[13px] text-ink-2">{m.line}</p>
                      <p className="mt-1 flex flex-wrap gap-1.5 text-[11.5px]" data-why>
                        {m.why.map((k) => <span key={k} className="rounded-full border border-magenta-dark bg-[#fbeafb] px-2 font-semibold text-magenta-dark">{k}</span>)}
                        {m.matched.map((k) => <span key={k} className="rounded-full border border-line bg-bg-soft px-2">{k}</span>)}
                        {m.inBudget && <span className="rounded-full border border-line px-2">In budget</span>}
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
                <button type="button" className={BTN} disabled={busy || !picked.size || sent != null} onClick={request} data-request-proposals>{sent != null ? "Requests Sent" : "Request Proposals"}</button>
                <span className="text-[13px] text-ink-2">{picked.size} selected</span>
                {sent != null && <Link href={`/work-requests/${jobId}`} className="text-[13.5px] font-semibold text-magenta-dark underline underline-offset-4">View the Service Description →</Link>}
              </div>
            )}
          </div>
        )}

        {error && <p role="alert" className="mt-3 text-[13.5px] font-semibold text-magenta-dark">{error}</p>}
        {step < 5 && !(step === 0 && start !== "form") && (
          <div className="mt-5 flex justify-between gap-3 border-t border-line pt-4">
            <button type="button" className={GHOST} disabled={busy} onClick={() => (step === 0 ? setStart("choose") : setStep(step - 1))}>Back</button>
            <button type="button" className={BTN} disabled={busy} onClick={next}>{busy ? "Saving…" : step === 4 ? "Show My Matches" : `Next: ${STEPS[step + 1]}`}</button>
          </div>
        )}
        {step === 5 && <button type="button" className="mt-4 text-[13px] font-semibold text-ink-2 underline" onClick={() => { setStep(4); setSent(null); }}>Change my answers</button>}
      </section>
    </div>
  );
}
