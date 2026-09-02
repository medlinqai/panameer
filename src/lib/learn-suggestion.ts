import { prisma } from "@/lib/prisma";
import { experienceYears } from "@/lib/experience";

/**
 * THE SUGGESTED FIRST PATH — the right half of the `/learn` empty state
 * (`P1-J3-E043`).
 *
 * **SCOTT:** *"Split the 'Nothing on the go yet' into two halves. Put the
 * suggested first course (based on skills or on Foundations if they have no
 * skills or less than 2 years of experience)."*
 *
 * ── ⚠⚠ THE RULE IS SCOTT'S AND IS NOT EMBELLISHED ────────────────────────────
 *
 * Match on the learner's SKILLS. Fall back to Foundations when they have NO
 * SKILLS **or** FEWER THAN TWO YEARS of experience. That is the whole rule, and
 * `pickSuggestion` below is a transcription of exactly those two clauses.
 *
 * ⚠⚠ ONE CASE THE RULE DOES NOT COVER, AND IT IS FILLED WITH THE NEAREST
 * EXISTING CLAUSE RATHER THAN A NEW ONE: a learner who HAS skills and HAS two
 * years but whose skills match NOTHING in the catalog. The rule names no
 * outcome. Since the half must always render something, they fall to
 * Foundations — the same destination the rule already sends every other
 * unmatched learner to, with its own reason line so it is never disguised as a
 * skill match. **REPORTED, NOT DECIDED.**
 *
 * ── ⚠⚠ BOTH INPUTS ALREADY EXISTED AND WERE VERIFIED, NOT REBUILT ────────────
 *
 *   · YEARS — `experienceYears()` in `lib/experience.ts:91`, the `E068`
 *     derive-don't-ask primitive, fed the UNION of `Employer` and `Project`
 *     spans. That is the identical span list `provider-profile-view.ts:169`
 *     builds for the profile hero, so the number here and the number on the
 *     profile cannot disagree.
 *   · SKILLS — `ProviderSkill` -> `Skill.name`, the résumé-derived rollup. No
 *     new field, no new table.
 *
 * ── ⚠⚠ THERE IS NO SKILL-TO-PATH RELATION IN THE SCHEMA, AND BUILDING ONE IS
 *       `P1-J3-E046`, WHICH THIS BRIEF FORBIDS ────────────────────────────────
 *
 * `LearningPath` has `title`, `slug`, `summary`, `audience` and `group` and NO
 * link to `Skill`. So the match is a RUNTIME TEXT MATCH of skill names against
 * each path's title and group — no schema, no tagging UI, no stored edge. That
 * is deliberately NOT the skill nexus; it is the only thing available without
 * building it, and it is disclosed rather than dressed up.
 *
 * ── ⚠⚠ "FOUNDATIONS" IS NOT A PATH. NO PATH HAS THAT TITLE ───────────────────
 *
 * Read live 2026-09-02, all 23 paths PUBLISHED. There is no `Foundations`, no
 * `Foundation`, and the one path literally titled `Beginners` is an END_USER
 * single-course path in no group. What DOES exist is the BEGINNERS audience,
 * whose `Foundational Learning Paths` group holds `1. Background`,
 * `2. Overview` and `3. Roles & Careers` in that sort order.
 *
 * So Foundations resolves in TIERS, first hit wins, each one narrower than a
 * guess and every one of them reported:
 *   1. PUBLISHED · audience `BEGINNERS` · group matching /foundation/i
 *   2. PUBLISHED · audience `BEGINNERS`, any group
 *   3. PUBLISHED · title matching /foundation|beginner/i  (this is what would
 *      catch a path someone later actually names "Foundations")
 *   4. any PUBLISHED path at all
 *   5. `null` — and then the empty state renders its ORIGINAL single block
 *      rather than an empty half. ⚠ A DRAFT PATH IS NEVER SUGGESTED at any
 *      tier: `getMyLearning` only ever reads `status: "PUBLISHED"`, so an
 *      unpublished Foundations cannot leak into a suggestion.
 * ⚠ ALREADY-ENROLLED PATHS ARE EXCLUDED AT EVERY TIER. Suggesting a path they
 * are already in is the one suggestion guaranteed to be useless.
 */

/** The fields the picker needs. A subset of `DashPath` on purpose. */
export type SuggestPath = {
  id: string;
  title: string;
  slug: string;
  group: string | null;
  audience: string;
  lessons: number;
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

/** Scott's number. Below this, Foundations. */
export const MIN_YEARS_FOR_SKILL_MATCH = 2;

/*
  ⚠ WORDS THAT DESCRIBE A PATH'S SHAPE RATHER THAN ITS SUBJECT. Without these,
  `Absence Management` would "match" `Inventory Management` on the word they
  share and the reason line would be a lie. Token matching only runs on what is
  left after these come out.
*/
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

/**
 * Does this skill describe this path?
 *
 * Whole-phrase containment in EITHER direction first — `Payables` inside
 * `Basic Payables`, and `Inventory Management` around `Inventory`. Then a
 * subject-token overlap, which is what lets the skill `Procurement` reach
 * `Contract Management` through its GROUP rather than its title.
 */
export function skillMatchesPath(skill: string, path: SuggestPath): boolean {
  const hay = norm(`${path.title} ${path.group ?? ""}`);
  const needle = norm(skill);
  if (!needle || !hay) return false;
  if (hay.includes(needle) || needle.includes(hay)) return true;
  const hayTokens = new Set(tokens(hay));
  return tokens(needle).some((t) => hayTokens.has(t));
}

/*
  ⚠⚠ THESE FOUR REASON LINES ARE CC'S WORDS, NOT SCOTT'S. He specified the
  SELECTION rule and said the half carries "a reason line"; he did not write the
  sentences. They are reported verbatim in the `E043` report so he can replace
  any of them — each is one string in this file and nothing else reads them.
*/
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

/**
 * THE PICKER. Pure — no database, no clock — so `check:learn` can drive every
 * branch of Scott's rule without a fixture account.
 */
export function pickSuggestion(
  paths: SuggestPath[],
  signal: LearnerSignal
): Suggestion | null {
  /* Never suggest something they are already in. */
  const open = paths.filter((p) => !p.enrolled && !p.certified);

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

  /* ⚠ SCOTT'S TWO FALLBACK CLAUSES, IN HIS ORDER. */
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

  /* ⚠ THE UNCOVERED CASE — see the header. Foundations, with its own reason. */
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

/**
 * The two inputs, read once.
 *
 * ⚠ A LEARNER WITH NO PROVIDER PROFILE IS NORMAL, NOT AN ERROR. A buyer, an
 * admin, or a brand-new account has none — `findFirst` returns null, and they
 * come back as zero skills and zero years, which is precisely the state Scott's
 * first fallback clause already describes. No throw, no special case.
 */
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
