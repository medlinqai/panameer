import { prisma } from "@/lib/prisma";
import { experienceYears } from "@/lib/experience";

/** The fields the picker needs. A subset of `DashPath` on purpose. */
export type SuggestPath = {
  id: string;
  title: string;
  slug: string;
  group: string | null;
  audience: string;
  lessons: number;
  playableLessons?: number;
  courses: number;
  enrolled: boolean;
  certified: boolean;
};

export type LearnerSignal = {
  /** `Skill.name` for every row on the provider profile. Empty for a buyer. */
  skills: string[];
  /** Derived from the union of employer + project spans. 0 with no history. */
  years: number;
  /** False when the learner has no provider profile at all. */
  hasProfile: boolean;
};

export type Suggestion = {
  title: string;
  slug: string;
  lessons: number;
  courses: number;
  /** Why this one — rendered under the title. */
  reason: string;
  /** `skills` or `foundations`. Lets the harness assert the branch. */
  basis: "skills" | "foundations";
};

export const MIN_YEARS_FOR_SKILL_MATCH = 2;

const NOISE = new Set([
  "management", "mgmt", "basic", "advanced", "core", "admin", "administration",
  "how", "configure", "deploy", "deployment", "implement", "introduction",
  "intro", "overview", "background", "business", "processing", "channels",
  "general", "cloud", "oracle", "learning", "learn", "path", "paths", "course",
  "courses", "and", "the", "for", "with", "your", "end", "user", "getting",
  "started", "login", "roles", "careers", "journal", "beginners", "foundational",
]);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const tokens = (s: string) =>
  norm(s)
    .split(" ")
    .filter((t) => t.length >= 4 && !NOISE.has(t));

export function skillMatchesPath(skill: string, path: SuggestPath): boolean {
  const hay = norm(`${path.title} ${path.group ?? ""}`);
  const needle = norm(skill);
  if (!needle || !hay) return false;
  if (hay.includes(needle) || needle.includes(hay)) return true;
  const hayTokens = new Set(tokens(hay));
  return tokens(needle).some((t) => hayTokens.has(t));
}

// THESE FOUR REASON LINES ARE CC'S WORDS, NOT SCOTT'S. He specified the
export const REASON_NO_SKILLS =
  "No skills on your profile yet, so start where everyone starts.";
export const REASON_TOO_NEW =
  "Under two years of experience, so start where everyone starts.";
export const REASON_NO_MATCH =
  "Nothing in the catalog lines up with your skills yet, so start where everyone starts.";
export const reasonForSkills = (matched: string[]) =>
  matched.length === 1
    ? `Because ${matched[0]} is on your profile.`
    : `Because ${matched.slice(0, -1).join(", ")} and ${matched[matched.length - 1]} are on your profile.`;

/** How many matched skills the reason line will name. Three is a sentence. */
const MAX_NAMED_SKILLS = 3;

/** THE PICKER. Pure — no database, no clock — so `check:learn` can drive every */
export function pickSuggestion(
  paths: SuggestPath[],
  signal: LearnerSignal
): Suggestion | null {
  // Never suggest something they are already in.
  const open = paths.filter(
    (p) => !p.enrolled && !p.certified && p.playableLessons !== 0
  );

  const foundations = (reason: string): Suggestion | null => {
    const tiers: ((p: SuggestPath) => boolean)[] = [
      (p) => p.audience === "BEGINNERS" && /foundation/i.test(p.group ?? ""),
      (p) => p.audience === "BEGINNERS",
      (p) => /foundation|beginner/i.test(p.title),
      () => true,
    ];
    for (const tier of tiers) {
      const hit = open.find(tier);
      if (hit) return { title: hit.title, slug: hit.slug, lessons: hit.lessons, courses: hit.courses, reason, basis: "foundations" };
    }
    return null;
  };

  /* SCOTT'S TWO FALLBACK CLAUSES, IN HIS ORDER. */
  if (signal.skills.length === 0) return foundations(REASON_NO_SKILLS);
  if (signal.years < MIN_YEARS_FOR_SKILL_MATCH) return foundations(REASON_TOO_NEW);

  let best: { path: SuggestPath; matched: string[] } | null = null;
  for (const p of open) {
    const matched = signal.skills.filter((s) => skillMatchesPath(s, p));
    if (matched.length === 0) continue;
    /* Most matched skills wins; ties go to the shorter path, which is the one
       they can actually finish. */
    if (
      !best ||
      matched.length > best.matched.length ||
      (matched.length === best.matched.length && p.lessons < best.path.lessons)
    ) {
      best = { path: p, matched };
    }
  }

  /* THE UNCOVERED CASE — see the header. Foundations, with its own reason. */
  if (!best) return foundations(REASON_NO_MATCH);

  /* De-duplicated: the rollup can hold the same `Skill.name` twice through two
     different catalog rows, and naming it twice reads as a bug. */
  const named = [...new Set(best.matched)].slice(0, MAX_NAMED_SKILLS);
  return {
    title: best.path.title,
    slug: best.path.slug,
    lessons: best.path.lessons,
    courses: best.path.courses,
    reason: reasonForSkills(named),
    basis: "skills",
  };
}

/** The two inputs, read once. */
export async function getLearnerSignal(userId: string): Promise<LearnerSignal> {
  const profile = await prisma.providerProfile.findFirst({
    where: { person: { user_id: userId } },
    select: {
      skills: { select: { skill: { select: { name: true } } } },
      employers: { select: { start_date: true, end_date: true, is_current: true } },
      projects: { select: { start_date: true, end_date: true, is_current: true } },
    },
  });
  if (!profile) return { skills: [], years: 0, hasProfile: false };
  return {
    hasProfile: true,
    skills: profile.skills.map((s) => s.skill.name).filter(Boolean),
    years: experienceYears([
      ...profile.employers.map((e) => ({ start: e.start_date, end: e.end_date, isCurrent: e.is_current })),
      ...profile.projects.map((p) => ({ start: p.start_date, end: p.end_date, isCurrent: p.is_current })),
    ]),
  };
}
