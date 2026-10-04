
// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

export function localDayKey(iso: string | Date, timeZone: string): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

const dayNumber = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
};

export type Streak = { current: number; best: number };

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
