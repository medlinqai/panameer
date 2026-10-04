import { prisma } from "@/lib/prisma";
import { growthScore } from "@/lib/growth-score";
import type { Viewer } from "@/lib/access";

export type Level = {
  /** 1-based, so `LEVEL 3` reads as 3. */
  number: number;
  name: string;
  /** XP at which this level begins. */
  floor: number;
};

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
  next: Level | null;
  toNext: number | null;
  percent: number;
};

export function standingFor(xp: number): LevelStanding {
  const safe = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
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

export async function levelStandingFor(personId: string): Promise<LevelStanding> {
  const score = await growthScore(personId, "all");
  return standingFor(score.points);
}

export async function standingForViewer(viewer: Viewer): Promise<LevelStanding | null> {
  const person = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return null;
  return levelStandingFor(person.id);
}
