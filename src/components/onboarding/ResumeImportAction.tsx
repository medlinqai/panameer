"use client";

import { useEffect, useState } from "react";
import type { RerunDiff } from "@/lib/resume/rerun-diff";

/**
 * "Import from résumé" / "Update from my résumé" (`E132`, re-shaped by `E561`).
 *
 * The AI pass used to appear ONLY when work history was empty. Eddie had a
 * single placeholder entry, so the offer vanished. A thin or wrong work history
 * is exactly when you most want the résumé re-read, so the offer can't be
 * conditioned on there being nothing there.
 *
 * Shown whenever a document is on file; renders nothing when there isn't one.
 *
 * ── ⚠⚠⚠ IT PROPOSES. IT DOES NOT APPLY (`P2-J14-E561` WS-B) ────────────────
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — what this did until 2026-09-19:
 * // A single confirm ("Read {doc} again? We'll add what's missing and leave
 * // what you have.") then POST, which APPLIED ALL NINE CATEGORIES IMMEDIATELY.
 * // The receipt read only `body.applied?.experiences` - "Added 3 entries." -
 * // while skills, specializations, education, certifications, languages,
 * // headline and overview had also been written and were never mentioned.
 *
 * ⚠⚠ THE PROVIDER APPROVED BLIND. The confirm promised *"we'll add what's
 * missing"* without saying WHAT, and the receipt named one of nine. ⚠⚠⚠ THAT IS
 * WHY WS-A COULD NOT SHIP *"you approve every change"* — it would have been a
 * promise the code did not keep. It ships here, because now it is true.
 *
 * ⚠ THE FLOW: confirm → PREVIEW (parse, write nothing) → the diff, ticked →
 * apply ONLY what was ticked → a receipt of what was actually written.
 * ⚠⚠ ONE PARSE, NOT TWO. The preview banks its result on the import row and the
 * apply route reads it back — `E546` measured a read at 25–70 s and
 * $0.004–0.008, so parsing twice would charge the provider for being asked.
 */
export function ResumeImportAction({
  onApplied,
  label = "Import from résumé",
  showContext = false,
}: {
  /**
   * ── ⚠⚠ THE CONTRACT IS THE FULL RECEIPT NOW (`E561` WS-B) ────────────────
   *
   * ⚠ SUPERSEDED, quoted not deleted (`E164`):
   * // onApplied: (body: { applied?: { experiences?: number } }) => void;
   *
   * ⚠⚠⚠ THE OLD TYPE ONLY ADMITTED ONE FIELD. The route has always returned the
   * whole `applied` shape — `skillsMatched`, `specializations`, `education`,
   * `certifications`, `languages` and the rest — and the CONTRACT threw eight of
   * them away at the boundary. ⚠ Widening the type is what makes a real receipt
   * possible; a copy change alone could never have reached the data.
   */
  onApplied: (body: {
    added?: { skills: number; specializations: number };
    applied?: Record<string, unknown>;
  }) => void;
  label?: string;
  /**
   * ⚠ Off by default, so the WIZARD's Work History header renders as before.
   * ⚠⚠ A PRESENTATIONAL PROP, LIKE `label` — it does not tell the component
   * which surface it is on, and it must not become that.
   */
  showContext?: boolean;
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
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [tickedSpecs, setTickedSpecs] = useState<Set<string>>(new Set());
  /* ⚠⚠ THE OTHER SEVEN, AS ONE TICK, PRE-TICKED. Pre-ticked because today's
     button already writes them: leaving it off would make the safer flow
     silently do less, which is the regression this part exists to undo. */
  const [tickedRest, setTickedRest] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (!info?.available || !info.hasDocument) return null;

  const preview = async () => {
    setStage("reading");
    setError(null);
    try {
      const r = await fetch("/api/onboarding/provider/resume-ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "preview" }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "That didn't work — nothing was changed.");
        setStage("idle");
        return;
      }
      const d = body.diff as RerunDiff;
      setDiff(d);
      /* ⚠⚠ ONLY `added` IS PRE-TICKED. "No longer mentioned" is never ticked and
         has no checkbox at all — it is information, and a résumé that stops
         mentioning a skill is not evidence the provider lost it (`E549`). */
      setTicked(new Set(d.skills.added.map((s) => s.id)));
      setTickedSpecs(new Set(d.specializations.added.map((s) => s.id)));
      setTickedRest(true);
      setStage("review");
    } catch {
      setError("That didn't work — nothing was changed.");
      setStage("idle");
    }
  };

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
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "That didn't save.");
        setStage("review");
        return;
      }
      /* ⚠ THE RECEIPT IS WHAT WAS WRITTEN, from the server — never the local
         tick count, which would report a wish rather than a fact. */
      const a = body.added ?? { skills: 0, specializations: 0 };
      /* ⚠⚠ THE RECEIPT NAMES ALL NINE, not one. `applied` carries the writer's
         own counts and the contract now admits them — before `E561` WS-B this
         object was typed down to `experiences` and eight fields were discarded
         at the boundary while being written to the database. */
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
      setResult(parts.length > 0 ? `Added ${parts.join(" · ")}.` : "Nothing added.");
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
            className="rounded-full bg-magenta px-4 py-1.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-60"
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
        <span className="text-ink-2">
          Read <b className="text-ink">{info.documentName}</b> again? We&apos;ll show
          you what changed before anything is saved.
        </span>
        <button
          type="button"
          onClick={preview}
          disabled={stage === "reading"}
          aria-busy={stage === "reading"}
          className="inline-flex items-center gap-2 rounded-full bg-magenta px-4 py-1.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-60"
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
