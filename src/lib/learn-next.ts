import { prisma } from "@/lib/prisma";
import { learnCatalog, type CatPath } from "@/lib/learn-catalog";
import { pathState } from "@/lib/learn-state";
import { PILLAR_LABEL } from "@/lib/learn-area";
import { getSkillAreas } from "@/lib/skill-area-store";

// L-E046: one recommender for "what next". Order (Scott 2026-10-09): your profile's skills, then — after a path —
// the same area, the same pillar, its admin-set "Recommended next" links, then most learners. Each pick says why.
export type Pick = { path: CatPath; reason: string };
const LEVEL_RANK: Record<string, number> = { BEGINNER: 0, INTERMEDIATE: 1, ADVANCED: 2 };

async function skillAreasOf(userId: string): Promise<Set<string>> {
  const rows = await prisma.providerSkill.findMany({ where: { providerProfile: { person: { user_id: userId } } }, select: { skill: { select: { area: true } } } }).catch(() => []);
  return new Set(rows.map((r) => r.skill.area).filter((x): x is string => !!x));
}

/** The path the member most recently finished (every lesson out watched, or certified). */
async function lastFinished(userId: string, paths: CatPath[]): Promise<CatPath | null> {
  const done = paths.filter((p) => ["READY_TO_TEST", "CERTIFIED"].includes(pathState(p)));
  if (done.length <= 1) return done[0] ?? null;
  const latest = await prisma.lessonProgress.findFirst({ where: { user_id: userId, lesson: { section: { course: { learning_path_id: { in: done.map((p) => p.id) } } } } }, orderBy: { completed_at: "desc" }, select: { lesson: { select: { section: { select: { course: { select: { learning_path_id: true } } } } } } } });
  return done.find((p) => p.id === latest?.lesson.section.course.learning_path_id) ?? done[0];
}

export async function recommendNext(userId: string | null, opts: { after?: string | null; limit?: number; paths?: CatPath[] } = {}): Promise<{ picks: Pick[]; after: CatPath | null; skillMatched: boolean }> {
  const limit = opts.limit ?? 3;
  const paths = opts.paths ?? (await learnCatalog(userId));
  const after = opts.after ? paths.find((p) => p.id === opts.after || p.slug === opts.after) ?? null : userId ? await lastFinished(userId, paths) : null;
  const [skills, areas, links] = await Promise.all([
    userId ? skillAreasOf(userId) : Promise.resolve(new Set<string>()),
    getSkillAreas(),
    after ? prisma.learningPathNext.findMany({ where: { from_path_id: after.id }, orderBy: { sort_order: "asc" }, select: { to_path_id: true } }) : Promise.resolve([]),
  ]);
  const areaLabel = (code: string | null) => (code ? areas.find((a) => a.code === code)?.label.replace(/\s*\([A-Z0-9]+\)$/, "") ?? code : null);
  // Only paths you can start now, that you haven't finished, other than the one you just did.
  const open = paths.filter((p) => p.playable && p.id !== after?.id && ["NEW", "IN_PROGRESS"].includes(pathState(p)));
  const linked = new Map(links.map((l, i) => [l.to_path_id, i]));
  const byLevelThenLearners = (a: CatPath, b: CatPath) => (LEVEL_RANK[a.level ?? "INTERMEDIATE"] ?? 1) - (LEVEL_RANK[b.level ?? "INTERMEDIATE"] ?? 1) || b.learners - a.learners;

  const scored = open.map((p) => {
    let bucket = 5;
    let reason = "Popular with members";
    if (p.area && skills.has(p.area)) { bucket = 0; reason = `Matches your ${areaLabel(p.area)} skills`; }
    else if (after && p.area && p.area === after.area && after.area !== "START") { bucket = 1; reason = `Also in ${areaLabel(p.area)}`; }
    else if (after && p.pillar && after.pillar && p.pillar === after.pillar && after.pillar.toUpperCase() !== "FOUNDATIONS") { bucket = 2; reason = `Also in ${PILLAR_LABEL[p.pillar.toUpperCase()] ?? p.pillar}`; }
    else if (linked.has(p.id)) { bucket = 3; reason = `Next after ${after!.title}`; }
    // Within the skill bucket a seeded "next" link still goes first.
    if (bucket <= 2 && linked.has(p.id) && after) reason = bucket === 0 ? reason : `Next after ${after.title}`;
    return { p, bucket, link: linked.get(p.id) ?? 99, reason };
  });
  scored.sort((a, b) => a.bucket - b.bucket || a.link - b.link || byLevelThenLearners(a.p, b.p));
  return { picks: scored.slice(0, limit).map((s) => ({ path: s.p, reason: s.reason })), after, skillMatched: scored.some((s) => s.bucket === 0) };
}

/** "Already know it? Get certified" — the same order, limited to paths whose test is open (or all skill picks when none are). */
export async function testOutPicks(userId: string | null, opts: { after?: string | null; limit?: number; paths?: CatPath[] } = {}): Promise<Pick[]> {
  const { picks } = await recommendNext(userId, { ...opts, limit: 50 });
  const openTest = picks.filter((x) => x.path.test.ready);
  return (openTest.length ? openTest : picks).slice(0, opts.limit ?? 3);
}
