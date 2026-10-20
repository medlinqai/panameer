"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { HireMatch } from "@/lib/hire-questionnaire";
import type { JobDefaults } from "@/lib/work-request";
import type { SdContract, ServiceDescription } from "@/lib/service-description";

// SD-E003: Hire follows the Service Description standard. Step 1 can start from an uploaded posting (read like a résumé);
// every step is then prefilled with "from your posting" hints; Next saves the draft Job.
const STEPS = ["The Work", "Where", "Contract", "Who", "When & Rate", "Request Proposals"];
const CHIP_ON = "rounded-full border border-magenta-dark bg-[#fbeafb] px-3.5 py-1.5 text-[13px] font-semibold text-magenta-dark";
const CHIP_OFF = "rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] font-medium text-ink hover:border-magenta-dark";
const OPT_ON = "flex flex-col items-start rounded-[10px] border border-magenta-dark bg-white p-3 text-left ring-1 ring-magenta-dark";
const OPT_OFF = "flex flex-col items-start rounded-[10px] border border-line bg-white p-3 text-left hover:border-magenta-dark";
const RATE_ON = "flex flex-col items-start rounded-[10px] border-2 border-magenta-dark bg-[#fbeafb] p-3 text-left";
const START_CHIPS = ["ASAP", "Within 2 weeks"] as const;
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
  roles: { name: string; roleId: string | null }[];
  initial: ServiceDescription;
  defaults: JobDefaults;
  initialJobId: string | null;
  initialStep: number;
};

export function HireQuestionnaire({ hierarchy, howLong, roles, defaults, initial, initialJobId, initialStep }: Props) {
  const categories = hierarchy.map((h) => h.name);
  const [step, setStep] = useState(initialStep);
  // SM-E006: fields prefilled from the buyer's last job (cleared once the posting or the buyer sets them).
  const [pickDate, setPickDate] = useState(!!initial.startDate);
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
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // MQ-E001: providers outside the job's state stay folded away until asked for.
  const [showOutside, setShowOutside] = useState(false);
  // MQ-E005: hidden per job; the list closes up at once and "Show hidden" brings them back.
  const [showHidden, setShowHidden] = useState(false);
  const hide = async (personId: string, hidden: boolean) => {
    setMatches((ms) => ms?.map((m) => (m.personId === personId ? { ...m, hidden } : m)) ?? null);
    if (hidden) setPicked((s) => { const n = new Set(s); n.delete(personId); return n; });
    await fetch("/api/hire", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: hidden ? "hide" : "unhide", jobId, personIds: [personId] }) }).catch(() => null);
  };
  const [sent, setSent] = useState<number | null>(null);
  const set = (patch: Partial<ServiceDescription>) => { setF((x) => ({ ...x, ...patch })); setFromLast((l) => l.filter((k) => !(k in patch))); };
  const from = (k: string) => (f.fromPosting.includes(k) ? <span className="ml-2 rounded-full bg-[#fbeafb] px-2 py-0.5 text-[11px] font-semibold text-magenta-dark" data-from-posting>from your posting</span> : fromLast.includes(k) ? <span className="ml-2 rounded-full bg-[#fbeafb] px-2 py-0.5 text-[11px] font-semibold text-magenta-dark" data-from-last-job>from your last job</span> : null);

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
    setJobId(j.jobId as string);
    const m = (j.matches as HireMatch[]) ?? [];
    setMatches(m);
    // MQ-E005: nothing pre-ticked.
    setPicked(new Set());
    setStep(5);
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
    if (who) setF((x) => ({ ...x, ...who, fromPosting: [...x.fromPosting.filter((k) => !["roleId", "specificRole", "domains", "product", "skills", "customSkills", "years", "education", "credentials", "specialties", "responsibilities", "required", "niceToHave"].includes(k)), ...(who.fromPosting ?? [])] }));
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
            <h2 className="text-[19px] font-extrabold">When, and what&apos;s your budget?</h2>
            <p className={LABEL}>Start{from("startText")}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2" data-start-chips>
              {f.startText && !pickDate && !(START_CHIPS as readonly string[]).includes(f.startText) && <button type="button" aria-pressed className={CHIP_ON}>{f.startText}</button>}
              {START_CHIPS.map((c) => { const on = !pickDate && f.startText === c; return <button key={c} type="button" aria-pressed={on} onClick={() => { setPickDate(false); set({ startText: c, startDate: "" }); }} className={on ? CHIP_ON : CHIP_OFF}>{c}</button>; })}
              <button type="button" aria-pressed={pickDate} onClick={() => { setPickDate(true); set({ startText: "" }); }} className={pickDate ? CHIP_ON : CHIP_OFF}>Pick a date</button>
              {pickDate && <input type="date" aria-label="Start date" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} className="rounded-[8px] border border-line bg-white px-3 py-1.5 text-[14px]" />}
            </div>
            <div className="grid gap-x-3 sm:grid-cols-3">
              <label className={LABEL}>How long{from("duration")}
                <select value={f.duration ?? ""} onChange={(e) => set({ duration: (e.target.value || null) as ServiceDescription["duration"] })} className={FIELD}><option value="">Not sure yet</option>{howLong.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}</select>
              </label>
            </div>
            <p className="mb-1.5 mt-5 text-[13px] font-bold">Rate{from("budget") ?? from("budgetType")}</p>
            <div className="grid grid-cols-2 gap-2">
              {([["HOURLY", "Hourly rate", "Pay for time worked"], ["FIXED", "Fixed price", "One price for the job"]] as const).map(([v, t, l]) => <button key={v} type="button" aria-pressed={(f.budgetType ?? "HOURLY") === v} onClick={() => set({ budgetType: v })} className={(f.budgetType ?? "HOURLY") === v ? RATE_ON : OPT_OFF}><b className="text-[14px]">{t}</b><small className="text-[12px] text-ink-2">{l}</small></button>)}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-[13px] font-bold">{f.budgetType === "FIXED" ? "From ($)" : "From ($/hour)"}<input inputMode="numeric" value={f.budgetMin ?? ""} onChange={(e) => set({ budgetMin: e.target.value ? Number(e.target.value.replace(/[^0-9.]/g, "")) : null })} className={FIELD} /></label>
              <label className="text-[13px] font-bold">{f.budgetType === "FIXED" ? "To ($)" : "To ($/hour)"}<input inputMode="numeric" value={f.budgetMax ?? ""} onChange={(e) => set({ budgetMax: e.target.value ? Number(e.target.value.replace(/[^0-9.]/g, "")) : null })} className={FIELD} /></label>
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
                {matches.filter((m) => !m.hidden && (showOutside || !m.outside)).map((m) => (
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
                    <div className="flex flex-col items-end gap-1 text-right text-[13px]">
                      {m.rate && <b className="block">{m.rate}</b>}
                      <Link href={`/hire/terms?job=${jobId}&provider=${m.personId}`} data-hire-provider className="inline-flex min-h-9 items-center bg-ink px-4 text-[13px] font-bold text-surface hover:bg-ink-hover">Hire</Link>
                      <Link href={`/providers/${m.profileId}?from=matches`} className="font-semibold text-magenta-dark underline underline-offset-4">View profile</Link>
                      <button type="button" onClick={() => hide(m.personId, true)} className="text-[12.5px] text-ink-3 underline underline-offset-4 hover:text-ink" data-hide-match aria-label={`Hide ${m.name}`}>Hide ×</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {matches.some((m) => m.hidden) && (
              <div className="mt-3 text-[13.5px]" data-hidden-matches>
                <button type="button" onClick={() => setShowHidden((v) => !v)} className="font-semibold text-ink-2 underline underline-offset-4">{`Show hidden (${matches.filter((m) => m.hidden).length})`}</button>
                {showHidden && (
                  <ul className="mt-1">
                    {matches.filter((m) => m.hidden).map((m) => <li key={m.personId} className="flex items-center gap-3 py-1">{m.name} <button type="button" onClick={() => hide(m.personId, false)} className="font-semibold text-magenta-dark underline underline-offset-4">Restore</button></li>)}
                  </ul>
                )}
              </div>
            )}
            {matches.some((m) => m.outside) && (
              <button type="button" onClick={() => setShowOutside((v) => !v)} className="mt-3 text-[13.5px] font-semibold text-magenta-dark underline underline-offset-4" data-show-outside>
                {showOutside ? `Hide providers outside ${f.state.toUpperCase()}` : `Show providers outside ${f.state.toUpperCase()} (${matches.filter((m) => m.outside).length})`}
              </button>
            )}
            {matches.length > 0 && (
              <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center gap-3 border-t border-line bg-white py-3" data-proposals-bar>
                <button type="button" className={BTN} disabled={busy || !picked.size || sent != null} onClick={request} data-request-proposals>{sent != null ? "Requests Sent" : `Request Proposals from ${picked.size}`}</button>
                <span className="text-[13px] text-ink-2">Tick who should propose — or Hire one directly.</span>
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
