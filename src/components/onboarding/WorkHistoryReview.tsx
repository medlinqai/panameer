"use client";

import { useMemo, useState } from "react";
import type { SoftwareSuite } from "@prisma/client";
import { SUITES, SUITE_ORDER, suiteLabel } from "@/lib/suite";

/**
 * THE WORK-HISTORY REVIEW (brief_per_job_skill_model WS-4).
 *
 * Replaces the standalone Role and Skills steps. The résumé arrives already
 * broken into jobs, each pre-tagged with the suite it ran on, the role that
 * implies and the modules used — and the provider's job here is to SCAN AND
 * CORRECT, not to fill in a form.
 *
 * ── WHY THIS REPLACES TWO STEPS ──────────────────────────────────────────────
 *
 * The old flow asked "what is your role?" and then "which skills do you have?",
 * both at profile level, both in the abstract. A provider answering those is
 * being asked to summarise their own career into a checklist — and the answer
 * is unattributable: a profile-level "General Ledger" belongs to no system, so
 * nobody can tell Oracle's from PeopleSoft's. Here every answer is attached to
 * the engagement that evidences it, which is what makes it checkable.
 *
 * ── CORRECTION IS SURGICAL ───────────────────────────────────────────────────
 *
 * Each card edits only its own job. A provider who sees one mis-tagged
 * engagement fixes that engagement; nothing else in their history moves. The
 * correction affordance lives exactly where the data does, which is the whole
 * argument for the per-job model.
 *
 * ── THE PROMPT IS RARE BY CONSTRUCTION ───────────────────────────────────────
 *
 * "Which system was this?" renders only on jobs the parser flagged
 * `needsSuite` — modules found, no anchor. Most jobs never show it. A prompt on
 * every card would be a form again, and the provider would click through it.
 */

export type ReviewSkill = { id: string; name: string };

export type ReviewJob = {
  id: string;
  name: string;
  roleTitle: string | null;
  startDate: string | null;
  endDate: string | null;
  suite: SoftwareSuite | null;
  roleTypeId: string | null;
  skills: ReviewSkill[];
  needsSuite: boolean;
};

/** One job's pending corrections. Absent keys mean "untouched". */
export type JobPatch = {
  employerId: string;
  suite?: SoftwareSuite | null;
  roleTypeId?: string | null;
  skillIds?: string[];
};

function years(job: ReviewJob): string {
  const y = (d: string | null) => (d ? d.slice(0, 4) : null);
  const from = y(job.startDate);
  if (!from) return "Dates not read";
  return `${from} – ${y(job.endDate) ?? "present"}`;
}

export function WorkHistoryReview({
  jobs,
  roleOptions,
  skillOptionsForSuite,
  onChange,
}: {
  jobs: ReviewJob[];
  roleOptions: { id: string; name: string }[];
  /** Catalog modules available for a suite — the picker's source. */
  skillOptionsForSuite: (suite: SoftwareSuite | null) => ReviewSkill[];
  /** Called with the full pending patch set whenever anything changes. */
  onChange: (patches: JobPatch[]) => void;
}) {
  const [patches, setPatches] = useState<Record<string, JobPatch>>({});

  const view = useMemo(
    () =>
      jobs.map((j) => {
        const p = patches[j.id];
        return {
          ...j,
          suite: p && "suite" in p ? p.suite! : j.suite,
          roleTypeId: p && "roleTypeId" in p ? p.roleTypeId! : j.roleTypeId,
          skills:
            p?.skillIds
              ? p.skillIds
                  .map(
                    (id) =>
                      j.skills.find((s) => s.id === id) ??
                      skillOptionsForSuite(p.suite ?? j.suite).find((s) => s.id === id)
                  )
                  .filter((s): s is ReviewSkill => Boolean(s))
              : j.skills,
        };
      }),
    [jobs, patches, skillOptionsForSuite]
  );

  const patch = (id: string, next: Partial<JobPatch>) => {
    setPatches((prev) => {
      const merged = { ...prev, [id]: { ...prev[id], employerId: id, ...next } };
      onChange(Object.values(merged));
      return merged;
    });
  };

  if (jobs.length === 0) {
    return (
      <p className="rounded-[12px] border border-line bg-white/60 p-5 text-[15px] text-ink-2">
        No work history yet. Upload a résumé above and we&apos;ll lay out your
        jobs here, or add them by hand.
      </p>
    );
  }

  const unanchored = view.filter((j) => j.needsSuite && !j.suite).length;

  return (
    <div className="space-y-4">
      {unanchored > 0 && (
        /*
          Named as a small, finishable task. "3 issues" reads as a failure
          report on the provider's own CV; "we couldn't tell on 3 jobs" is the
          truth and puts the uncertainty where it belongs — on the reader.
        */
        <p className="rounded-[10px] bg-magenta/8 px-4 py-2.5 text-[14px] text-ink">
          We couldn&apos;t tell which system{" "}
          <b>{unanchored === 1 ? "one job" : `${unanchored} jobs`}</b> ran on.
          They&apos;re marked below.
        </p>
      )}

      {view.map((job) => {
        const options = skillOptionsForSuite(job.suite);
        const chosen = new Set(job.skills.map((s) => s.id));
        return (
          <section
            key={job.id}
            className="rounded-[14px] border border-line bg-white/70 p-5"
          >
            <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-[17px] font-bold text-ink">
                {job.roleTitle ? `${job.roleTitle} · ` : ""}
                {job.name}
              </h3>
              <span className="text-[13px] text-ink-2">{years(job)}</span>
            </header>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* SUITE — a badge that is also the control. */}
              <label className="sr-only" htmlFor={`suite-${job.id}`}>
                Software suite for {job.name}
              </label>
              <select
                id={`suite-${job.id}`}
                value={job.suite ?? ""}
                onChange={(e) =>
                  patch(job.id, {
                    suite: (e.target.value || null) as SoftwareSuite | null,
                    /*
                      Changing the suite invalidates the module chips: they were
                      that suite's rows. Cleared rather than re-mapped, because
                      silently swapping in another suite's same-named module is
                      the exact guess the model refuses to make.
                    */
                    skillIds: [],
                  })
                }
                className={
                  "rounded-full border px-3 py-1.5 text-[13.5px] font-bold " +
                  (job.suite
                    ? "border-magenta/30 bg-magenta/10 text-ink"
                    : "border-amber-400 bg-amber-50 text-amber-900")
                }
              >
                <option value="">Which system?</option>
                {SUITE_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {SUITES[s].label}
                  </option>
                ))}
              </select>

              {/* ROLE — derived, and overridable. */}
              <label className="sr-only" htmlFor={`role-${job.id}`}>
                Role for {job.name}
              </label>
              <select
                id={`role-${job.id}`}
                value={job.roleTypeId ?? ""}
                onChange={(e) => patch(job.id, { roleTypeId: e.target.value || null })}
                className="rounded-full border border-line bg-white px-3 py-1.5 text-[13.5px] text-ink-2"
              >
                <option value="">Role not set</option>
                {roleOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              {job.suite && (
                <span className="text-[13px] text-ink-2">
                  {suiteLabel(job.suite)} · {job.skills.length}{" "}
                  {job.skills.length === 1 ? "module" : "modules"}
                </span>
              )}
            </div>

            {/* MODULE CHIPS — removable. */}
            <ul className="mt-3 flex flex-wrap gap-2">
              {job.skills.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() =>
                      patch(job.id, {
                        skillIds: job.skills.filter((x) => x.id !== s.id).map((x) => x.id),
                      })
                    }
                    className="rounded-full border border-line bg-white px-3 py-1 text-[13px] text-ink hover:border-magenta"
                    aria-label={`Remove ${s.name} from ${job.name}`}
                  >
                    {s.name} <span aria-hidden>×</span>
                  </button>
                </li>
              ))}
              {job.skills.length === 0 && (
                <li className="text-[13px] text-ink-2">
                  {job.suite
                    ? "No modules on this job yet."
                    : "Pick the system first and we'll offer its modules."}
                </li>
              )}
            </ul>

            {/* ADD — only once the suite is known, so the list is the right one. */}
            {job.suite && options.length > 0 && (
              <div className="mt-3">
                <label className="sr-only" htmlFor={`add-${job.id}`}>
                  Add a module to {job.name}
                </label>
                <select
                  id={`add-${job.id}`}
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    patch(job.id, {
                      skillIds: [...job.skills.map((s) => s.id), e.target.value],
                    });
                  }}
                  className="rounded-[10px] border border-line bg-white px-3 py-1.5 text-[14px]"
                >
                  <option value="">+ Add a module…</option>
                  {options
                    .filter((o) => !chosen.has(o.id))
                    .slice(0, 200)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
