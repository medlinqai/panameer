import { prisma } from "@/lib/prisma";
import { OFFERABLE, OFFERABLE_BASE } from "@/lib/catalog";
import { SELF_ADDED_WEIGHT } from "@/lib/provider-rollup";
import { notifyCatalogReview } from "@/lib/catalog-review";

// The catalog sorts a member's term: catalog skill → Skill, catalog specialization → Specialization, else a Keyword.
export const termKey = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
export type SpecKind = "PRODUCT" | "METHODOLOGY" | "INDUSTRY";
export type SortedTerms = { skills: { id: string; name: string }[]; specs: { id: string; name: string; kind: SpecKind }[]; keywords: string[] };

export async function catalogIndex() {
  const [skills, specs] = await Promise.all([
    prisma.skill.findMany({ where: OFFERABLE, select: { id: true, name: true, aliases: true } }),
    prisma.specialization.findMany({ where: { ...OFFERABLE_BASE, merged_into_id: null }, select: { id: true, name: true, aliases: true, kind: true } }),
  ]);
  const skill = new Map<string, { id: string; name: string }>();
  const spec = new Map<string, { id: string; name: string; kind: SpecKind }>();
  for (const s of skills) for (const n of [s.name, ...s.aliases]) if (termKey(n) && !skill.has(termKey(n))) skill.set(termKey(n), { id: s.id, name: s.name });
  for (const s of specs) for (const n of [s.name, ...s.aliases]) if (termKey(n) && !spec.has(termKey(n))) spec.set(termKey(n), { id: s.id, name: s.name, kind: s.kind });
  return { skill, spec };
}
export type CatalogIndex = Awaited<ReturnType<typeof catalogIndex>>;

/** Sorts terms by the catalog, deduped case/space/punctuation-insensitively; keywords keep the member's spelling. */
export function sortTerms(names: string[], idx: CatalogIndex): SortedTerms {
  const seen = new Set<string>();
  const out: SortedTerms = { skills: [], specs: [], keywords: [] };
  for (const raw of names) {
    const name = raw.trim();
    const k = termKey(name);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    const sk = idx.skill.get(k);
    const sp = idx.spec.get(k);
    if (sk) out.skills.push(sk);
    else if (sp) out.specs.push(sp);
    else out.keywords.push(name.slice(0, 80));
  }
  return out;
}

/** Adds the terms to the profile where the catalog puts them. */
export async function addTerms(profileId: string, names: string[], idx?: CatalogIndex) {
  const sorted = sortTerms(names, idx ?? (await catalogIndex()));
  if (sorted.skills.length)
    await prisma.providerSkill.createMany({ data: sorted.skills.map((s) => ({ provider_profile_id: profileId, skill_id: s.id, source: "SELF_ADDED" as const, weight: SELF_ADDED_WEIGHT })), skipDuplicates: true });
  if (sorted.specs.length)
    await prisma.providerProfileSpecialization.createMany({ data: sorted.specs.map((s) => ({ provider_profile_id: profileId, specialization_id: s.id })), skipDuplicates: true });
  if (sorted.keywords.length) await addKeywords(profileId, sorted.keywords);
  return sorted;
}

async function writeKeywords(profileId: string, list: string[]) {
  const seen = new Set<string>();
  const keywords = list.map((x) => x.trim().slice(0, 80)).filter((x) => { const k = termKey(x); if (!k || seen.has(k)) return false; seen.add(k); return true; }).slice(0, 60);
  await prisma.providerProfile.update({ where: { id: profileId }, data: { keywords, keywords_text: keywords.length ? keywords.join(" | ").toLowerCase() : null } });
  return keywords;
}

export async function addKeywords(profileId: string, names: string[]) {
  const p = await prisma.providerProfile.findUnique({ where: { id: profileId }, select: { keywords: true } });
  const before = new Set((p?.keywords ?? []).map(termKey));
  const out = await writeKeywords(profileId, [...(p?.keywords ?? []), ...names]);
  if (out.some((k) => !before.has(termKey(k)))) await notifyCatalogReview(undefined, profileId);
  return out;
}

export async function setKeywords(profileId: string, names: string[]) {
  const out = await writeKeywords(profileId, names);
  await notifyCatalogReview(undefined, profileId);
  return out;
}

export async function removeKeywords(profileId: string, names: string[]) {
  const p = await prisma.providerProfile.findUnique({ where: { id: profileId }, select: { keywords: true } });
  const drop = new Set(names.map(termKey));
  return writeKeywords(profileId, (p?.keywords ?? []).filter((k) => !drop.has(termKey(k))));
}
