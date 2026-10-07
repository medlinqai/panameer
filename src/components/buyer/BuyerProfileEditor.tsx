"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PhotoUpload } from "@/components/PhotoUpload";
import { FillFromResume } from "@/components/buyer/FillFromResume";
import type { BuyerProfileView, EduItem, WorkItem } from "@/lib/buyer-profile";

// The buyer's own profile: photo, title, company, overview, work history, education, languages, location. No gate.
const INPUT = "h-[38px] w-full border border-line bg-surface px-2 text-[14px]";
const LABEL = "block text-[11px] font-bold tracking-[0.08em] text-ink-3";

export function BuyerProfileEditor({ initial, firstName, lastName }: { initial: BuyerProfileView; firstName: string; lastName: string }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [title, setTitle] = useState(initial.title ?? "");
  const [overview, setOverview] = useState(initial.overview ?? "");
  const [work, setWork] = useState<WorkItem[]>(initial.workHistory);
  const [edu, setEdu] = useState<EduItem[]>(initial.education);
  const [langs, setLangs] = useState(initial.languages.join(", "));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const load = (v: BuyerProfileView) => {
    setP(v);
    setTitle(v.title ?? "");
    setOverview(v.overview ?? "");
    setWork(v.workHistory);
    setEdu(v.education);
    setLangs(v.languages.join(", "));
  };
  const save = async () => {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/buyer/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, overview, workHistory: work, education: edu, languages: langs.split(",").map((l) => l.trim()).filter(Boolean) }) }).catch(() => null);
    const b = (await r?.json().catch(() => null)) as { profile?: BuyerProfileView; error?: string } | null;
    setBusy(false);
    if (!r?.ok || !b?.profile) return setMsg({ ok: false, text: b?.error ?? "That didn't save." });
    load(b.profile);
    setMsg({ ok: true, text: "Saved." });
    router.refresh();
  };
  const setW = (i: number, patch: Partial<WorkItem>) => setWork(work.map((w, k) => (k === i ? { ...w, ...patch } : w)));
  const setE = (i: number, patch: Partial<EduItem>) => setEdu(edu.map((e, k) => (k === i ? { ...e, ...patch } : e)));
  return (
    <div data-buyer-profile className="mx-auto w-full max-w-[860px] pb-14">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">BUYER PROFILE</p>
      <h1 className="mt-1 text-[28px] font-bold">{p.name || "Your profile"}</h1>
      {p.looksComplete ? (
        <p data-looks-complete className="mt-2 inline-block border-l-2 border-ink py-1 pl-3 text-[13.5px] font-semibold">✓ Profile looks complete</p>
      ) : (
        <p data-profile-hint className="mt-2 text-[13.5px] text-ink-2">Providers trust a real profile. Add {p.missing.join(", ")} — it never stops you posting work.</p>
      )}
      <FillFromResume className="mt-4" onFilled={(v) => { load(v); router.refresh(); }} />

      <div className="mt-6 grid gap-5 sm:grid-cols-[140px_1fr]">
        <PhotoUpload firstName={firstName} lastName={lastName} photoUrl={p.photoUrl} onChange={(url) => { setP({ ...p, photoUrl: url }); router.refresh(); }} size={120} />
        <div className="space-y-3">
          <label className={LABEL}>TITLE<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Procurement Director" className={INPUT + " mt-1 font-normal tracking-normal"} /></label>
          <p className="text-[13.5px]">
            <span className={LABEL + " inline"}>COMPANY </span>
            {p.company ? <Link href={`/companies/${p.company.id}`} className="font-semibold underline">{p.company.name}</Link> : <Link href="/company?join=1#join" className="font-semibold text-magenta-dark underline">Add your company</Link>}
            {p.location && <span className="text-ink-2"> · {p.location}</span>}
          </p>
        </div>
      </div>

      <label className={LABEL + " mt-5"}>OVERVIEW<textarea value={overview} onChange={(e) => setOverview(e.target.value)} rows={5} placeholder="What you buy, the systems you run, what good looks like for your team." className="mt-1 w-full border border-line p-2 text-[14px] font-normal tracking-normal" /></label>

      <section className="mt-6">
        <p className="flex items-center justify-between text-[16px] font-bold">Work History <button type="button" onClick={() => setWork([...work, { employer: "", title: null, start: null, end: null }])} className="text-[13px] font-bold text-magenta-dark">+ Add a Job</button></p>
        {work.length === 0 && <p className="mt-1 text-[13px] text-ink-3">None yet.</p>}
        {work.map((w, i) => (
          <div key={i} className="mt-2 grid gap-2 border-b border-line pb-2 sm:grid-cols-[1fr_1fr_110px_110px_auto]">
            <input value={w.employer} onChange={(e) => setW(i, { employer: e.target.value })} placeholder="Employer" aria-label="Employer" className={INPUT} />
            <input value={w.title ?? ""} onChange={(e) => setW(i, { title: e.target.value || null })} placeholder="Title" aria-label="Title" className={INPUT} />
            <input value={w.start?.slice(0, 7) ?? ""} onChange={(e) => setW(i, { start: e.target.value || null })} placeholder="From YYYY-MM" aria-label="From" className={INPUT} />
            <input value={w.end?.slice(0, 7) ?? ""} onChange={(e) => setW(i, { end: e.target.value || null })} placeholder="To (blank = now)" aria-label="To" className={INPUT} />
            <button type="button" aria-label="Remove job" onClick={() => setWork(work.filter((_, k) => k !== i))} className="px-2 text-ink-3 hover:text-magenta">✕</button>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <p className="flex items-center justify-between text-[16px] font-bold">Education <button type="button" onClick={() => setEdu([...edu, { institution: "", degree: null, year: null }])} className="text-[13px] font-bold text-magenta-dark">+ Add a School</button></p>
        {edu.length === 0 && <p className="mt-1 text-[13px] text-ink-3">None yet.</p>}
        {edu.map((e, i) => (
          <div key={i} className="mt-2 grid gap-2 border-b border-line pb-2 sm:grid-cols-[1fr_1fr_100px_auto]">
            <input value={e.institution} onChange={(ev) => setE(i, { institution: ev.target.value })} placeholder="School" aria-label="School" className={INPUT} />
            <input value={e.degree ?? ""} onChange={(ev) => setE(i, { degree: ev.target.value || null })} placeholder="Degree" aria-label="Degree" className={INPUT} />
            <input value={e.year ?? ""} onChange={(ev) => setE(i, { year: Number(ev.target.value) || null })} placeholder="Year" aria-label="Year" inputMode="numeric" className={INPUT} />
            <button type="button" aria-label="Remove school" onClick={() => setEdu(edu.filter((_, k) => k !== i))} className="px-2 text-ink-3 hover:text-magenta">✕</button>
          </div>
        ))}
      </section>

      <label className={LABEL + " mt-6"}>LANGUAGES<input value={langs} onChange={(e) => setLangs(e.target.value)} placeholder="English, Spanish" className={INPUT + " mt-1 font-normal tracking-normal"} /></label>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button type="button" data-save-buyer-profile disabled={busy} onClick={save} className="inline-flex min-h-[44px] items-center bg-ink px-5 text-[14px] font-bold text-surface hover:bg-ink-hover disabled:opacity-50">{busy ? "Saving…" : "Save Profile"}</button>
        <Link href="/create-work" className="text-[13.5px] font-bold text-magenta-dark underline">Post Work</Link>
        {msg && <span role="status" className={"text-[13px] " + (msg.ok ? "text-ink-2" : "font-semibold text-magenta-dark")}>{msg.text}</span>}
      </div>
    </div>
  );
}
