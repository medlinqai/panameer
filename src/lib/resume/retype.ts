import { prisma } from "@/lib/prisma";
import { splitList } from "@/lib/resume/split-list";
import { addTerms, removeKeywords } from "@/lib/terms";

// "This is a…": move a résumé piece to another type, carrying name/title/dates across.
export type PieceKind = "employer" | "project" | "edu" | "cert" | "skill" | "spec" | "keyword" | "term";
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
  if (from === "spec") {
    const r = match(await prisma.providerProfileSpecialization.findMany({ where: own, select: { specialization_id: true, specialization: { select: { name: true } } } }), (x) => x.specialization_id, (x) => x.specialization.name);
    return r ? { piece: { name: r.specialization.name, title: null, start: null, end: null }, remove: () => prisma.providerProfileSpecialization.deleteMany({ where: { ...own, specialization_id: r.specialization_id } }) } : null;
  }
  if (from === "keyword") {
    const p = await prisma.providerProfile.findUnique({ where: { id: profileId }, select: { keywords: true } });
    const k = (p?.keywords ?? []).find((x) => ("id" in ref ? x === ref.id : key(x) === ref.key));
    return k ? { piece: { name: k, title: null, start: null, end: null }, remove: () => removeKeywords(profileId, [k]) } : null;
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
  } else await addTerms(profileId, splitList(p.name));
}

/** Moves one piece; returns what it was, for the "Not needed" restore list. */
export async function retype(profileId: string, from: PieceKind, ref: PieceRef, to: Target) {
  const found = await readPiece(profileId, from, ref);
  if (!found) return null;
  await writePiece(profileId, to, found.piece);
  await found.remove();
  return found.piece;
}
