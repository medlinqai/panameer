"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { HireMatch } from "@/lib/hire-questionnaire";
import { MatchList } from "@/components/hire/MatchList";
import type { JobDefaults } from "@/lib/work-request";
import type { SdContract, ServiceDescription } from "@/lib/service-description";
import { defaultDates, howLongText } from "@/lib/job-dates";

// SD-E003: Hire follows the Service Description standard. Step 1 can start from an uploaded posting (read like a résumé);
// every step is then prefilled with "From AI" hints; Next saves the draft Job.
const STEPS = ["What", "Where", "How", "Who", "When & Rate", "Request Availability"];
const CHIP_ON = "rounded-full border border-magenta-dark bg-[#fbeafb] px-3.5 py-1.5 text-[13px] font-semibold text-magenta-dark";
const CHIP_OFF = "rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] font-medium text-ink hover:border-magenta-dark";
const OPT_ON = "flex flex-col items-start rounded-[10px] border border-magenta-dark bg-white p-3 text-left ring-1 ring-magenta-dark";
const OPT_OFF = "flex flex-col items-start rounded-[10px] border border-line bg-white p-3 text-left hover:border-magenta-dark";
const RATE_ON = "flex flex-col items-start rounded-[10px] border-2 border-magenta-dark bg-[#fbeafb] p-3 text-left";
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
const WORKSITES = [["OFFSITE", "Offsite", "Works at Provider Location"], ["ONSITE", "Onsite", "Works at Buyer Company Location"], ["HYBRID", "Hybrid", "Some days at your site"]] as const;

type Hierarchy = { name: string; businessTypes: { id: string; name: string; usesSkills: boolean }[] }[];
type Props = {
  hierarchy: Hierarchy;
  howLong: { value: string; label: string }[];
  roles: { name: string; roleId: string | null }[];
  initial: ServiceDescription;
  defaults: JobDefaults;
  initialJobId: string | null;
  initialStep: number;
};

export function HireQuestionnaire({ hierarchy, roles, defaults, initial, initialJobId, initialStep }: Props) {
  const categories = hierarchy.map((h) => h.name);
  const [step, setStep] = useState(initialStep);
  // Rail stops are clickable for any step already reached (furthest step seen this session).
  const [furthest, setFurthest] = useState(initialStep);
  const [rangeHint, setRangeHint] = useState<string | null>(null);
  const [rangeAsked, setRangeAsked] = useState(false);
  if (step > furthest) setFurthest(step);
  useEffect(() => {
    if (step !== 4) return;
    // CA-E001: Start two weeks out and End = Start + the posting's duration unless the posting gave dates.
    setF((x) => (x.startDate && x.endDate ? x : { ...x, ...defaultDates(x) }));
    if (rangeAsked) return;
    setRangeAsked(true);
    void (async () => {
      const r = await fetch("/api/hire", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rateRange", input: { ...f, budgetType: f.budgetType ?? "HOURLY" } }) }).catch(() => null);
      const j = (await r?.json().catch(() => ({}))) as { range?: { min: number; max: number; n: number } | null };
      if (!j.range) return;
      const per = (f.budgetType ?? "HOURLY") === "FIXED" ? "" : "/hr";
      setRangeHint(`${j.range.n} matching providers charge about $${j.range.min}–$${j.range.max}${per}.`);
      if (f.budgetMin == null && f.budgetMax == null) setF((x) => ({ ...x, budgetMin: j.range!.min, budgetMax: j.range!.max }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  // SM-E006: fields prefilled from the buyer's last job (cleared once the posting or the buyer sets them).
  const [fromLast, setFromLast] = useState<string[]>(initialJobId ? [] : defaults.fromLast);
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
  const set = (patch: Partial<ServiceDescription>) => { setF((x) => ({ ...x, ...patch })); setFromLast((l) => l.filter((k) => !(k in patch))); };
  const from = (k: string) => (f.fromPosting.includes(k) ? <span className="ml-2 rounded-full bg-[#fbeafb] px-2 py-0.5 text-[11px] font-semibold text-magenta-dark" data-from-posting>From AI</span> : fromLast.includes(k) ? <span className="ml-2 rounded-full bg-[#fbeafb] px-2 py-0.5 text-[11px] font-semibold text-magenta-dark" data-from-last-job>From Your Last Job</span> : null);

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
    if (!r?.ok || !j.sd) { setError(j.error ?? "We couldn't read that job description."); return; }
    // SM-E006: posting values win; where the posting is silent, keep the last job's defaults.
    const p = j.sd;
    const keep = { worksite: !p.worksite, contractTypes: !p.contractTypes.length, duration: !p.duration, budgetType: !p.budgetType };
    setF({ ...p, category: p.category || f.category,
      worksite: p.worksite ?? defaults.worksite, contractTypes: p.contractTypes.length ? p.contractTypes : defaults.contractTypes,
      duration: p.duration ?? defaults.duration, budgetType: p.budgetType ?? defaults.budgetType,
      ...(p.city ? {} : { city: f.city, state: f.state }) });
    setFromLast(defaults.fromLast.filter((k) => keep[k as keyof typeof keep]));
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
    if (step === 4 && (!f.startDate || !f.endDate)) { setError("Set a Start Date and an End Date."); return; }
    if (step === 4 && f.endDate <= f.startDate) { setError("The End Date must be after the Start Date."); return; }
    if (step === 4 && (f.budgetMin == null || f.budgetMax == null || f.budgetMin <= 0 || f.budgetMax <= 0)) {
      setError("Enter a rate range (From and To). Providers use it to decide whether they want the job, and we use it to rank matches.");
      return;
    }
    if (step === 4 && f.budgetMin != null && f.budgetMax != null && f.budgetMin > f.budgetMax) {
      setError(`"From" ($${f.budgetMin}) is higher than "To" ($${f.budgetMax}). Swap them or fix one.`);
      return;
    }
    if (step < 4) {
      const j = await call({ action: "save", jobId, input: { ...f, budgetType: f.budgetType ?? "HOURLY" } });
      if (!j) return;
      setJobId(j.jobId as string);
      setStep(step + 1);
      return;
    }
    await loadMatches();
  };

  const loadMatches = async () => {
    const j = await call({ action: "matches", jobId, input: { ...f, budgetType: f.budgetType ?? "HOURLY" } });
    if (!j) return;
    // OJ-E002: Create Job & Show Matches lands on the Job page's Matches tab.
    router.push(`/work-requests/${j.jobId as string}`); // opens on the current step's tab
  };

  // Back from a profile returns to the same job and step: the address carries ?job=&step=. router.replace (not
  // history.replaceState) so the router's cached page for Back is this URL, not the bare /hire it started on.
  const router = useRouter();
  useEffect(() => {
    if (!jobId) return;
    const want = `/hire?job=${jobId}&step=${step}`;
    if (window.location.pathname + window.location.search !== want) router.replace(want, { scroll: false });
  }, [jobId, step, router]);
  const reopened = useRef(false);
  useEffect(() => {
    if (reopened.current || initialStep !== 5 || !initialJobId) return;
    reopened.current = true;
    void loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PC-E002: a new Business Type re-reads WHO from the posting (pass 2 only); What, Where, Contract, When and Rate stay.
  const pickBusinessType = async (b: { id: string; name: string; usesSkills: boolean }) => {
    set({ businessTypeId: b.id, businessType: b.name, usesSkills: b.usesSkills, classConfidence: null });
    setChanging(false);
    if (!f.sourceText || b.id === f.businessTypeId) return;
    const j = await call({ action: "reparseWho", sourceText: f.sourceText, businessTypeId: b.id });
    const who = j?.who as Partial<ServiceDescription> | undefined;
    if (who) setF((x) => ({ ...x, ...who, fromPosting: [...x.fromPosting.filter((k) => !["roleId", "specificRole", "domains", "product", "skills", "customSkills", "years", "education", "credentials", "specialties", "responsibilities", "required", "niceToHave"].includes(k)), ...(who.fromPosting ?? [])] }));
  };
  // Scott 10-24: a Category with a single Type of Work picks it — nothing to choose.
  useEffect(() => {
    if (!f.category || f.businessTypeId) return;
    const only = hierarchy.find((h) => h.name === f.category)?.businessTypes ?? [];
    if (only.length === 1) void pickBusinessType(only[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.category, f.businessTypeId]);


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
          <li key={s}>
            <button type="button" disabled={i === step || i > furthest || busy || (i > 0 && !jobId)} onClick={() => { setError(null); setStep(i); if (i === 5) void loadMatches(); }} aria-current={i === step ? "step" : undefined}
              className={"flex w-full items-center gap-2.5 whitespace-nowrap rounded-[8px] px-2.5 py-2 text-left font-semibold enabled:cursor-pointer enabled:hover:bg-[#f6f5f9] " + (i === step ? "bg-[#fbeafb] text-magenta-dark" : i < step ? "text-ink" : "text-ink-2")}>
            <span aria-hidden className={"inline-grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11.5px] " + (i < step ? "bg-magenta-dark text-white" : i === step ? "border-[1.5px] border-magenta-dark" : "border-[1.5px] border-line")}>{i < step ? "✓" : i + 1}</span>
            {s}
            </button>
          </li>
        ))}
      </ol>

      <section className="min-w-0">
        {step === 0 && start === "choose" && (
          <div data-hire-start>
            <h2 className="text-[19px] font-extrabold">1. What Do You Need Done?</h2>
            <p className="text-[13.5px] text-ink-2">Start from a posting you already have, or fill it in yourself.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setStart("upload")} className={OPT_OFF} data-upload-posting><b className="text-[15px]">Create Job Using AI</b><small className="text-[12.5px] text-ink-2">Upload a job description (Word or PDF) or paste it in. AI fills in the five steps; you check them.</small></button>
              <button type="button" onClick={() => setStart("form")} className={OPT_OFF}><b className="text-[15px]">Create Job Manually</b><small className="text-[12.5px] text-ink-2">Fill in the five short steps yourself.</small></button>
            </div>
          </div>
        )}
        {step === 0 && start === "upload" && (
          <div data-hire-upload>
            <h2 className="text-[19px] font-extrabold">Create Job Using AI</h2>
            <p className="text-[13.5px] text-ink-2">From LinkedIn or anywhere. Names, emails and phone numbers are taken out before we read it.</p>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border-2 border-dashed border-line bg-bg-soft px-4 py-6 text-center hover:border-magenta-dark"
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) void read(file); }}>
              <b className="text-[14.5px]">Drop a .docx or .pdf here</b>
              <span className="text-[12.5px] text-ink-2">or click to choose a file</span>
              <input type="file" accept=".docx,.pdf,.doc,.txt" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void read(file); }} />
            </label>
            <label className={LABEL}>Or Paste the Job Description
              <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={8} className={FIELD} placeholder="Paste the whole job description here" />
            </label>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" className={BTN} disabled={busy || paste.trim().length < 60} onClick={() => read(null)}>{busy ? "Creating…" : "Create Job Using AI"}</button>
              <button type="button" className={GHOST} disabled={busy} onClick={() => setStart("form")}>Create Job Manually</button>
            </div>
          </div>
        )}
        {step === 0 && start === "form" && (
          <>
            <h2 className="text-[19px] font-extrabold">1. What Do You Need Done?</h2>
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
                <p className="mb-1.5 mt-4 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-3">What Kind of Work Do You Need?</p>
                <p className="-mt-1 mb-2 text-[12.5px] text-ink-2">The work you're buying — not your company's industry. A trucking company hiring an Oracle consultant picks ERP &amp; Oracle.</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => <button key={c} type="button" aria-pressed={f.category === c} onClick={() => set({ category: c, ...(c !== f.category ? { businessTypeId: null, businessType: "" } : {}) })} className={f.category === c ? CHIP_ON : CHIP_OFF}>{c}</button>)}
                </div>
                {f.category && (
                  <>
                    <p className="mb-1.5 mt-3 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-3">Type of Work</p>
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
            <h2 className="text-[19px] font-extrabold">2. Where Is the Work?</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {WORKSITES.map(([v, t, l]) => <button key={v} type="button" aria-pressed={f.worksite === v} onClick={() => set({ worksite: v })} className={f.worksite === v ? OPT_ON : OPT_OFF}><b className="text-[14px]">{t}</b><small className="text-[12px] text-ink-2">{l}</small></button>)}
            </div>
            {from("worksite") && <p className="mt-1">{from("worksite")}</p>}
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
            <h2 className="text-[19px] font-extrabold">3. Which Contract Type?</h2>
            <p className="text-[13.5px] text-ink-2">Pick every contract type you accept.{from("contractTypes")}</p>
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
            <h2 className="text-[19px] font-extrabold">4. Who Do You Need?</h2>
            {f.usesSkills && <div className="grid gap-x-3 sm:grid-cols-2">
              <label className={LABEL}>Role{from("roleId")}
                <select value={f.specificRole} onChange={(e) => set({ specificRole: e.target.value, roleId: roles.find((r) => r.name === e.target.value)?.roleId ?? null })} className={FIELD}><option value="">Any role</option>{f.specificRole && !roles.some((r) => r.name === f.specificRole) && <option value={f.specificRole}>{f.specificRole}</option>}{roles.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}</select>
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
            <h2 className="text-[19px] font-extrabold">5. When, and What&apos;s Your Budget?</h2>
            <div className="grid gap-x-3 sm:grid-cols-3" data-job-dates>
              <label className={LABEL}>Start Date{from("startDate")}
                <input type="date" required value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} className={FIELD} />
              </label>
              <label className={LABEL}>End Date{from("endDate")}
                <input type="date" required min={f.startDate || undefined} value={f.endDate} onChange={(e) => set({ endDate: e.target.value })} className={FIELD} />
              </label>
              <p className={LABEL}>How Long<span className="mt-1 block py-2.5 text-[14.5px] font-normal text-ink-2" data-how-long>{f.startDate && f.endDate ? (f.endDate > f.startDate ? howLongText(f.startDate, f.endDate) : "End is before Start") : "—"}</span></p>
            </div>
            <p className="mb-1.5 mt-5 text-[13px] font-bold">Rate{from("budget") ?? from("budgetType")}</p>
            <div className="grid grid-cols-2 gap-2">
              {([["HOURLY", "Hourly rate", "Pay for time worked"], ["FIXED", "Fixed price", "One price for the job"]] as const).map(([v, t, l]) => <button key={v} type="button" aria-pressed={(f.budgetType ?? "HOURLY") === v} onClick={() => set({ budgetType: v })} className={(f.budgetType ?? "HOURLY") === v ? RATE_ON : OPT_OFF}><b className="text-[14px]">{t}</b><small className="text-[12px] text-ink-2">{l}</small></button>)}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-[13px] font-bold">{f.budgetType === "FIXED" ? "From ($)" : "From ($/hour)"}<input inputMode="numeric" value={f.budgetMin ?? ""} onChange={(e) => set({ budgetMin: e.target.value ? Number(e.target.value.replace(/[^0-9.]/g, "")) : null })} className={FIELD} /></label>
              <label className="text-[13px] font-bold">{f.budgetType === "FIXED" ? "To ($)" : "To ($/hour)"}<input inputMode="numeric" value={f.budgetMax ?? ""} onChange={(e) => set({ budgetMax: e.target.value ? Number(e.target.value.replace(/[^0-9.]/g, "")) : null })} className={FIELD} /></label>
            </div>
            {f.budgetMin != null && f.budgetMax != null && f.budgetMin > f.budgetMax ? (
              <p role="alert" className="mt-1 text-[12.5px] font-semibold text-[#B3261E]">&quot;From&quot; is higher than &quot;To&quot;. <button type="button" className="underline underline-offset-2" onClick={() => set({ budgetMin: f.budgetMax, budgetMax: f.budgetMin })}>Swap them</button></p>
            ) : (<p className="mt-1 text-[12.5px] text-ink-3">{(f.budgetType === "FIXED" ? "Required. For the whole job." : "Required. Per hour; providers see this range.") + (rangeHint ? ` ${rangeHint}` : "")}</p>)}
            <label className="mt-5 flex items-center gap-2 text-[14px] font-semibold" data-publish-locked>
              <input type="checkbox" checked disabled readOnly className="accent-ink" />
              Publish on the Job Board <span className="font-normal text-ink-3">(every job is published)</span>
            </label>
          </>
        )}
        {step === 5 && matches && (
          <div data-hire-matches>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[19px] font-extrabold">6. View Providers and Hire or Shortlist (and Request Availability)</h2>
              <details className="relative text-[13px]" data-how-we-match>
                <summary className="cursor-pointer list-none font-semibold text-magenta-dark underline underline-offset-4">ⓘ How We Match</summary>
                <div className="absolute right-0 z-20 mt-2 w-[min(92vw,420px)] border border-line bg-white p-4 text-[13px] leading-relaxed text-ink shadow-lg">
                  <p className="font-bold">How we rank providers for this job</p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                    <li><b>Where:</b> for onsite work, providers who can be on site come first.</li>
                    <li><b>Domain:</b> providers who work in the job&apos;s domain (e.g. P2P) rank above those who don&apos;t.</li>
                    <li><b>Fit score:</b> the role you asked for counts most, then each shared domain, the product (e.g. Oracle Fusion Cloud), each skill they share with the job, and years of experience (up to 20).</li>
                    <li><b>Budget:</b> when two are equally close, the one whose rate is inside your range comes first.</li>
                  </ol>
                  <p className="mt-2 text-ink-2">Providers who share no domain or skill with the job sit under Weaker Matches. Names and companies stay hidden until an Order is released; you see each provider&apos;s number.</p>
                </div>
              </details>
            </div>
            <p className="text-[13.5px] text-ink-2">Click a row for a quick view.</p>
            <MatchList key={jobId ?? "new"} jobId={jobId} matches={matches} state={f.state} empty={<p className="mt-4 text-[14px] text-ink-3">No one in {f.category} matches yet. Your Service Description is saved as a draft — <Link href={`/work-requests/${jobId}`} className="font-semibold text-magenta-dark underline">open it</Link>.</p>} />
          </div>
        )}

        {error && <p role="alert" className="mt-3 text-[13.5px] font-semibold text-magenta-dark">{error}</p>}
        {step < 5 && !(step === 0 && start !== "form") && (
          <div className="mt-5 flex justify-between gap-3 border-t border-line pt-4">
            <button type="button" className={GHOST} disabled={busy} onClick={() => (step === 0 ? setStart("choose") : setStep(step - 1))}>Back</button>
            <button type="button" className={BTN} disabled={busy} onClick={next}>{busy ? "Saving…" : step === 4 ? "Create Job & Show Matches" : `Next: ${STEPS[step + 1]}`}</button>
          </div>
        )}
        {step === 5 && <button type="button" className="mt-4 text-[13px] font-semibold text-ink-2 underline" onClick={() => setStep(4)}>Change My Answers</button>}
      </section>
    </div>
  );
}
