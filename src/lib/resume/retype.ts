import { prisma } from "@/lib/prisma";
import { OFFERABLE, activeCatalogId } from "@/lib/catalog";
import { SELF_ADDED_WEIGHT } from "@/lib/provider-rollup";
import { formatSkillName, matchSkill } from "@/lib/skill-match";
import { autoLinkSameLetters, notifyCatalogReview } from "@/lib/catalog-review";
import { splitList } from "@/lib/resume/split-list";

// "This is a…": move a résumé piece to another type, carrying name/title/dates across.
export type PieceKind = "employer" | "project" | "edu" | "cert" | "skill" | "term";
export type Target = "employer" | "project" | "edu" | "cert" | "skill" | "hidden";
export type Piece = { name: string; title: string | null; start: string | null; end: string | null };
export type PieceRef = { id: string } | { key: string };

const key = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const ofYear = (y: number | null) => (y ? `${y}-01-01` : null);
const date = (s: string | null) => (s ? new Date(s) : null);
const yearOf = (s: string | null) => (s ? Number(s.slice(0, 4)) || null : null);
const clip = (s: string | null | undefined) => (s ?? "").trim().slice(0, 200);


type Found = { piece: Piece; remove: () => Promise<unknown> };

/** The piece behind a row (by id) or, on replay after a re-read, by its normalized name. */
export async function readPiece(profileId: string, from: PieceKind, ref: PieceRef): Promise<Found | null> {
  const own = { provider_profile_id: profileId };
  const match = <T>(rows: T[], id: (r: T) => string, name: (r: T) => string) => rows.find((r) => ("id" in ref ? id(r) === ref.id : key(name(r)) === ref.key));
  if (from === "term") return "key" in ref ? { piece: { name: ref.key, title: null, start: null, end: null }, remove: async () => null } : null;
  if (from === "employer") {
    const r = match(await prisma.employer.findMany({ where: own }), (x) => x.id, (x) => x.name ?? "");
    return r ? { piece: { name: r.name ?? "", title: r.role_title, start: iso(r.start_date), end: iso(r.end_date) }, remove: () => prisma.employer.delete({ where: { id: r.id } }) } : null;
  }
  if (from === "project") {
    const r = match(await prisma.project.findMany({ where: own }), (x) => x.id, (x) => x.client_name || x.name);
    if (!r) return null;
    const piece = r.client_name ? { name: r.client_name, title: r.name !== r.client_name ? r.name : null } : { name: r.name, title: null };
    return { piece: { ...piece, start: iso(r.start_date), end: iso(r.end_date) }, remove: () => prisma.project.delete({ where: { id: r.id } }) };
  }
  if (from === "edu") {
    const r = match(await prisma.education.findMany({ where: own }), (x) => x.id, (x) => x.institution);
    return r ? { piece: { name: r.institution, title: r.degree, start: ofYear(r.start_year), end: ofYear(r.end_year ?? r.year) }, remove: () => prisma.education.delete({ where: { id: r.id } }) } : null;
  }
  if (from === "cert") {
    const r = match(await prisma.certification.findMany({ where: own }), (x) => x.id, (x) => x.name);
    return r ? { piece: { name: r.name, title: r.issuer, start: iso(r.issued_on) ?? ofYear(r.year), end: null }, remove: () => prisma.certification.delete({ where: { id: r.id } }) } : null;
  }
  const r = match(await prisma.providerSkill.findMany({ where: own, select: { id: true, skill: { select: { name: true } } } }), (x) => x.id, (x) => x.skill.name);
  return r ? { piece: { name: r.skill.name, title: null, start: null, end: null }, remove: () => prisma.providerSkill.delete({ where: { id: r.id } }) } : null;
}

/** Writes the piece as `to` (skipping a row that already exists under that name). */
export async function writePiece(profileId: string, to: Target, p: Piece) {
  const own = { provider_profile_id: profileId };
  const name = clip(p.name);
  if (!name || to === "hidden") return;
  if (to === "employer") {
    const have = (await prisma.employer.findMany({ where: own, select: { name: true } })).some((e) => key(e.name) === key(name));
    if (!have) await prisma.employer.create({ data: { ...own, name, role_title: clip(p.title) || null, start_date: date(p.start), end_date: date(p.end) } });
  } else if (to === "project") {
    const have = (await prisma.project.findMany({ where: own, select: { client_name: true, name: true } })).some((x) => key(x.client_name || x.name) === key(name));
    if (!have) await prisma.project.create({ data: { ...own, client_name: name, name: clip(p.title) || name, start_date: date(p.start), end_date: date(p.end) } });
  } else if (to === "edu") {
    const have = (await prisma.education.findMany({ where: own, select: { institution: true } })).some((x) => key(x.institution) === key(name));
    if (!have) await prisma.education.create({ data: { ...own, institution: name, degree: clip(p.title) || null, start_year: yearOf(p.start), end_year: yearOf(p.end) } });
  } else if (to === "cert") {
    const prof = await prisma.providerProfile.findUnique({ where: { id: profileId }, select: { person: { select: { user_id: true } } } });
    const userId = prof?.person.user_id;
    if (!userId) return;
    const have = new Set((await prisma.certification.findMany({ where: own, select: { name: true } })).map((x) => key(x.name)));
    const names = splitList(p.name);
    const single = names.length === 1;
    for (const n of names)
      if (!have.has(key(n))) await prisma.certification.create({ data: { ...own, user_id: userId, name: clip(n), issuer: single ? clip(p.title) || null : null, issued_on: single ? date(p.start) : null } });
  } else await addMemberSkills(profileId, splitList(p.name));
}

/** Moves one piece; returns what it was, for the "Not needed" restore list. */
export async function retype(profileId: string, from: PieceKind, ref: PieceRef, to: Target) {
  const found = await readPiece(profileId, from, ref);
  if (!found) return null;
  await writePiece(profileId, to, found.piece);
  await found.remove();
  return found.piece;
}

/** Skills by name: catalog matches link; the rest become the member's own, suggested to the catalog. */
export async function addMemberSkills(profileId: string, names: string[]) {
  const [p, catalogId, rows] = await Promise.all([
    prisma.providerProfile.findUnique({ where: { id: profileId }, select: { role_type_id: true, pillar_id: true } }),
    activeCatalogId(),
    prisma.skill.findMany({ where: OFFERABLE, select: { id: true, name: true, is_custom: true } }),
  ]);
  const known = rows.map((r) => ({ id: r.id, name: r.name, isCustom: r.is_custom }));
  const ids: string[] = [];
  const fresh: string[] = [];
  for (const raw of names.slice(0, 30)) {
    const name = formatSkillName(raw.trim().slice(0, 120));
    if (!name) continue;
    const m = matchSkill(name, known);
    if (m.kind === "exact") { ids.push(m.skill.id); continue; }
    if (!p?.role_type_id || !p.pillar_id || !catalogId) continue;
    const s = await prisma.skill.upsert({
      where: { catalog_id_role_type_id_pillar_id_name: { catalog_id: catalogId, role_type_id: p.role_type_id, pillar_id: p.pillar_id, name } },
      update: {},
      create: { catalog_id: catalogId, role_type_id: p.role_type_id, pillar_id: p.pillar_id, name, is_custom: true, origin: "PROVIDER", review_pending: true },
    });
    ids.push(s.id);
    if (Date.now() - s.created_at.getTime() < 60_000) fresh.push(s.id);
  }
  if (ids.length) await prisma.providerSkill.createMany({ data: ids.map((skill_id) => ({ provider_profile_id: profileId, skill_id, source: "SELF_ADDED" as const, weight: SELF_ADDED_WEIGHT })), skipDuplicates: true });
  if (fresh.length) {
    await autoLinkSameLetters({ skills: fresh });
    await notifyCatalogReview(undefined, profileId);
  }
}
