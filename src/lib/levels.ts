import { prisma } from "@/lib/prisma";
import { growthScore } from "@/lib/growth-score";
import type { Viewer } from "@/lib/access";

/**
 * ── ⚠⚠⚠ LEVELS AND XP — SCOTT, 2026-09-25 ───────────────────────────────
 *
 * ⚠ The `community_page_2026-09-20` mockup shows **`LEVEL 3 · PRACTITIONER`**,
 * **`340 XP`** and a bar reading **`360 to Level 4`**. The live page counted
 * POINTS THIS MONTH and had no levels at all. ⚠⚠ Asked which model was real,
 * Scott chose: **build XP and levels.**
 *
 * ── ⚠⚠⚠ WHY THIS IS NOT A MECHANISM WITH NO WRITER ──────────────────────
 *
 * ⚠⚠ **THE RUN'S THIRD STOP IS "a mechanism with no writer — never invent one",
 * and I checked before building rather than after.** ⚠ A level is **not** a new
 * quantity: `GrowthWindow` already has an `"all"` member, so
 * `growthScore(personId, "all")` is an ALL-TIME total computed from rows that
 * already exist — `ColleagueInvite` for invited, `accepted_person_id` for joined.
 * ⚠⚠⚠ **XP IS THAT TOTAL UNDER ANOTHER NAME, AND A LEVEL IS A THRESHOLD OVER
 * IT.** Nothing new is written, nothing is stored, and there is no column that
 * could silently stay zero.
 *
 * ⚠ **SO THE ONE FIGURE HAS TWO WINDOWS, NOT TWO DEFINITIONS:** the Grow card's
 * *"points this month"* is `growthScore(…, "month")` and XP is
 * `growthScore(…, "all")`. ⚠⚠ Same function, same weights — **a second scoring
 * rule is the thing that would make a board quote two different totals**, which
 * `growth-score.ts`'s own header says is the defect it exists to prevent.
 *
 * ── ⚠⚠ THE LADDER, AND WHY IT IS STATED HERE ONCE ───────────────────────
 *
 * ⚠⚠⚠ **THE THRESHOLDS ARE A NUMBER SCOTT HAS NOT SUPPLIED**, exactly as
 * `HOURS_PER_DAY` was. ⚠ They are anchored to the mockup, which is the only
 * evidence available: it shows **340 XP inside Level 3** with **360 more to reach
 * Level 4**, so Level 4 begins at **700**. A ladder of 0 · 100 · 250 · 700 · 1500
 * · 3000 puts 340 in Level 3 and makes the mockup's own numbers true.
 * ⚠⚠ **REPORTED AS OWED.** A mockup is a layout, not a data source — its figures
 * are illustration — so these are a defensible starting ladder and **not a
 * decision anybody has made.** ⚠ One place, so changing them is one edit.
 *
 * ⚠ The names are the practitioner ladder the product already speaks in
 * (`PRACTITIONER` appears in the mockup itself). **No name claims a credential**
 * — these describe reach on Panameer, not expertise, which is what `E433`'s
 * honesty rule and the writer test both require.
 */
export type Level = {
  /** 1-based, so `LEVEL 3` reads as 3. */
  number: number;
  name: string;
  /** XP at which this level begins. */
  floor: number;
};

/**
 * ⚠⚠ ONE LADDER, ONE PLACE (`E585`). ⚠⚠⚠ **DO NOT RESTATE A THRESHOLD IN A
 * COMPONENT** — the card, the header and any future board must all ask this, or
 * two surfaces will disagree about which level somebody is on.
 */
export const LEVELS: Level[] = [
  { number: 1, name: "Newcomer", floor: 0 },
  { number: 2, name: "Contributor", floor: 100 },
  { number: 3, name: "Practitioner", floor: 250 },
  { number: 4, name: "Connector", floor: 700 },
  { number: 5, name: "Builder", floor: 1500 },
  { number: 6, name: "Cornerstone", floor: 3000 },
];

export type LevelStanding = {
  xp: number;
  level: Level;
  /** ⚠ `null` at the top of the ladder — there is no next level to reach. */
  next: Level | null;
  /** ⚠ `null` at the top. XP still needed to reach `next`. */
  toNext: number | null;
  /**
   * ⚠⚠ 0–100 THROUGH THE CURRENT LEVEL, for the bar.
   * ⚠⚠⚠ **`100` AT THE TOP OF THE LADDER, NOT `0`.** A full bar is the honest
   * picture of "there is no further to go"; an empty one would read as no
   * progress at all, which is the opposite of the truth.
   */
  percent: number;
};

/**
 * ⚠⚠ THE DERIVATION, GIVEN AN XP TOTAL. Pure, so it is testable without a
 * database and the gate can exercise every rung.
 *
 * ⚠ NEGATIVE OR FRACTIONAL XP CANNOT ARRIVE from `growthScore` (its weights are
 * positive integers), but the floor and the rounding are defensive anyway —
 * a `percent` of `-4` would render as a bar pointing backwards.
 */
export function standingFor(xp: number): LevelStanding {
  const safe = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  /* ⚠ The LAST level whose floor it has reached — a scan, not an index, so the
     ladder can gain or lose a rung without touching this. */
  let level = LEVELS[0]!;
  for (const l of LEVELS) if (safe >= l.floor) level = l;
  const next = LEVELS.find((l) => l.floor > level.floor) ?? null;

  if (!next) {
    return { xp: safe, level, next: null, toNext: null, percent: 100 };
  }
  const span = next.floor - level.floor;
  const through = safe - level.floor;
  return {
    xp: safe,
    level,
    next,
    toNext: Math.max(0, next.floor - safe),
    percent: span > 0 ? Math.min(100, Math.max(0, Math.round((through / span) * 100))) : 0,
  };
}

/**
 * ⚠⚠ THE MEMBER'S STANDING, FROM THE ALL-TIME SCORE.
 *
 * ⚠ `growthScore(personId, "all")` — **the same function the monthly card uses,
 * with a different window.** ⚠⚠ That is the whole reason this file holds no
 * scoring logic of its own.
 */
export async function levelStandingFor(personId: string): Promise<LevelStanding> {
  const score = await growthScore(personId, "all");
  return standingFor(score.points);
}

/**
 * ⚠⚠ THE SAME STANDING, FROM A VIEWER — the shape every page already has.
 *
 * ⚠ `Viewer` carries a `userId` and capability flags, **not a `personId`** —
 * `community-hero.ts` records the same trap in terms, and `/community/grow`
 * records it again (*"`viewer.personId` failed to typecheck"*). ⚠⚠ So the Person
 * is looked up the same way here rather than a third shape being invented.
 *
 * ⚠⚠⚠ **`null` WHEN THERE IS NO PERSON ROW, NEVER A LEVEL 1.** A signed-in user
 * with no backbone has not earned a level; showing one would be a figure with no
 * writer wearing a label. ⚠ It is the same `null` `getCommunityHero` returns for
 * the same reason, so the two degrade together.
 */
export async function standingForViewer(viewer: Viewer): Promise<LevelStanding | null> {
  const person = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return null;
  return levelStandingFor(person.id);
}
