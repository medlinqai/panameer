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
import { editHref } from "@/lib/profile-sections";
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
  /* ⚠ `done` IS THE COMPLEMENT OF `open`, BY THE SAME RULE — `lineCounts`,
     which is what makes *"I have none"* count (`E590`). Two independent
     filters could disagree; this cannot. */
  const done = useMemo(() => score.lines.filter((l) => lineCounts(l.state)), [score.lines]);
  /*
    ⚠⚠ THE NEXT LINE IS `open[0]` — the list is already sorted biggest-points
    first, so the next thing worth doing is the head of it. ⚠⚠⚠ COMPUTED, NEVER
    NAMED: a hardcoded "next" would go stale the moment a provider answers it.
    ⚠ `href` PREFERS THE `E597` ONE-SECTION EDITOR and falls back to the line's
    own — 9 of 16 lines have one.
  */
  const next = useMemo(() => {
    const l = open[0];
    if (!l) return null;
    const copy = SCORE_LINE_COPY[l.key];
    return {
      line: l,
      copy,
      href: copy.editorSlug ? editHref(copy.editorSlug) : copy.href,
    };
  }, [open]);
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
      {/*
        ── ⚠⚠⚠ THE PAGE TITLE (`E006`) ────────────────────────────────────

        ⚠ SCOTT, 2026-09-22: *"Your Profile Score"* → **Supercharge Your
        Exposure to Buyers**. ⚠⚠ IT NAMES WHAT THE PAGE IS FOR rather than what
        it displays — the score is the instrument, the exposure is the point.
        ⚠ SUPERSEDED, quoted not deleted (`E164`):
        //   <h1 …>Your Profile Score</h1>
      */}
      <header className="mb-3.5 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-[22px] font-bold tracking-[-0.3px]">
          Supercharge Your Exposure to Buyers
        </h1>
        {/* ⚠ COPY IS SCOTT'S, VERBATIM. */}
        <p className="text-[13px] text-ink-3">
          Answer every line — &ldquo;I have none&rdquo; counts — and you&rsquo;re
          at 100%.
        </p>
      </header>

      {/*
        ── ⚠⚠⚠ THE WIDE TWO-PART HEADER (`E001`), AND IT **REPLACES** THE RING
           CARD — ONE RING ON THE PAGE, NOT TWO ───────────────────────────────

        ⚠ SCOTT: *"It replaces today's ring card: one ring on the page, not
        two."* ⚠⚠ THE LEFT HALF IS THE RING, MOVED HERE WHOLE — it is not a
        second, smaller copy, which is exactly what *"not two"* forbids.
        ⚠ THE PAGE RULE (2026-09-22) PUTS THIS HEADER ON **Score, Grow and
        Statistics** and keeps it OFF My Profile, where the score appears only
        as a side card with its ring. Both halves of that rule now hold.
        ⚠⚠ THE MOTION AND ITS COUNTDOWN ARE **WS-D**, not this workstream —
        Scott: *"a still ring is fine here."*
      */}
      <section className="pm-score-hero mb-4 overflow-hidden rounded-brand border border-line bg-white">
        <div className="pm-score-hero-left p-6 text-center">
          <h2 className="mb-3 font-display text-[15px] font-bold">
            Components of Your Score
          </h2>
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
        </div>
        <div className="pm-score-hero-right flex flex-col justify-center gap-3 p-6">
          {/*
            ⚠⚠ THE TWO COUNTS, IN THE SAME WORDS AS THE CARDS BELOW (`E008`).
            ⚠ THEY ARE COUNTS OF **COMPONENTS**, NOT POINTS — the ring already
            carries the points, and two different numbers claiming to be "your
            score" is the defect `E582` recorded.
          */}
          <div className="flex gap-6">
            <div>
              <div className="font-display text-[30px] font-bold leading-none text-ink">
                {done.length}
              </div>
              <p className="mt-1 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-3">
                Components Completed
              </p>
            </div>
            <div>
              <div className="font-display text-[30px] font-bold leading-none text-ink">
                {open.length}
              </div>
              <p className="mt-1 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-3">
                Needing Completion or Acknowledgment
              </p>
            </div>
          </div>

          {/*
            ── ⚠⚠⚠ THE NEXT LINE, AND A BUTTON THAT OPENS **ITS** EDITOR ──────

            ⚠ `open` is sorted biggest-points-first, so `open[0]` IS the next
            line worth doing — computed, never named.
            ⚠⚠ THE BUTTON PREFERS THE `E597` ONE-SECTION EDITOR and falls back
            to the line's own `href`. ⚠⚠⚠ MEASURED: **9 of the 16 lines have an
            editor; 7 do not** — `headline`, `field`, `photo`, `identity`,
            `location`, `languages` and `workMethod` still point into
            `/join/provider`, because the profile renders no Edit control for
            any of them. ⚠ That is `E597`'s complaint surviving on this page,
            reported rather than papered over.
          */}
          {next ? (
            <div className="rounded-[12px] border border-line-2 bg-bg-soft p-3.5">
              <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-3">
                Next
              </p>
              <p className="mt-0.5 text-[15px] font-bold">
                {next.line.label}{" "}
                <span className="font-display text-[13px] text-magenta-dark">
                  +{next.line.points}
                </span>
              </p>
              <Link
                href={next.href}
                className="mt-2.5 inline-block rounded-full bg-magenta px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-magenta-dark"
              >
                {next.copy.action}
              </Link>
            </div>
          ) : (
            <p className="text-[13.5px] text-ink-2">
              Every component is answered. Nothing is waiting on you.
            </p>
          )}
        </div>
      </section>

      {/* ⚠⚠ 50/50. Scott: *"split. 50/50"*. */}
      <div className="pm-score-layout">
        {/* ═══════ LEFT — the circle, and what is left, directly beneath ═══ */}
        <div className="flex flex-col gap-5">
          {/*
            ⚠⚠⚠ THE RING CARD IS GONE FROM HERE — IT **MOVED** INTO THE WIDE
            HEADER ABOVE (`E001`). Scott: *"It replaces today's ring card: one
            ring on the page, not two."*
            ⚠ SUPERSEDED, quoted not deleted (`E164`) — the card that stood
            here, whose BODY is now the header's left half unchanged:
            //   <section className="rounded-brand border border-line bg-white p-6 text-center">
            //     <div className="pm-score-dial"> … the svg, the segments, the core … </div>
            //   </section>
          */}


          <section className="rounded-brand border border-line bg-white p-6">
            {/* ⚠ `E008`: *"What's left"* → **Needing Completion or
                Acknowledgment**. ⚠⚠ THE SECOND WORD IS THE POINT — a line
                answered *"I have none"* is ACKNOWLEDGED, not completed, and the
                old title implied everything here was work. ⚠ SUPERSEDED,
                quoted not deleted (`E164`):
                //   <h2 …>What&rsquo;s left</h2> */}
            <h2 className="font-display text-[17px] font-bold">
              Needing Completion or Acknowledgment
            </h2>
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
                        {/* ⚠⚠ THE ROW'S ACTION PREFERS THE `E597` ONE-SECTION
                            EDITOR, exactly as the header's button does — one
                            rule, both places. ⚠ 7 of 16 lines have none and
                            keep their wizard href; reported at the gate. */}
                        <Link
                          href={copy.editorSlug ? editHref(copy.editorSlug) : copy.href}
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
                              {/* ⚠ `E005` — Title Case on every link. ⚠ SUPERSEDED (`E164`):
                                  //   "I have none" */}
                              {busy === l.key ? "Saving…" : "I Have None"}
                            </button>
                          </>
                        )}
                        </span>
                      </span>
                      {/*
                        ── ⚠⚠⚠ THE EXPLANATION LINE IS GONE (`E004`) ──────────

                        ⚠ SCOTT, 2026-09-22: *"Remove the explanation line under
                        every Needing item, e.g. 'Proof somebody else checked
                        your work'. The row keeps its name, its links and its
                        points."*
                        ⚠⚠ `copy.why` IS STILL IN THE TABLE AND STILL TYPED — it
                        is the RENDER that goes, not the data. The Components
                        Completed card does not show it either, so nothing reads
                        it today; it is kept because it is real copy somebody
                        wrote and a future surface may want it.
                        ⚠ SUPERSEDED, quoted not deleted (`E164`):
                        //   <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-3">
                        //     {copy.why}
                        //   </span>
                        ⚠⚠⚠ AND THIS UNDOES `E596` WS-B's COMPRESSION FIX BY
                        REMOVING ITS SUBJECT: that brief squeezed three lines
                        into two because the card ran 611px below the fold. With
                        the `why` gone the row is ONE line, which is shorter
                        still — the measurement that motivated it is honoured,
                        not reversed.
                      */}
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
            {/* ⚠ `E008`: *"What you've done"* → **Components Completed**, the
                same words the header's count uses. ⚠ SUPERSEDED, quoted not
                deleted (`E164`): //   What you&rsquo;ve done */}
            <h2 className="font-display text-[17px] font-bold">
              Components Completed
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

          {/* ⚠⚠ THE KEY. ⚠ SUPERSEDED, quoted not deleted (`E164`):
              //   The grey is a FILLED state and counts toward the figure — it
              //   must not read as a gap, so the legend says so.
              ⚠⚠⚠ THERE IS NO GREY ANY MORE. Two of these three swatches are now
              MAGENTA and that is the point: both states COUNT, and the ring
              paints them alike so it can never disagree with the number. ⚠ THE
              LABELS ARE WHAT STILL DISTINGUISH THEM, which is Scott's ruling in
              terms: *"the legend still says which lines are 'I have none'."* */}
          <div className="mt-5 flex flex-wrap gap-4 border-t border-line-2 pt-3 text-[11.5px] text-ink-3">
            <span className="flex items-center gap-1.5">
              <i className="block h-2.5 w-2.5 rounded-full bg-magenta" /> Filled in
            </span>
            <span className="flex items-center gap-1.5">
              {/* ⚠ SUPERSEDED (`E164`): `bg-ink-2/40`. */}
              <i className="block h-2.5 w-2.5 rounded-full bg-magenta" /> You have
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

/* ⚠⚠ TWO PAINTS NOW, NOT THREE (`P2-A3-E596`, Scott 2026-09-21): a line either
   COUNTS toward the figure or it does not, and the ring says exactly that.
   ⚠ SUPERSEDED, quoted not deleted (`E164`):
   //   ⚠⚠ THREE PAINTS, AND THE MIDDLE ONE IS NOT A GAP. `declared_none` counts
   //   toward the figure, so it is a solid grey — a paler shade of "answered",
   //   never the same colour as "nothing here".
   ⚠⚠ THE CLASS IS KEPT rather than folded into `pm-score-filled`. The DOM still
   distinguishes a declared line, which is what lets a gate — and a reader
   inspecting the page — tell the two apart even though they paint alike. */
function paintClass(state: ScoreLine["state"]): string {
  if (state === "filled") return "pm-score-filled";
  if (state === "declared_none") return "pm-score-declared";
  return "pm-score-empty";
}

function dotClass(state: ScoreLine["state"]): string {
  if (state === "filled") return "bg-magenta";
  /* ⚠ MAGENTA, matching the ring (`P2-A3-E596`). ⚠ SUPERSEDED, quoted not
     deleted (`E164`):  if (state === "declared_none") return "bg-ink-2/40";
     ⚠⚠ A GREY DOT BESIDE A MAGENTA SLICE FOR THE SAME LINE would be the
     contradiction moved rather than fixed — the legend sits under this list and
     explains both. The words carry the distinction; the colour carries "counts". */
  if (state === "declared_none") return "bg-magenta";
  return "bg-line-2";
}
