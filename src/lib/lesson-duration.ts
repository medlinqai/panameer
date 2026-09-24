/**
 * A LESSON KNOWS HOW LONG IT IS (`P1-J3-E361`).
 *
 * **SCOTT, 2026-09-02:** *"i spent hours getting all the times in the XLS. I do
 * not want to spend more time doing something else. Please grab the times for
 * the XLS."* And: *"people will ask it more than anything else."*
 *
 * ── ⚠⚠ THE 60× ERROR, AND WHY IT IS MEASURED AND NOT INFERRED ────────────────
 *
 * Scott typed `2:13` meaning two minutes thirteen seconds into a cell formatted
 * as hours-and-minutes, so Excel stored 2 hours 13 minutes. Every populated value
 * is exactly sixty times too large. Checked against Vimeo's own oEmbed endpoint:
 *
 *   `2:13:00` -> 133 s  · Vimeo says 133 s   (2.1 - What is IaaS)
 *   `2:21:00` -> 141 s  · Vimeo says 141 s   (2.2 - What is PaaS)
 *
 * Exact, to the second, both — and `check:duration` re-asserts both pairs so the
 * rule cannot drift. Pass C of the backfill re-proves it across 186 lessons
 * rather than trusting two.
 *
 * ── ⚠⚠ THIS IS NOT `run_time`, AND `run_time` IS NOT TOUCHED ─────────────────
 *
 * `Lesson.run_time` is a `String?` holding spreadsheet DISPLAY COPY, and it
 * genuinely contains `Intro`, `NA`, `Done` and `Incomplete`. `check:learn`
 * GUARD 1 forbids summing it and **that ban is permanent and correct**. Nothing
 * here relaxes it: `duration_seconds` is a separate, numeric column, and this
 * module is the only thing that ever turns one into the other.
 */

/**
 * ── ⚠⚠⚠ THE ONLY SOURCE A LENGTH MAY BE SHOWN FROM (`P2-A4-E611`) ────────
 *
 * ⚠⚠ SCOTT, 2026-09-23: *"always 5 min, plus or minus 1 minute."*
 *
 * ⚠⚠⚠ `duration_source` HAS THREE VALUES AND ONLY ONE OF THEM IS A
 * MEASUREMENT. Counted on the live catalogue, 2026-09-23:
 *
 *   `vimeo`  130 lessons — read back from Vimeo's own endpoint. ⚠ A FACT.
 *   `xls`    206 lessons — ⚠⚠ **PLANNING ESTIMATES SCOTT TYPED**, before the
 *                          video existed. 33 of them have no `vimeo_ref` at
 *                          all, which is what gives the game away.
 *   null     186 lessons — nothing recorded.
 *
 * ⚠⚠⚠ RENDERING AN `xls` VALUE AS A LESSON LENGTH IS A FABRICATED FIGURE. It
 * is not an approximation of a real number; it is a number that was never
 * measured, presented in the place a measurement goes.
 *
 * ⚠⚠ AND THE ANSWER FOR THE OTHER 392 IS TO OMIT THE LENGTH, NOT TO DASH IT.
 * Scott, 2026-09-23: *"a missing length is a missing fact, not an uncountable
 * one."* ⚠ A dash means *we cannot count this*; a lesson with no measured
 * duration is simply a lesson we have not timed, and the honest rendering of
 * that is nothing at all.
 */
export const MEASURED_DURATION_SOURCE = "vimeo";

/**
 * The length this lesson may show, or `null` for "show nothing".
 *
 * ⚠ It returns the STORED display string, not a re-derivation: `run_time` is
 * what the page has always printed and Scott's ±1 minute remark is about that
 * string. ⚠⚠ THE SOURCE IS WHAT THIS FUNCTION JUDGES, NEVER THE VALUE.
 */
export function shownRunTime(lesson: {
  run_time: string | null;
  duration_source: string | null;
}): string | null {
  if (lesson.duration_source !== MEASURED_DURATION_SOURCE) return null;
  return lesson.run_time?.trim() || null;
}

/** Two hours. ⚠ A longer "lesson" is far likelier to be a bad cell than a video. */
export const DURATION_CEILING_SECONDS = 7200;

export type ParsedDuration =
  | { ok: true; seconds: number }
  /** ⚠ EVERY REJECTION SAYS WHY, so the backfill report can list it. */
  | { ok: false; reason: "empty" | "status_word" | "unrecognised" | "seconds_not_zero" | "over_ceiling"; raw: string };

/**
 * Turn a stored `run_time` string into whole seconds.
 *
 * ⚠ PURE. No database, no clock, no I/O — so `check:duration` drives every
 * branch against the measured pairs with nothing mocked.
 *
 * ⚠⚠ THE `÷ 60` IS EXPRESSED AS "READ THE FIELDS ONE PLACE LEFT", not as a
 * division, because that is what actually happened: the hours column holds
 * minutes and the minutes column holds seconds. `2:13:00` is 2 minutes and 13
 * seconds. Writing it as `total / 60` would be arithmetic that happens to agree;
 * writing it this way is the explanation.
 */
export function parseRunTime(raw: string | null | undefined): ParsedDuration {
  const s = (raw ?? "").trim();
  if (!s) return { ok: false, reason: "empty", raw: s };

  /*
    ⚠ STATUS WORDS THAT LANDED IN A TIME COLUMN. Measured distinct set:
    `NA`, `intro`, `Intro`, `Incomplete`, `Done`. These are not durations and
    must never become zero — a zero would sum, and a summed zero is a lie.
  */
  if (/^[A-Za-z]/.test(s)) return { ok: false, reason: "status_word", raw: s };

  /* `N days, H:MM:SS` — overflowed past a day. Measured: 7 of them. */
  const days = /^(\d+)\s+days?,\s*(\d+):(\d{2}):(\d{2})$/.exec(s);
  if (days) {
    const [, d, h, mm, ss] = days;
    if (ss !== "00") return { ok: false, reason: "seconds_not_zero", raw: s };
    const seconds = (Number(d) * 24 + Number(h)) * 60 + Number(mm);
    return gate(seconds, s);
  }

  /* `H:MM:SS` — the common case. 196 of them. */
  const hms = /^(\d+):(\d{2}):(\d{2})$/.exec(s);
  if (hms) {
    const [, h, mm, ss] = hms;
    /*
      ⚠ `SS` MUST BE `00`. The 60× shift means the seconds column should always
      be empty; a non-zero one means the cell was not what we think it was, and
      converting it anyway would be guessing at somebody's data.
    */
    if (ss !== "00") return { ok: false, reason: "seconds_not_zero", raw: s };
    return gate(Number(h) * 60 + Number(mm), s);
  }

  /* `:SS` — under a minute. Measured: 7 of them, all 33-58 seconds. */
  const only = /^:(\d{2})$/.exec(s);
  if (only) return gate(Number(only[1]), s);

  return { ok: false, reason: "unrecognised", raw: s };
}

function gate(seconds: number, raw: string): ParsedDuration {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return { ok: false, reason: "unrecognised", raw };
  }
  /* ⚠ THE CEILING IS NOT RAISED TO MAKE MORE ROWS PASS. */
  if (seconds > DURATION_CEILING_SECONDS) return { ok: false, reason: "over_ceiling", raw };
  return { ok: true, seconds };
}

/* ────────────────────────────────────────────────────────────────────────────
   THE FORMATTER — ⚠⚠ THE WHOLE REASON THIS DOES NOT BECOME A LIE LATER
   ──────────────────────────────────────────────────────────────────────────── */

export type DurationTotal = {
  /** Sum of every lesson that HAS a duration. */
  seconds: number;
  /** How many lessons contributed. */
  counted: number;
  /**
   * ⚠⚠ HOW MANY WERE LEFT OUT BECAUSE THEY HAVE NO DURATION. A total that
   * silently omits untimed lessons is worse than no total: it reads as complete
   * and is not. Every caller gets this number and cannot render the total
   * without having seen it.
   */
  missing: number;
  /** True only when nothing was left out. */
  complete: boolean;
};

/**
 * ⚠ THE RETURN TYPE IS THE GUARANTEE. There is deliberately no function here
 * that returns a bare number of seconds — `check:duration` asserts that a total
 * always arrives with its `missing` count, so no surface can present a partial
 * sum as a whole one.
 *
 * ⚠ Inventory Management is the live proof of why: 47 playable lessons, and at
 * the time this shipped NONE of them had an XLS time. A "total course length"
 * there must be able to say so.
 */
export function totalDuration(
  lessons: { duration_seconds?: number | null }[]
): DurationTotal {
  let seconds = 0;
  let counted = 0;
  let missing = 0;
  for (const l of lessons) {
    const d = l.duration_seconds;
    if (typeof d === "number" && d > 0) {
      seconds += d;
      counted += 1;
    } else {
      missing += 1;
    }
  }
  return { seconds, counted, missing, complete: missing === 0 };
}

/** `133` -> `"2m 13s"`, `6036` -> `"1h 40m"`. Whole units, never a bare number. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  /* Under an hour, seconds matter — a 2m 13s lesson is not "2m". */
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

/**
 * The sentence a surface may print. ⚠ IT NAMES THE GAP RATHER THAN HIDING IT.
 *
 * ⚠ THE STRINGS ARE CC'S AND ARE A PROPOSAL — nothing renders them yet; the
 * display surfaces are separate briefs. Reported at `E361` for Scott to overrule.
 */
export function describeTotal(t: DurationTotal): string {
  if (t.counted === 0) return "";
  const base = formatDuration(t.seconds);
  if (t.complete) return base;
  return `${base} across ${t.counted} of ${t.counted + t.missing} lessons`;
}
