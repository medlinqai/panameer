
export const MEASURED_DURATION_SOURCE = "vimeo";

export function shownRunTime(lesson: {
  run_time: string | null;
  duration_source: string | null;
}): string | null {
  if (lesson.duration_source !== MEASURED_DURATION_SOURCE) return null;
  return lesson.run_time?.trim() || null;
}

export const DURATION_CEILING_SECONDS = 7200;

export type ParsedDuration =
  | { ok: true; seconds: number }
  | { ok: false; reason: "empty" | "status_word" | "unrecognised" | "seconds_not_zero" | "over_ceiling"; raw: string };

export function parseRunTime(raw: string | null | undefined): ParsedDuration {
  const s = (raw ?? "").trim();
  if (!s) return { ok: false, reason: "empty", raw: s };

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
  if (seconds > DURATION_CEILING_SECONDS) return { ok: false, reason: "over_ceiling", raw };
  return { ok: true, seconds };
}

export type DurationTotal = {
  /** Sum of every lesson that HAS a duration. */
  seconds: number;
  /** How many lessons contributed. */
  counted: number;
  missing: number;
  /** True only when nothing was left out. */
  complete: boolean;
};

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

/** The sentence a surface may print. IT NAMES THE GAP RATHER THAN HIDING IT. */
export function describeTotal(t: DurationTotal): string {
  if (t.counted === 0) return "";
  const base = formatDuration(t.seconds);
  if (t.complete) return base;
  return `${base} across ${t.counted} of ${t.counted + t.missing} lessons`;
}
