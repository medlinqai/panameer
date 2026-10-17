"use client";

import { useCallback, useEffect, useState } from "react";
import { ResumeDropzone } from "@/components/onboarding/ResumeDropzone";
import { WhatYouDoModes } from "@/components/catalog/WhatYouDoModes";
import { roleLong } from "@/lib/role-labels";

// RF-E002: Stop 1 "Build your profile from your résumé" — upload (or Skip for Now), then the same page shows what was read:
// Kind of Work & Skills (open first, with How you work · for all of these) · Employers · Projects · Certifications · Education.
// Lists are compact; Edit / + Add open the existing My Profile editors in a new tab and the page re-reads on return.
type Role = { id: string; name: string; display?: string };
type Status = {
  imports?: { id: string; status: string }[];
  profile?: {
    roleTypeIds?: string[]; derivedRoleTypeIds?: string[];
    skillNames?: { id: string; name: string; roleTypeId?: string | null }[];
    employers?: { id: string; name: string; roleTitle: string | null; startDate: string | null; endDate: string | null; isCurrent: boolean }[];
    projects?: { id: string; name: string; startDate: string | null; endDate: string | null; clientName?: string }[];
    certifications?: { id: string; name: string; issuer: string | null; year: number | null }[];
    education?: { institution: string; degree: string | null; field: string | null; endYear?: number | null; year?: number | null }[];
  };
};
const yr = (d: string | null | undefined) => (d ? d.slice(0, 4) : "");
const span = (a: string | null, b: string | null, current?: boolean) => (a ? `${yr(a)} – ${current ? "Present" : yr(b) || "?"}` : "");
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function ResumeFirst({ hasResume, onState }: { hasResume: boolean; onState: (s: { canContinue: boolean; skipped: boolean }) => void }) {
  const [st, setSt] = useState<Status | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [read, setRead] = useState(hasResume);
  const [skipped, setSkipped] = useState(false);
  const [upload, setUpload] = useState(!hasResume);
  const [open, setOpen] = useState<string>("work");
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const s: Status | null = await fetch("/api/onboarding/status").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!s) return;
    setSt(s);
    setPicked(s.profile?.roleTypeIds ?? []);
  }, []);
  useEffect(() => {
    fetch("/api/onboarding/status").then((r) => (r.ok ? r.json() : null)).then((s: Status | null) => { if (s) { setSt(s); setPicked(s.profile?.roleTypeIds ?? []); } }).catch(() => {});
    fetch("/api/catalog/fields").then((r) => (r.ok ? r.json() : { roles: [] })).then((d) => setRoles(d.roles ?? [])).catch(() => {});
    // Edits happen in My Profile (a new tab); coming back re-reads.
    const back = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [refresh]);

  useEffect(() => { onState({ canContinue: (read || skipped) && picked.length > 0, skipped }); }, [read, skipped, picked, onState]);

  const saveRoles = async (ids: string[]) => {
    setPicked(ids);
    setMsg(null);
    const r = await fetch("/api/onboarding/provider/step", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "roles", data: { roleTypeIds: ids, roleTypeId: ids[0] ?? null } }) }).catch(() => null);
    if (!r?.ok && ids.length) setMsg(((await r?.json().catch(() => ({}))) as { error?: string })?.error ?? "That didn't save.");
  };

  const p = st?.profile ?? {};
  const employers = p.employers ?? [];
  const projects = p.projects ?? [];
  const certs = p.certifications ?? [];
  const schools = p.education ?? [];
  const skills = p.skillNames ?? [];
  const derived = new Set(p.derivedRoleTypeIds ?? []);

  if (upload && !skipped) {
    return (
      <section className="mx-auto max-w-2xl" data-resume-upload>
        <ResumeDropzone onImported={async () => { setRead(true); setUpload(false); await refresh(); }} />
        <button type="button" onClick={() => { setSkipped(true); setUpload(false); }} className="mt-3 text-[14px] font-semibold text-magenta-dark underline underline-offset-4" data-skip-resume>Skip for Now</button>
        <span className="ml-2 text-[13px] text-ink-2">(fill it in by hand)</span>
      </section>
    );
  }

  const section = (key: string, title: string, count: string, body: React.ReactNode) => (
    <section key={key} data-resume-section={key} className="border-b border-line">
      <button type="button" onClick={() => setOpen((v) => (v === key ? "" : key))} aria-expanded={open === key} className="flex w-full items-center justify-between gap-3 py-3 text-left">
        <span className="text-[16px] font-bold">{title}</span>
        <span className="text-[13px] text-ink-2">{count} {open === key ? "▲" : "▼"}</span>
      </button>
      {open === key && <div className="pb-4">{body}</div>}
    </section>
  );
  const list = (rows: { k: string; main: string; sub: string }[], edit: string, empty: string) => (
    <>
      {rows.length ? (
        <ul>{rows.map((r) => <li key={r.k} className="flex flex-wrap justify-between gap-2 border-b border-[#ECEEF4] py-1.5 text-[14.5px] last:border-0"><span className="font-semibold">{r.main}</span><span className="text-[13px] text-ink-2">{r.sub}</span></li>)}</ul>
      ) : (
        <p className="text-[14px] text-ink-3">{empty}</p>
      )}
      <p className="mt-2 flex gap-4 text-[13.5px] font-semibold">
        <a href={`/profile/edit/${edit}`} target="_blank" rel="noreferrer" className="text-magenta-dark underline underline-offset-4">Edit</a>
        <a href={`/profile/edit/${edit}`} target="_blank" rel="noreferrer" className="text-magenta-dark underline underline-offset-4">+ Add</a>
      </p>
    </>
  );

  return (
    <div className="mx-auto w-full max-w-3xl" data-resume-first>
      {read && (
        <p className="mb-3 text-[14.5px]" data-resume-summary>
          <b>We read your résumé</b> · {plural(employers.length, "employer")} · {plural(projects.length, "project")} · {plural(certs.length, "certification")} · {plural(schools.length, "school")} · {plural(skills.length, "skill")}
        </p>
      )}
      {section("work", "Kind of Work & Skills", picked.length ? plural(picked.length, "kind") : "pick at least one", (
        <div className="space-y-3">
          <WhatYouDoModes skills={[]} isAdmin={false} onSkip={() => {}} allOnly legend="How you work · for all of these" />
          <p className="text-[14px] font-bold">What kind of work do you do?</p>
          <div className="border-t border-line" data-kind-of-work>
            {roles.map((r) => {
              const on = picked.includes(r.id);
              return (
                <label key={r.id} className="flex cursor-pointer items-start gap-3 border-b border-line px-1 py-2.5">
                  <input type="checkbox" checked={on} onChange={() => void saveRoles(on ? picked.filter((x) => x !== r.id) : [...picked, r.id])} className="mt-1 h-4 w-4 accent-[var(--color-ink,#272334)]" />
                  <span className="min-w-0">
                    <span className="text-[15px] font-bold">{roleLong(`${(r.display || r.name).replace(/\s*Roles\s*$/i, "")} Roles`)}</span>
                    {on && derived.has(r.id) && <span className="ml-2 border border-line px-1.5 py-px text-[11px] font-semibold text-ink-2">from your résumé</span>}
                    {on && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {skills.filter((k) => k.roleTypeId === r.id).map((k) => <span key={k.id} className="border border-line bg-bg-soft px-1.5 py-0.5 text-[12.5px]">{k.name}</span>)}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
          {msg && <p role="alert" className="text-[13px] font-semibold text-magenta-dark">{msg}</p>}
        </div>
      ))}
      {section("employers", "Employers", String(employers.length), list(employers.map((e) => ({ k: e.id, main: e.name, sub: [e.roleTitle, span(e.startDate, e.endDate, e.isCurrent)].filter(Boolean).join(" · ") })), "work-history", "None yet."))}
      {section("projects", "Projects", String(projects.length), list(projects.map((x) => ({ k: x.id, main: x.name, sub: [x.clientName, span(x.startDate, x.endDate)].filter(Boolean).join(" · ") })), "solo-projects", "None yet."))}
      {section("certs", "Certifications", String(certs.length), list(certs.map((c) => ({ k: c.id, main: c.name, sub: [c.issuer, c.year].filter(Boolean).join(" · ") })), "certifications", "None yet."))}
      {section("edu", "Education", String(schools.length), list(schools.map((e, i) => ({ k: `${e.institution}-${i}`, main: e.institution, sub: [e.degree, e.field, e.endYear ?? e.year].filter(Boolean).join(" · ") })), "education", "None yet."))}
      <p className="mt-4 text-[13.5px] text-ink-2">
        Something wrong? Fix it here or later in My Profile.{" "}
        <button type="button" onClick={() => { setSkipped(false); setUpload(true); }} className="font-semibold text-magenta-dark underline underline-offset-4">Upload a different résumé</button>
      </p>
    </div>
  );
}
