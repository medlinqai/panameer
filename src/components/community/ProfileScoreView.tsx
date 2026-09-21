"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  SCORE_GROUP_LABELS,
  lineCounts,
  type ProfileScore,
  type ScoreGroup,
  type ScoreLine,
} from "@/lib/completeness";
import { SCORE_LINE_COPY, DECLARED_NONE_RIDER } from "@/lib/profile-score-copy";
import "./profile-score.css";

/**
 * ── ⚠⚠ YOUR PROFILE SCORE (`P2-J3-E590` WS-B) ─────────────────────────────
 *
 * ⚠⚠⚠ SCOTT, 2026-09-20: *"shit you need to do (under the circle) adn shit you
 * haev done (off to the right)"* · *"split. 50/50"*.
 *
 * ⚠ **DONE AND NOT-DONE NEVER MIX IN THE SAME LIST.** That is the entire point
 * of the split: the left column is a to-do list you can finish, the right is a
 * record of what you already answered. A single list interleaving them is what
 * makes a checklist feel like an accusation.
 *
 * ── ⚠⚠ NOTHING HERE IS AN ACHIEVEMENT ─────────────────────────────────────
 *
 * ⚠ Recommendations, mentoring and service products are DELIBERATELY ABSENT.
 * They cannot be finished alone — they need somebody else to act — and a score
 * that includes them stops being *"answer every line"* and becomes a ranking.
 * ⚠⚠ They belong to `Grow the Network` and `Usage Stats`, which are separate
 * surfaces and separate briefs. **If any of the three appears here, the brief
 * has been misread.**
 *
 * ── ⚠ HOVER IS AN ENHANCEMENT, NEVER THE MECHANISM ────────────────────────
 *
 * ⚠⚠ Every action on this page is a real link or a real button, reachable by
 * keyboard and by touch. The hover sync lights a slice and swaps the centre
 * caption; a device with no pointer loses the highlight and loses nothing else.
 */
export function ProfileScoreView({ score }: { score: ProfileScore }) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useMemo(
    () =>
      score.lines
        .filter((l) => !lineCounts(l.state))
        /* ⚠ BIGGEST FIRST — the step worth most points is the one worth doing
           first, and the numbering should say so. */
        .sort((a, b) => b.points - a.points),
    [score.lines]
  );
  const missingPoints = open.reduce((a, l) => a + l.points, 0);
  const minutes = open.reduce((a, l) => a + SCORE_LINE_COPY[l.key].minutes, 0);

  /* ── the dial ─────────────────────────────────────────────────────────── */
  const R = 118;
  const C = 2 * Math.PI * R;
  const GAP = 1.5;
  /*
    ⚠⚠ `reduce`, NOT A MUTABLE CURSOR ACROSS A `map`. ⚠ SUPERSEDED, quoted not
    deleted (`E164`):
    //  let cursor = 0;
    //  const segments = score.lines.map((l) => {
    //    const seg = { line: l, len, offset: -cursor };
    //    cursor += (l.points / 100) * C;
    //    return seg;
    //  });
    ⚠ Lint was right and it is not a style note: `react-hooks` flags a variable
    reassigned after render completes, because React may re-enter the render and
    the second pass would start from a cursor the first pass left behind. The
    offsets would silently drift. ⚠⚠ A `reduce` carries the running total in its
    accumulator, so each render starts from zero by construction.
  */
  const segments = score.lines.reduce<
    { line: ScoreLine; len: number; offset: number }[]
  >((acc, l) => {
    const used = acc.reduce((a, s) => a + (s.line.points / 100) * C, 0);
    acc.push({ line: l, len: (l.points / 100) * C - GAP, offset: -used });
    return acc;
  }, []);

  const hovered = hover ? score.lines.find((l) => l.key === hover) : null;

  /*
    ⚠⚠ THE CENTRE CAPTION. ⚠ IT NEVER PRINTS THE WORD `Complete` — `E562`
    retired it because `completeness.ts` returned 100 while sections were empty,
    and although `E590` has now made 100 mean what it says, the word still
    describes a JUDGEMENT rather than a count. The figure says the number; the
    caption says what is left.
  */
  const caption = hovered ? (
    <>
      <b>{hovered.label}</b>
      {hovered.state === "filled"
        ? ` — answered, ${hovered.points} points.`
        : hovered.state === "declared_none"
          ? ` — you have none. Still counts: ${hovered.points}.`
          : ` — worth ${hovered.points} points, not answered yet.`}
    </>
  ) : missingPoints > 0 ? (
    <>
      <b>
        {missingPoints} point{missingPoints === 1 ? "" : "s"}
      </b>{" "}
      across {open.length} line{open.length === 1 ? "" : "s"} — about {minutes}{" "}
      minute{minutes === 1 ? "" : "s"}.
    </>
  ) : (
    <>
      <b>Done.</b> Every line answered.
    </>
  );

  /* ⚠⚠ NO IMPORT FROM `profile-declarations.ts` HERE. That module imports
     `prisma`, and reaching it from a CLIENT component drags the pg adapter into
     the browser bundle — it 500'd the page on first run, the same trap `E563`
     hit with `ConfirmExperience`. ⚠ `l.declarable` already carries the fact,
     computed server-side by the scorer, so the import was redundant as well as
     harmful. The server re-checks the key against the closed set regardless. */
  async function declareNone(line: ScoreLine["key"]) {
    setBusy(line);
    setError(null);
    try {
      const r = await fetch("/api/settings/profile-declaration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line, declared: true }),
      });
      if (!r.ok) {
        const b = (await r.json().catch(() => ({}))) as { error?: string };
        setError(b.error ?? "Could not save that.");
        return;
      }
      /* ⚠ THE SERVER OWNS THE NUMBER. Re-reading is what keeps the ring, the
         two lists and the stored column from disagreeing after a write. */
      router.refresh();
    } catch {
      /* ⚠ `E516` — a thrown fetch must not produce silence. */
      setError("Could not save that.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-3.5 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-[22px] font-bold tracking-[-0.3px]">
          Your Profile Score
        </h1>
        {/* ⚠ COPY IS SCOTT'S, VERBATIM. */}
        <p className="text-[13px] text-ink-3">
          Answer every line — &ldquo;I have none&rdquo; counts — and you&rsquo;re
          at 100%.
        </p>
      </header>

      {/* ⚠⚠ 50/50. Scott: *"split. 50/50"*. */}
      <div className="pm-score-layout">
        {/* ═══════ LEFT — the circle, and what is left, directly beneath ═══ */}
        <div className="flex flex-col gap-5">
          <section className="rounded-brand border border-line bg-white p-6 text-center">
            <div className="pm-score-dial">
              <svg viewBox="0 0 300 300" className="pm-score-svg" role="img" aria-label={`${score.total} of 100`}>
                <circle cx="150" cy="150" r={R} fill="none" className="stroke-line-2" strokeWidth="22" />
                {segments.map((s) => (
                  <circle
                    key={s.line.key}
                    cx="150"
                    cy="150"
                    r={R}
                    fill="none"
                    strokeWidth={hover === s.line.key ? 30 : 22}
                    strokeLinecap="butt"
                    strokeDasharray={`${s.len} ${C - s.len}`}
                    strokeDashoffset={s.offset}
                    className={
                      "pm-score-seg " +
                      paintClass(s.line.state) +
                      (hover && hover !== s.line.key ? " pm-score-dim" : "")
                    }
                    onMouseEnter={() => setHover(s.line.key)}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </svg>
              <div className="pm-score-core">
                {/* ⚠ `E433` — the FIGURE is a figure, so ink. The ring itself is
                    magenta because it is hovered and clicked (`E590` ruling 1). */}
                <div className="font-display text-[56px] font-bold leading-none tracking-[-2px] text-ink">
                  {score.total}
                </div>
                <div className="mt-1 text-[11.5px] font-bold uppercase tracking-[0.11em] text-ink-3">
                  of 100
                </div>
                <p className="mt-2 min-h-[34px] text-[11.5px] leading-snug text-ink-2">
                  {caption}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-brand border border-line bg-white p-6">
            <h2 className="font-display text-[17px] font-bold">What&rsquo;s left</h2>
            <p className="mt-1 text-[12.5px] text-ink-3">
              {open.length > 0
                ? `${open.length} line${open.length === 1 ? "" : "s"} · ${missingPoints} points · about ${minutes} minutes`
                : "Every line is answered."}
            </p>

            {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}

            <div className="mt-3">
              {open.map((l, i) => {
                const copy = SCORE_LINE_COPY[l.key];
                return (
                  <div
                    key={l.key}
                    /*
                      ── ⚠⚠ TWO LINES, NOT THREE (`P2-A3-E596` WS-B item 2) ──

                      ⚠ SUPERSEDED, quoted not deleted (`E164`):
                      //   className="flex items-start gap-3 border-t border-line-2 py-3 first:border-t-0"
                      //   <b className="block text-[14px]">{l.label}</b>
                      //   <span className="mt-0.5 block …">{copy.why}</span>
                      //   <span className="mt-1.5 flex …">   ← actions on their OWN third line

                      ⚠⚠ MEASURED AT 1440×900 BEFORE THE CHANGE: eight rows at
                      **88.6px each** — not the ~70px the brief estimated — for a
                      card 859px tall whose bottom sat 611px BELOW THE FOLD.
                      ⚠ Scott rejected swapping the columns (*"shit you need to
                      do (under the circle) and shit you haev done (off to the
                      right)"*), so the fix is compression, not rearrangement.

                      ⚠ THE TITLE AND THE ACTIONS SHARE LINE ONE; the "why" is
                      line two. Nothing is removed — the action, the optional
                      *"or I have none"* and the points badge all survive.
                    */
                    className="flex items-start gap-3 border-t border-line-2 py-1.5 first:border-t-0"
                    onMouseEnter={() => setHover(l.key)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <span className="mt-0.5 grid h-[21px] w-[21px] flex-none place-items-center rounded-full bg-magenta font-display text-[11.5px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <b className="text-[14px]">{l.label}</b>
                        <span className="flex flex-wrap items-center gap-2 text-[12.5px]">
                        <Link
                          href={copy.href}
                          className="font-bold text-magenta hover:underline"
                        >
                          {copy.action}
                        </Link>
                        {/*
                          ⚠⚠⚠ THE SECOND ACTION IS THE WHOLE FEATURE, NOT A
                          SECONDARY AFFORDANCE. Without it a provider who
                          genuinely holds no certifications can never reach 100,
                          which is the thing Scott asked for in the first place.
                        */}
                        {l.declarable && (
                          <>
                            <span className="font-medium text-ink-3">or</span>
                            <button
                              type="button"
                              onClick={() => declareNone(l.key)}
                              disabled={busy === l.key}
                              className="font-bold text-magenta hover:underline disabled:opacity-60"
                            >
                              {busy === l.key ? "Saving…" : "I have none"}
                            </button>
                          </>
                        )}
                        </span>
                      </span>
                      {/* ⚠ LINE TWO — the reason, under the title and its actions. */}
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-3">
                        {copy.why}
                      </span>
                    </span>
                    <span className="flex-none font-display text-[13px] font-bold text-magenta-dark">
                      +{l.points}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* ⚠ COPY IS SCOTT'S, VERBATIM. */}
            <p className="mt-3 border-t border-line-2 pt-2.5 text-[12px] text-ink-3">
              <b className="text-ink">That&rsquo;s the whole list.</b> Nothing
              here depends on anyone but you.
            </p>
          </section>
        </div>

        {/* ═══════ RIGHT — what is already done ═══════════════════════════ */}
        <section className="rounded-brand border border-line bg-white p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-[17px] font-bold">
              What you&rsquo;ve done
            </h2>
            <span className="font-display text-[14px] font-bold text-ink-3">
              {score.total} of 100
            </span>
          </div>
          <p className="mb-1 mt-0.5 text-[12.5px] text-ink-3">
            Hover any line and its slice lights up.
          </p>

          {(Object.keys(SCORE_GROUP_LABELS) as ScoreGroup[]).map((g) => {
            const inGroup = score.lines.filter((l) => l.group === g);
            const done = inGroup.filter((l) => lineCounts(l.state));
            /* ⚠ A GROUP WITH NOTHING ANSWERED RENDERS NOTHING. An empty heading
               with a `0 / 26` beside it is a scoreboard, not a record. */
            if (done.length === 0) return null;
            const got = done.reduce((a, l) => a + l.points, 0);
            const tot = inGroup.reduce((a, l) => a + l.points, 0);
            return (
              <div key={g}>
                <p className="mt-5 flex items-baseline justify-between font-display text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3 first:mt-2">
                  {SCORE_GROUP_LABELS[g]}
                  <span className="font-body text-[12px] normal-case tracking-normal">
                    {got} / {tot}
                  </span>
                </p>
                {done.map((l) => (
                  <div
                    key={l.key}
                    className="flex items-center gap-3 border-t border-line-2 py-2.5"
                    onMouseEnter={() => setHover(l.key)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <span
                      aria-hidden
                      className={"h-2.5 w-2.5 flex-none rounded-full " + dotClass(l.state)}
                    />
                    <span className="min-w-0 flex-1 text-[13.5px] font-semibold">
                      <span className={l.state === "declared_none" ? "text-ink-3" : ""}>
                        {l.label}
                      </span>
                      {/* ⚠ THE RIDER. A declared line is DONE, and the page says
                          why it is done rather than leaving it looking filled. */}
                      {l.state === "declared_none" && (
                        <small className="block text-[11px] font-medium leading-snug text-ink-3">
                          {DECLARED_NONE_RIDER}
                        </small>
                      )}
                    </span>
                    <span className="flex-none font-display text-[13px] font-bold text-ink-2">
                      {l.points}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}

          {/* ⚠⚠ THE KEY. The grey is a FILLED state and counts toward the
              figure — it must not read as a gap, so the legend says so. */}
          <div className="mt-5 flex flex-wrap gap-4 border-t border-line-2 pt-3 text-[11.5px] text-ink-3">
            <span className="flex items-center gap-1.5">
              <i className="block h-2.5 w-2.5 rounded-full bg-magenta" /> Filled in
            </span>
            <span className="flex items-center gap-1.5">
              <i className="block h-2.5 w-2.5 rounded-full bg-ink-2/40" /> You have
              none — still counts
            </span>
            <span className="flex items-center gap-1.5">
              <i className="block h-2.5 w-2.5 rounded-full border border-line bg-line-2" />{" "}
              On the left, not done
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ⚠⚠ THREE PAINTS, AND THE MIDDLE ONE IS NOT A GAP. `declared_none` counts
   toward the figure, so it is a solid grey — a paler shade of "answered", never
   the same colour as "nothing here". */
function paintClass(state: ScoreLine["state"]): string {
  if (state === "filled") return "pm-score-filled";
  if (state === "declared_none") return "pm-score-declared";
  return "pm-score-empty";
}

function dotClass(state: ScoreLine["state"]): string {
  if (state === "filled") return "bg-magenta";
  if (state === "declared_none") return "bg-ink-2/40";
  return "bg-line-2";
}
