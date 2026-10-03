import type { PublicPhase, PublicRelease } from "@/lib/work-tracker/public-view";

/**
 * ── ⚠⚠⚠ THE BUILD LINE (`P2-ALL-E757`, mockup v5) ────────────────────────────
 *
 * A rail with a magenta fill to today, six phase labels at their start dates,
 * gate diamonds at the phase boundaries, a pulsing TODAY dot and a flag per release.
 *
 * ⚠⚠⚠ **IT DRAWS WITH THE DATES IT HAS (`P2-ALL-E769`).** A phase with a start is
 * placed on the axis; a phase without one is NAMED AFTER THE LINE as `dates to
 * come`. ⚠ Only when NO phase has a start at all does the whole line degrade to
 * `Dates coming soon`.
 *
 * ⚠⚠ **SUPERSEDED, quoted not deleted (`E164`) — the rule this replaced:**
 * //   IF ANY PHASE DATE IS MISSING, THE LINE RENDERS WITHOUT POSITIONS AND SAYS
 * //   `Dates coming soon` - NEVER INVENTED DATES.
 * ⚠⚠⚠ **IT WAS ALL-OR-NOTHING, AND THAT IS WHY SCOTT SAW NO LINE: four of six
 * phases were dated, a release target was set, and the page still printed
 * `Dates coming soon`.** ⚠ One missing date hid four real ones.
 *
 * ⚠⚠⚠ **THE HALF THAT DOES NOT CHANGE: NEVER AN INVENTED DATE.** An undated phase
 * is not placed, not estimated and not given the end of the line — it is listed,
 * by name, as having none. A test once left an invented `2026-05-01` in Define's
 * start column and this page printed it to the public as fact.
 *
 * ⚠ Positions are a pure function of the dates, computed server-side, so there is
 * no layout that depends on JavaScript having run.
 */
/**
 * ⚠⚠ THE ROW RULE, EXPORTED AND PURE (`P2-ALL-E777`) — see the note at its call
 * site. ⚠⚠⚠ **IT IS SEPARATE SO IT CAN BE PROVEN ON INPUTS THE LIVE DATA DOES NOT
 * CONTAIN.** With today's dates nothing crowds, so a test that only looked at the
 * rendered page would assert "one row" forever and never exercise the mechanism
 * at all — green, and guarding nothing (ruling 12).
 *
 * ⚠ `MIN_GAP_PCT` is a deliberate OVER-estimate of label width: 12% of the axis
 * is ~117px at 976px, against a widest measured label of 75px. **Over-estimating
 * costs a stagger nobody needed; under-estimating costs an overlap, which is the
 * thing that must never happen.**
 */
export const MIN_GAP_PCT = 12;

export function assignRows(ats: number[], minGapPct = MIN_GAP_PCT): number[] {
  const lastOn = [-Infinity, -Infinity];
  return ats.map((at) => {
    /* ⚠ Greedy and order-preserving: a mark drops to the second row only if it
       would crowd the last mark placed on the first. */
    const row = at - lastOn[0] >= minGapPct ? 0 : at - lastOn[1] >= minGapPct ? 1 : 0;
    lastOn[row] = at;
    return row;
  });
}

export function BuildLine({
  phases,
  releases,
  now,
}: {
  phases: PublicPhase[];
  /** ⚠ A flag per RELEASE at its target date (`E765`), replacing milestones. */
  releases: PublicRelease[];
  /**
   * ⚠⚠⚠ `now` IS PASSED IN, NOT READ HERE, AND THAT IS NOT STYLE.
   * `Date.now()` during render is an impure call — lint says so — and on a page
   * with `revalidate = 60` it would also differ between the prerender and the
   * HTML a visitor receives, so the TODAY dot could sit at a position the markup
   * was not built for. ⚠ The page passes `generatedAt`, the same instant every
   * other figure on the page was measured at, so the whole page agrees with
   * itself.
   */
  now: number;
}) {
  /*
    ⚠⚠ A PHASE IS PLACED IF IT HAS A START, AND LISTED IF IT DOES NOT (`E769`).
    ⚠ SUPERSEDED, quoted not deleted (`E164`) — the all-or-nothing test:
    //   const starts = phases.map((p) => (p.start ? Date.parse(p.start) : null));
    //   const complete = starts.every((s): s is number => s !== null);
    ⚠⚠⚠ Nothing is ESTIMATED for the undated ones. They keep their names and say
    they have no dates, which is a fact; a position would be a guess.
  */
  const dated = phases
    .map((p) => ({ p, t: p.start ? Date.parse(p.start) : NaN }))
    .filter((x) => Number.isFinite(x.t));
  const undated = phases.filter((p) => !p.start);

  if (dated.length === 0) {
    return (
      <section aria-label="Build line" className="mt-7 border-t border-line pt-5">
        <div className="h-[3px] w-full rounded-full bg-line" />
        <p className="mt-3 text-[13px] text-ink-2">Dates coming soon</p>
      </section>
    );
  }

  const starts = dated.map((x) => x.t);
  const first = Math.min(...starts);
  /*
    ⚠⚠ THE AXIS ENDS AT THE LATEST THING THE DATA ACTUALLY NAMES — the last phase
    END, the last phase START (phases that have begun and not finished have no
    end, and today every one of them is in that state), the latest RELEASE target,
    or today.
    ⚠⚠⚠ `now` IS IN THE MAX DELIBERATELY: without it, a build that has run past
    its last named date would pin the TODAY dot to the end of the line and read as
    "finished" — the one thing this page must not imply.
  */
  const endTimes = dated.map((x) => (x.p.end ? Date.parse(x.p.end) : NaN)).filter(Number.isFinite);
  const releaseTimes = releases
    .filter((r) => r.date)
    .map((r) => Date.parse(r.date!))
    .filter(Number.isFinite);
  const last = Math.max(...starts, ...endTimes, ...releaseTimes, now);
  const span = Math.max(1, last - first);
  const pct = (t: number) => Math.min(100, Math.max(0, ((t - first) / span) * 100));
  const todayPct = pct(now);

  /*
    ── ⚠⚠ PHASES THAT START ON THE SAME DAY SHARE ONE LABEL (`P2-ALL-E769`) ────

    ⚠⚠⚠ MEASURED: `Define` and `Design` both start `2026-08-15`, so two labels
    were printed at the SAME x and overlapped into an unreadable smudge. ⚠ Two
    names on one marker is the truth — they did start together — and it is the
    only arrangement that does not move one of them to a date it does not have.
  */
  const marks = Array.from(
    dated.reduce((acc, { p, t }) => {
      const key = p.start as string;
      const row = acc.get(key) ?? { date: key, at: pct(t), names: [] as string[], current: false };
      row.names.push(p.name);
      /* ⚠ Bold if ANY phase on this marker is the current one. */
      row.current = row.current || p.current;
      acc.set(key, row);
      return acc;
    }, new Map<string, { date: string; at: number; names: string[]; current: boolean }>()),
  ).map(([, v]) => v);

  /*
    ── ⚠⚠⚠ CLOSE MARKERS GO ON A SECOND ROW (`P2-ALL-E777`) ───────────────────

    ⚠ **SCOTT:** the labels bunch at the left (`Define · Design`, then `Build`).

    ⚠⚠ **MEASURED AT 1440 BEFORE THE FIX: the three markers occupied 232–307,
    393–452 and 1158–1208 — gaps of 86px and 706px, and ZERO overlaps.** `E769`'s
    shared marker had already removed the collision, so this is CROWDING, not
    overlap: three labels inside the leftmost 220px of a 976px axis while 706px
    sits empty. ⚠ Saying that precisely matters, because "they overlap" would have
    sent the next person looking for a bug that is not there.

    ⚠⚠⚠ **THE ROW IS CHOSEN FROM POSITION ALONE, SERVER-SIDE, BECAUSE NOTHING
    HERE CAN MEASURE TEXT.** A label's real width depends on the font, which has
    not loaded when this renders. ⚠ `MIN_GAP_PCT` is therefore a deliberate
    over-estimate: ~12% of the axis is ~117px at 976px, comfortably wider than the
    widest label measured (75px). **Over-estimating costs a stagger nobody needed;
    under-estimating costs an overlap, which is the thing that must never happen.**
    ⚠ Greedy and order-preserving: a mark drops to row 2 only if it would crowd the
    last mark placed on row 1, and the next one is compared against whichever row
    it lands on.
  */
  const rows = assignRows(marks.map((m) => m.at));
  /* ⚠ If nothing is crowded the second row is never used, and the block keeps its
     original height — the common case pays nothing for this. */
  const twoRows = rows.some((r) => r === 1);

  return (
    <section aria-label="Build line" className="mt-7 border-t border-line pt-6">
      <div className="relative h-[3px] w-full rounded-full bg-line">
        {/* ⚠ The fill stops at TODAY, not at the end — it is elapsed time, not
            progress, and conflating the two would overstate the build. */}
        <div
          className="absolute left-0 top-0 h-[3px] rounded-full bg-magenta"
          style={{ width: `${todayPct}%` }}
        />
        {/* ⚠⚠ `motion-safe:` ONLY — reduced motion turns the pulse off entirely
            (the brief's rule), and the dot is still there, just still. */}
        <span
          aria-hidden
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-magenta motion-safe:animate-pulse"
          style={{ left: `${todayPct}%` }}
        />
        {/* ⚠ A release with no target date cannot be placed, so it is simply not
            flagged — never pinned to "today" or to the end of the line. */}
        {releases
          .filter((r) => r.date)
          .map((r) => (
            <span
              key={`${r.code ?? r.name}-${r.date}`}
              title={`${r.code ? `${r.code} — ` : ""}${r.name} — ${r.date}`}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-ink bg-surface"
              style={{ left: `${pct(Date.parse(r.date!))}%` }}
            />
          ))}
      </div>

      {/*
        ── ⚠⚠⚠ THE AXIS CARRIES LABELS ONLY WHERE THERE IS ROOM (`P2-ALL-E769`) ──

        ⚠⚠ MEASURED AT 390: `Define · Design` and `Build` sit 0% and 26% apart —
        which is **91px** of a 350px axis — and the labels are wider than that, so
        they printed over each other as `Define ·BuildIn` / `2026-08Q026-09-01`.
        ⚠⚠⚠ **NOTHING SHRINKS OR TRUNCATES: A DATE THAT HAS TO BE GUESSED AT IS
        WORSE THAN A DATE ON ITS OWN LINE.** Below `sm` the same marks render as a
        LIST and the rail above keeps the shape — the fill to today, the today dot
        and the release flags are all still there and all still positioned.
      */}
      <div className={"relative mt-3 hidden sm:block " + (twoRows ? "h-[72px]" : "h-10")}>
        {marks.map((m, i) => (
          <span
            key={m.date}
            className={
              "absolute whitespace-nowrap text-[11px] " +
              /* ⚠ The second row sits below the first, with a leader line drawn by
                 `before:` back up to the rail so a reader can tell which marker a
                 dropped label belongs to. */
              (rows[i] === 1
                ? "top-[34px] before:absolute before:-top-[30px] before:left-1/2 before:h-[26px] before:w-px before:bg-line "
                : "top-0 ") +
              /*
                ⚠⚠ A LABEL AT EITHER END IS ALIGNED, NOT CENTRED, AND THIS WAS A
                MEASURED DEFECT: centring puts half of it outside the page.
                ⚠⚠⚠ The first label sits at 0% and the last at 100%, so
                `-translate-x-1/2` printed `n` for `Design` and `Prove` ran off the
                right edge — both clipped, on the live page.
              */
              (m.at <= 2 ? "" : m.at >= 98 ? "-translate-x-full" : "-translate-x-1/2") +
              " " +
              (m.current ? "font-bold text-ink" : "text-ink-2")
            }
            style={{ left: `${m.at}%` }}
          >
            {m.names.join(" · ")}
            <span className="block text-[10px] text-ink-3">{m.date}</span>
          </span>
        ))}
      </div>

      {/* ⚠ The same marks, stacked, for phone. One source, two arrangements. */}
      <ul className="mt-3 sm:hidden">
        {marks.map((m) => (
          <li
            key={m.date}
            className={
              "flex items-baseline justify-between gap-3 py-0.5 text-[12px] " +
              (m.current ? "font-bold text-ink" : "text-ink-2")
            }
          >
            <span>{m.names.join(" · ")}</span>
            <span className="text-[11px] text-ink-3">{m.date}</span>
          </li>
        ))}
      </ul>

      {/*
        ⚠⚠ THE UNDATED PHASES, AFTER THE LINE AND IN ORDER (`E769`). ⚠⚠⚠ THEY ARE
        NAMED RATHER THAN OMITTED: a reader who knows the method counts six phases,
        and silently dropping two would read as "there are four" — a quieter lie
        than a wrong date. ⚠ `dates to come` is the whole claim; nothing is implied
        about when.
      */}
      {undated.length > 0 && (
        <p className="mt-1 text-[12px] text-ink-3">
          {undated.map((p) => p.name).join(" · ")} — dates to come
        </p>
      )}

      {releases.length > 0 && (
        <p className="mt-1 text-[12px] text-ink-2">
          {releases
            .filter((r) => r.date)
            .map((r) => `${r.code ? `${r.code} ` : ""}${r.name} · ${r.date}`)
            .join("  ·  ")}
        </p>
      )}
    </section>
  );
}
