/**
 * PURE DERIVATIONS FOR THE LEARNER DASHBOARD (brief_learn_app_shell WS2).
 *
 * No prisma import: everything here takes rows that have already been read and
 * turns them into what the screen says. That is what lets the streak be computed
 * in the BROWSER — see the timezone note — while the same function is unit-
 * reasoned about from Node.
 */

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

/**
 * ⚠ THE LEARNER'S OWN TIMEZONE, NOT UTC — the brief calls this out by name:
 * *"an evening lesson must not land on tomorrow"*.
 *
 * For a learner in Eastern Time, a lesson finished at 8pm is stored as 00:00 the
 * NEXT DAY in UTC. Counting distinct UTC dates therefore breaks a streak that
 * the learner experienced as unbroken, and — worse — can show a 2-day streak for
 * one evening's work. The server does not know the browser's zone, so the two
 * surfaces that show a streak (the stat tile and the 10-day badge) are client
 * components that pass `Intl.DateTimeFormat().resolvedOptions().timeZone` into
 * this function. One function, two callers, no duplicated arithmetic.
 */
export function localDayKey(iso: string | Date, timeZone: string): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  /*
    `en-CA` because it formats as YYYY-MM-DD, which sorts lexicographically —
    so the caller can use string compare and never build a second Date.
  */
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

const dayNumber = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  /* UTC on purpose: these are already LOCAL calendar dates, so this is only
     being used as a day counter and must not shift them again. */
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
};

export type Streak = { current: number; best: number };

/**
 * Consecutive days with at least one completion.
 *
 * `current` counts back from today; a streak whose last day was YESTERDAY still
 * counts, because a learner who hasn't opened the app yet today has not broken
 * anything. Two days' silence ends it.
 */
export function streakFrom(completedAt: (string | Date)[], timeZone: string, now = new Date()): Streak {
  if (completedAt.length === 0) return { current: 0, best: 0 };

  const days = [...new Set(completedAt.map((t) => localDayKey(t, timeZone)))]
    .map(dayNumber)
    .sort((a, b) => b - a);

  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] === days[i - 1] - 1) run += 1;
    else run = 1;
    if (run > best) best = run;
  }

  const today = dayNumber(localDayKey(now, timeZone));
  let current = 0;
  if (days[0] === today || days[0] === today - 1) {
    current = 1;
    for (let i = 1; i < days.length; i++) {
      if (days[i] === days[i - 1] - 1) current += 1;
      else break;
    }
  }
  return { current, best };
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

/**
 * ⚠ NO NEW CURRENCY. The mockup reads `Level 4 · Practitioner · 620 XP` and
 * there is NO XP FIELD and there will not be one from this brief: this is a
 * BANDING OF LESSONS COMPLETED and nothing else, so it cannot drift from the
 * thing it describes and there is nothing to store, migrate or award.
 *
 * ⚠ AND IT IS NOT COMMUNITY CREDITS. `getCreditsSummary` still returns a hard
 * zero with `pending: true`; Credits are a separate, future, stored thing. If
 * these two ever get conflated the learner is being shown a balance.
 *
 * The band names are the brief's to hand over and mine to pick. They describe
 * how much of the catalog someone has watched, in the vocabulary this catalog
 * already uses about consultants.
 */
export const LEVEL_BANDS: { level: number; name: string; from: number }[] = [
  { level: 1, name: "Newcomer", from: 0 },
  { level: 2, name: "Starter", from: 5 },
  { level: 3, name: "Practitioner", from: 25 },
  { level: 4, name: "Specialist", from: 75 },
  { level: 5, name: "Authority", from: 175 },
  { level: 6, name: "Master", from: 350 },
];

export type LevelState = {
  level: number;
  name: string;
  /** Lessons at the bottom of this band. */
  from: number;
  /** Lessons needed for the next band; null at the top. */
  next: number | null;
  nextName: string | null;
  /** How far through this band, 0–1 — what the ring draws. */
  fraction: number;
  toNext: number;
};

export function levelFor(lessonsCompleted: number): LevelState {
  const n = Math.max(0, lessonsCompleted);
  let i = 0;
  for (let k = 0; k < LEVEL_BANDS.length; k++) if (n >= LEVEL_BANDS[k].from) i = k;
  const band = LEVEL_BANDS[i];
  const next = LEVEL_BANDS[i + 1] ?? null;
  return {
    level: band.level,
    name: band.name,
    from: band.from,
    next: next?.from ?? null,
    nextName: next?.name ?? null,
    /* Top band: the ring is full rather than empty — there is no next target,
       and an empty ring would read as "no progress" for the most-progressed
       learner on the platform. */
    fraction: next ? (n - band.from) / (next.from - band.from) : 1,
    toNext: next ? Math.max(0, next.from - n) : 0,
  };
}

// ---------------------------------------------------------------------------
// The computed headline
// ---------------------------------------------------------------------------

const WORDS = ["zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

/** `3` → `"Three"`, `14` → `"14"`. Spelled out only where it reads as prose. */
export const spell = (n: number) => (n >= 1 && n <= 9 ? WORDS[n] : String(n));

export type HeadlineInput = {
  /** Enrolled paths only, with what is left in each. */
  enrolled: { title: string; remaining: number; completed: number }[];
};

/**
 * ⚠ THE HEADLINE IS COMPUTED. A brand-new learner reading "three lessons from
 * your next certificate" is the same class of lie as a fabricated count, so the
 * empty case is a REQUIREMENT, not a fallback.
 *
 * FIVE outcomes, not three, and the two extra ones are the data's fault rather
 * than a design flourish. The brief names three — nothing enrolled, enrolled but
 * far off, and nearly there:
 *
 *   1  nothing enrolled                    "Pick a path and start."
 *   2  every lesson ticked, test not sat   ← EXTRA. Folding it into (3) prints
 *                                            "Zero lessons from your next
 *                                            certificate."
 *   3  within five of a certificate        the mocked line, spelled out
 *   4  enrolled, nothing watched yet       ← EXTRA. Folding it into (5) prints
 *                                            "You're 0 lessons into X."
 *   5  enrolled and under way              "You're N lessons into <path>."
 *
 * ⚠ CERTIFIED PATHS ARE NOT IN THE POOL. That filter lives in the CALLER
 * (`getMyLearning`) because it is the caller that knows about certificates, and
 * `check:learn` pins it there: without it the nearest-certificate search picks
 * the path with zero remaining — the one already certified — and tells a learner
 * holding the certificate to go and sit the test.
 */
export function headlineFor({ enrolled }: HeadlineInput): string {
  if (enrolled.length === 0) return "Pick a path and start.";

  const started = enrolled.filter((e) => e.completed > 0);
  const pool = started.length > 0 ? started : enrolled;
  const nearest = [...pool].sort((a, b) => a.remaining - b.remaining)[0];

  if (nearest.remaining === 0) return "Every lesson done — sit the test and claim the certificate.";
  if (nearest.remaining <= 5) {
    return `${spell(nearest.remaining)} lesson${nearest.remaining === 1 ? "" : "s"} from your next certificate.`;
  }
  if (nearest.completed === 0) return `You've started ${enrolled.length === 1 ? "a path" : `${enrolled.length} paths`}. Watch the first lesson.`;
  return `You're ${nearest.completed} lesson${nearest.completed === 1 ? "" : "s"} into ${nearest.title}.`;
}
