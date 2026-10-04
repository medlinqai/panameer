"use client";

import { useEffect, useRef, useState } from "react";
import type { RerunDiff } from "@/lib/resume/rerun-diff";

export function ResumeImportAction({
  onApplied,
  label = "Import from résumé",
  showContext = false,
  autoStart = false,
  reuseStored = false,
  emptyFallback,
}: {
  onApplied: (body: {
    added?: { skills: number; specializations: number };
    removed?: { employers: number; projects: number };
    applied?: Record<string, unknown>;
  }) => void;
  label?: string;
  showContext?: boolean;
  autoStart?: boolean;
  reuseStored?: boolean;
  emptyFallback?: React.ReactNode;
}) {
  const [info, setInfo] = useState<{
    available: boolean;
    hasDocument: boolean;
    documentName: string | null;
    lastParseAt: string | null;
  } | null>(null);
  const [stage, setStage] = useState<
    "idle" | "confirm" | "reading" | "review" | "saving"
  >("idle");
  const [diff, setDiff] = useState<RerunDiff | null>(null);
  const [dropEmployers, setDropEmployers] = useState<Set<string>>(new Set());
  const [dropProjects, setDropProjects] = useState<Set<string>>(new Set());
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [tickedSpecs, setTickedSpecs] = useState<Set<string>>(new Set());
  const [tickedRest, setTickedRest] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    let live = true;
    fetch("/api/onboarding/provider/resume-ai/available")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setInfo(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const preview = async () => {
    setStage("reading");
    setError(null);
    try {
      const r = await fetch("/api/onboarding/provider/resume-ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "preview", reuseStored: Boolean(reuseStored) }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "That didn't work — nothing was changed.");
        setStage("idle");
        return;
      }
      const d = body.diff as RerunDiff;
      setDiff(d);
      setTicked(new Set(d.skills.added.map((s) => s.id)));
      setTickedSpecs(new Set(d.specializations.added.map((s) => s.id)));
      setTickedRest(true);
      setStage("review");
    } catch {
      setError("That didn't work — nothing was changed.");
      setStage("idle");
    }
  };

  useEffect(() => {
    if (!autoStart || startedRef.current) return;
    if (!info?.available || !info.hasDocument) return;
    startedRef.current = true;
    queueMicrotask(() => void preview());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, info]);

  if (info && (!info.available || !info.hasDocument)) {
    return emptyFallback ? <>{emptyFallback}</> : null;
  }
  if (!info?.available || !info.hasDocument) return null;

  const apply = async () => {
    setStage("saving");
    try {
      const r = await fetch("/api/onboarding/provider/resume-ai/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skillIds: [...ticked],
          specializationIds: [...tickedSpecs],
          rest: tickedRest,
          removeEmployerIds: [...dropEmployers],
          removeProjectIds: [...dropProjects],
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "That didn't save.");
        setStage("review");
        return;
      }
      const a = body.added ?? { skills: 0, specializations: 0 };
      const ap = (body.applied ?? {}) as Record<string, number | boolean>;
      const n = (k: string) => (typeof ap[k] === "number" ? (ap[k] as number) : 0);
      const parts: string[] = [];
      if (a.skills > 0) parts.push(`${a.skills} skill${a.skills === 1 ? "" : "s"}`);
      if (a.specializations > 0)
        parts.push(
          `${a.specializations} specialization${a.specializations === 1 ? "" : "s"}`
        );
      const extraSkills = n("skillsMatched");
      if (extraSkills > 0)
        parts.push(`${extraSkills} from your certificates`);
      if (n("experiences") > 0) parts.push(`${n("experiences")} work entries`);
      const projects = n("projectsAttached") + n("projectsUnattached");
      if (projects > 0) parts.push(`${projects} projects`);
      if (n("education") > 0) parts.push(`${n("education")} education entries`);
      if (n("certifications") > 0)
        parts.push(`${n("certifications")} certifications`);
      if (n("languages") > 0) parts.push(`${n("languages")} languages`);
      if (ap.headline === true) parts.push("a title");
      if (ap.overview === true) parts.push("an overview");
      /*
        ── ⚠⚠⚠ REMOVALS ARE REPORTED SEPARATELY, NEVER FOLDED INTO "ADDED" ───
        ⚠ `P2-A1.1-E740` A2. ⚠⚠ **A RECEIPT THAT SAYS *"Added 3 skills"* AFTER
        DELETING TWO JOBS IS A TRUE SENTENCE THAT LEAVES OUT THE ONLY PART THE
        MEMBER MIGHT WANT BACK.** The destructive half gets its own clause and
        its own verb. ⚠ Counted from the server's measured delete, not the tick.
      */
      const rm = body.removed ?? { employers: 0, projects: 0 };
      const removedParts: string[] = [];
      if (rm.employers > 0)
        removedParts.push(`${rm.employers} job${rm.employers === 1 ? "" : "s"}`);
      if (rm.projects > 0)
        removedParts.push(`${rm.projects} project${rm.projects === 1 ? "" : "s"}`);
      const sentences = [
        parts.length > 0 ? `Added ${parts.join(" · ")}.` : null,
        removedParts.length > 0 ? `Removed ${removedParts.join(" · ")}.` : null,
      ].filter(Boolean);
      setResult(sentences.length > 0 ? sentences.join(" ") : "Nothing changed.");
      setStage("idle");
      onApplied(body);
    } catch {
      setError("That didn't save.");
      setStage("review");
    }
  };

  if (result) {
    return <span className="text-[13px] font-semibold text-emerald-700">✓ {result}</span>;
  }

  const toggle = (
    set: Set<string>,
    setter: (s: Set<string>) => void,
    id: string
  ) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  if ((stage === "review" || stage === "saving") && diff) {
    const d = diff;
    return (
      <div className="mt-3 w-full rounded-brand border border-line bg-white p-4 text-[13.5px]">
        <p className="font-bold text-ink">What we found</p>

        {d.skills.added.length === 0 && d.specializations.added.length === 0 ? (
          <p className="mt-2 text-ink-2">
            Nothing new — your profile already covers what the résumé mentions.
          </p>
        ) : (
          <>
            {d.skills.added.length > 0 && (
              <div className="mt-3">
                <p className="text-[12px] font-bold uppercase tracking-wide text-ink-2">
                  New skills
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {d.skills.added.map((s) => (
                    <li key={s.id} className="flex items-start gap-2">
                      <input
                        id={`sk-${s.id}`}
                        type="checkbox"
                        checked={ticked.has(s.id)}
                        onChange={() => toggle(ticked, setTicked, s.id)}
                        className="mt-0.5"
                      />
                      <label htmlFor={`sk-${s.id}`} className="min-w-0">
                        {s.name}
                        {/*
                          ⚠⚠⚠ THE SILENT NO-OP, SAID OUT LOUD. `E517` filters what
                          is OFFERED, not what is HELD — a skill outside the
                          provider's chosen roles is saved and never rendered.
                          ⚠ Saying "added" and showing nothing afterwards is a lie
                          by omission, so it is said BEFORE the tick.
                        */}
                        {!s.shown && (
                          <span className="block text-[12px] text-ink-2">
                            Saved, but not shown on your profile — it sits outside
                            the roles you picked.{" "}
                            <a
                              href="/join/provider?step=role&return=review"
                              className="font-semibold text-magenta hover:underline"
                            >
                              Change your roles
                            </a>
                          </span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {d.specializations.added.length > 0 && (
              <div className="mt-3">
                <p className="text-[12px] font-bold uppercase tracking-wide text-ink-2">
                  New specializations
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {d.specializations.added.map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <input
                        id={`sp-${s.id}`}
                        type="checkbox"
                        checked={tickedSpecs.has(s.id)}
                        onChange={() => toggle(tickedSpecs, setTickedSpecs, s.id)}
                      />
                      <label htmlFor={`sp-${s.id}`}>{s.name}</label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* ⚠⚠ INFORMATION ONLY — NO CHECKBOX, NO REMOVE, EVER. */}
        {d.skills.noLongerMentioned.length > 0 && (
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-[12px] font-bold uppercase tracking-wide text-ink-2">
              On your profile, not in this résumé
            </p>
            <p className="mt-1 text-[12.5px] text-ink-2">
              Nothing is removed. Listed so you know what the reader did not see.
            </p>
            {/* ⚠ `E433` — names are facts, so ink. */}
            <p className="mt-1.5 text-ink-2">
              {d.skills.noLongerMentioned.map((s) => s.name).join(" · ")}
            </p>
          </div>
        )}

        {/*
          ── ⚠⚠⚠ "ON YOUR PROFILE BUT NOT IN THIS RÉSUMÉ" (`P2-A1.1-E740`, A2) ──

          ⚠ SCOTT, super run 2026-09-30 item 6: *"Each row is unticked by
          default; only ticked rows are removed on save."*

          ⚠⚠ **IT IS THE ONLY DESTRUCTIVE CONTROL IN THIS PANEL**, so it says
          what each tick costs ON THE ROW rather than in a footnote. ⚠⚠⚠ A
          checkbox beside a job, with the consequences a scroll away, is how
          somebody deletes work history they meant to keep.
          ⚠ **THE HEADING DOES NOT SAY "MISSING" OR "OUTDATED".** A résumé that
          stops mentioning a job is not evidence the job did not happen — the
          same rule `noLongerMentioned` states for skills.
        */}
        {(d.onProfileNotInResume.employers.length > 0 ||
          d.onProfileNotInResume.projects.length > 0) && (
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-[12px] font-bold uppercase tracking-wide text-ink-2">
              On your profile but not in this résumé
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
              Nothing here is removed unless you tick it. Leaving a row alone
              keeps it exactly as it is.
            </p>

            {d.onProfileNotInResume.employers.map((e) => (
              <label key={e.id} className="mt-2.5 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={dropEmployers.has(e.id)}
                  onChange={() =>
                    setDropEmployers((prev) => {
                      const next = new Set(prev);
                      if (next.has(e.id)) next.delete(e.id);
                      else next.add(e.id);
                      return next;
                    })
                  }
                  className="mt-0.5"
                />
                <span>
                  <span className="text-[13px] font-semibold text-ink">
                    {[e.name, e.roleTitle].filter(Boolean).join(" — ") || "Untitled job"}
                  </span>
                  {/* ⚠⚠ THE CONSEQUENCES, FROM THE SCHEMA, NOT FROM A GUESS:
                      `Project.employer_id` is `SetNull` (orphaned, kept) and
                      `JobSkill.employer_id` is `Cascade` (deleted). ⚠⚠⚠ THE
                      ORPHAN WARNING IS THE LOAD-BEARING HALF — `E307` measured
                      that an orphaned project stays in the database but becomes
                      INVISIBLE, because `listEmployers` only reaches projects
                      through their employer. */}
                  {(e.projectCount > 0 || e.jobSkillCount > 0) && (
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-3">
                      {[
                        e.projectCount > 0 &&
                          `${e.projectCount} project${e.projectCount === 1 ? "" : "s"} under it would be kept but no longer shown anywhere`,
                        e.jobSkillCount > 0 &&
                          `${e.jobSkillCount} skill link${e.jobSkillCount === 1 ? "" : "s"} would be removed (you keep the skills, not the years from this job)`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                </span>
              </label>
            ))}

            {d.onProfileNotInResume.projects.map((pr) => (
              <label key={pr.id} className="mt-2.5 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={dropProjects.has(pr.id)}
                  onChange={() =>
                    setDropProjects((prev) => {
                      const next = new Set(prev);
                      if (next.has(pr.id)) next.delete(pr.id);
                      else next.add(pr.id);
                      return next;
                    })
                  }
                  className="mt-0.5"
                />
                <span>
                  <span className="text-[13px] font-semibold text-ink">{pr.name}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-3">
                    {[
                      pr.clientName ? `Client: ${pr.clientName}` : null,
                      "This project would be deleted",
                      pr.jobSkillCount > 0
                        ? `${pr.jobSkillCount} skill link${pr.jobSkillCount === 1 ? "" : "s"} would go with it`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        {/* ⚠ The categories this route does NOT write, shown so nothing about the
            re-run is a surprise. ⚠⚠ "yours is empty", never "will replace" —
            headline and overview are only ever written when empty. */}
        {(d.other.headlineWillFill ||
          d.other.overviewWillFill ||
          d.other.employers > 0 ||
          d.other.education > 0 ||
          d.other.certifications > 0) && (
          <div className="mt-3 border-t border-line pt-3">
            {/*
              ⚠⚠ IT IS APPLIED NOW, AND IT IS ONE TICK. ⚠ SUPERSEDED, quoted not
              deleted (`E164`): *"Also in the résumé — not applied here"* and
              *"This update covers skills and specializations only."*
              ⚠⚠⚠ GROUPED BECAUSE THE DATA IS COUPLED, not to save a checkbox:
              projects attach to employers created in the same write, and a
              certificate's title feeds the skill match. Splitting the tick would
              mean editing the writer, which the brief forbids.
            */}
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={tickedRest}
                onChange={() => setTickedRest((v) => !v)}
                className="mt-0.5"
              />
              <span>
                <span className="text-[12px] font-bold uppercase tracking-wide text-ink-2">
                  Also add the rest
                </span>
                <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-2">
              {[
                d.other.headlineWillFill && "a title (yours is empty)",
                d.other.overviewWillFill && "an overview (yours is empty)",
                d.other.employers > 0 && `${d.other.employers} work entries`,
                d.other.education > 0 && `${d.other.education} education entries`,
                d.other.certifications > 0 &&
                  `${d.other.certifications} certifications`,
              ]
                .filter(Boolean)
                .join(" · ")}
                  . Untick to add only the skills above.
                </span>
              </span>
            </label>
          </div>
        )}

        {error && <p className="mt-3 text-[13px] text-magenta-ink">{error}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={apply}
            disabled={stage === "saving"}
            aria-busy={stage === "saving"}
            className="bg-ink px-4 py-1.5 font-semibold text-surface transition-colors hover:bg-ink-hover disabled:opacity-60"
          >
            {stage === "saving" ? "Saving…" : "Add Ticked"}
          </button>
          {stage !== "saving" && (
            <button
              type="button"
              onClick={() => {
                setStage("idle");
                setDiff(null);
              }}
              className="font-semibold text-ink-2 underline underline-offset-4 hover:text-magenta"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  const trigger = (
    <button
      type="button"
      onClick={() => setStage("confirm")}
      className="text-[13px] font-bold text-magenta transition-colors hover:text-magenta-dark"
    >
      ↻ {label}
    </button>
  );

  if (stage === "confirm" || stage === "reading") {
    return (
      <span className="flex flex-wrap items-center gap-2 text-[13px]">
        {/*
          ── ⚠⚠⚠ NO SILENT WAIT (`P2-ALL-E782`, Scott) ──────────────────────────
          ⚠ **MEASURED: a whole read of this CV took 64.5 s.** A spinner labelled
          *"Reading…"* beside an unchanged sentence is not enough at that length —
          it is the same silence the upload had.
          ⚠⚠ **THE MINUTE IS NAMED**, so a wait that long reads as expected rather
          than as broken. ⚠ It says "about a minute" and not a countdown: the
          measured range is 25–70 s and a precise number we cannot keep would be
          worse than an honest approximation.
        */}
        <span className="text-ink-2">
          {stage === "reading" ? (
            <>
              Reading your résumé… <b className="text-ink">this takes about a minute.</b>
            </>
          ) : (
            <>
              Read <b className="text-ink">{info.documentName}</b> again? We&apos;ll
              show you what changed before anything is saved.
            </>
          )}
        </span>
        <button
          type="button"
          onClick={preview}
          disabled={stage === "reading"}
          aria-busy={stage === "reading"}
          className="inline-flex items-center gap-2 bg-ink px-4 py-1.5 font-semibold text-surface transition-colors hover:bg-ink-hover disabled:opacity-60"
        >
          {stage === "reading" && (
            <span
              aria-hidden
              className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/35 border-t-white"
            />
          )}
          {stage === "reading" ? "Reading…" : "Yes, read it"}
        </button>
        {/* Cancel disappears mid-run: it never aborted the request, and offering
            an out that does nothing during the one wait that needs patience is
            worse than offering none (WS8/E142). */}
        {stage !== "reading" && (
          <button
            type="button"
            onClick={() => setStage("idle")}
            className="font-semibold text-ink-2 underline underline-offset-4 hover:text-magenta"
          >
            Cancel
          </button>
        )}
      </span>
    );
  }

  if (!showContext) return trigger;

  return (
    <div className="mt-4 border-t border-amber-400/25 pt-3">
      <p className="text-[13.5px] font-semibold text-ink">Read your résumé again</p>
      {/*
        ⚠⚠ THE BRIEF'S SENTENCE, AND IT IS TRUE NOW. WS-A deliberately did NOT
        ship this line, because the flow applied on a single blind confirm.
        ⚠ It proposes first, nothing is written until a tick, and the receipt
        reports what was actually written — so the promise is kept.
      */}
      <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
        You approve every change.
        {info.lastParseAt && <> Last read {formatWhen(info.lastParseAt)}.</>}
      </p>
      <div className="mt-2">{trigger}</div>
    </div>
  );
}

/** ⚠ A date, not a countdown — "8 months ago" is what makes the offer land. */
function formatWhen(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 18) return `${months} month${months === 1 ? "" : "s"} ago`;
  return `${Math.round(months / 12)} years ago`;
}
