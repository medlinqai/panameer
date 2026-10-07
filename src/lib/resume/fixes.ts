import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normCompany } from "@/lib/resume/company-list";
import { applyCompanySort, type SortChoice } from "@/lib/resume/company-sort";
import { removeKeywords } from "@/lib/terms";
import { retype, type Piece, type PieceKind, type Target } from "@/lib/resume/retype";

// The member's résumé-review fixes, kept on the profile and re-applied after any re-read.
export type FixKind = "skill" | "spec" | "keyword" | "newSkill" | "junk" | "project" | "cert" | "edu" | "company";
export type Move = { from: PieceKind; key: string; to: Target };
export type Hidden = { id: string; from: PieceKind; piece: Piece };
export type ResumeFixes = { removed: Partial<Record<FixKind, string[]>>; switches: Record<string, SortChoice>; keepBoth?: string[]; moves?: Move[]; hidden?: Hidden[] };
export const fixKey = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();

export async function loadFixes(profileId: string): Promise<ResumeFixes> {
  const p = await prisma.providerProfile.findUnique({ where: { id: profileId }, select: { resume_fixes: true } });
  const f = (p?.resume_fixes ?? null) as ResumeFixes | null;
  return { removed: f?.removed ?? {}, switches: f?.switches ?? {}, keepBoth: f?.keepBoth ?? [], moves: f?.moves ?? [], hidden: f?.hidden ?? [] };
}

export async function saveFixes(profileId: string, f: ResumeFixes) {
  await prisma.providerProfile.update({ where: { id: profileId }, data: { resume_fixes: f as unknown as Prisma.InputJsonValue } });
}

export async function recordRemoved(profileId: string, kind: FixKind, names: string[]) {
  const f = await loadFixes(profileId);
  f.removed[kind] = [...new Set([...(f.removed[kind] ?? []), ...names.map(fixKey).filter(Boolean)])];
  await saveFixes(profileId, f);
}

export async function forgetRemoved(profileId: string, kind: FixKind, name: string) {
  const f = await loadFixes(profileId);
  f.removed[kind] = (f.removed[kind] ?? []).filter((x) => x !== fixKey(name));
  await saveFixes(profileId, f);
}

export async function recordSwitch(profileId: string, company: string, choice: SortChoice) {
  const f = await loadFixes(profileId);
  f.switches[normCompany(company)] = choice;
  await saveFixes(profileId, f);
}

/** After a (re-)read is applied: take out what the member removed and re-apply their company switches. */
export async function applyResumeFixes(profileId: string) {
  const f = await loadFixes(profileId);
  const has = (kind: FixKind, name: string | null | undefined) => (f.removed[kind] ?? []).includes(fixKey(name));
  const [specs, prof] = await Promise.all([
    prisma.providerProfileSpecialization.findMany({ where: { provider_profile_id: profileId }, select: { specialization_id: true, specialization: { select: { name: true } } } }),
    prisma.providerProfile.findUnique({ where: { id: profileId }, select: { keywords: true } }),
  ]);
  const dropSpecs = specs.filter((r) => has("spec", r.specialization.name)).map((r) => r.specialization_id);
  if (dropSpecs.length) await prisma.providerProfileSpecialization.deleteMany({ where: { provider_profile_id: profileId, specialization_id: { in: dropSpecs } } });
  const dropWords = (prof?.keywords ?? []).filter((k) => has("keyword", k));
  if (dropWords.length) await removeKeywords(profileId, dropWords);
  const [skills, projects, certs, edu] = await Promise.all([
    prisma.providerSkill.findMany({ where: { provider_profile_id: profileId }, select: { id: true, skill: { select: { name: true } } } }),
    prisma.project.findMany({ where: { provider_profile_id: profileId }, select: { id: true, name: true } }),
    prisma.certification.findMany({ where: { provider_profile_id: profileId }, select: { id: true, name: true } }),
    prisma.education.findMany({ where: { provider_profile_id: profileId }, select: { id: true, institution: true, degree: true } }),
  ]);
  const del = <T extends { id: string }>(rows: T[], test: (r: T) => boolean) => rows.filter(test).map((r) => r.id);
  await Promise.all([
    prisma.providerSkill.deleteMany({ where: { id: { in: del(skills, (r) => has("skill", r.skill.name)) } } }),
    prisma.project.deleteMany({ where: { id: { in: del(projects, (r) => has("project", r.name)) } } }),
    prisma.certification.deleteMany({ where: { id: { in: del(certs, (r) => has("cert", r.name)) } } }),
    prisma.education.deleteMany({ where: { id: { in: del(edu, (r) => has("edu", `${r.institution} ${r.degree ?? ""}`)) } } }),
  ]);
  const switches = Object.entries(f.switches);
  if (switches.length) await applyCompanySort(profileId, switches.map(([name, choice]) => ({ name, choice })));
  // "This is a…" moves, replayed by name; a piece already moved is simply not found.
  for (const m of f.moves ?? []) if (m.from !== "term") await retype(profileId, m.from, { key: m.key }, m.to);
}
