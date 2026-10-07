import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { writeAudit } from "@/lib/admin/audit";
import { notify } from "@/lib/notifications";
import { sameLetters } from "@/lib/skill-match";
import type { WriteResult } from "@/lib/catalog-write";
import { promoteSuggestion, rejectSuggestion, type SpecKind } from "@/lib/catalog-write";

// Catalog review (E909): merge / add / reject member-entered skills and specializations.
const refuse = (error: string): WriteResult => ({ ok: false, error });
const withAlias = (aliases: string[], name: string, target: string) =>
  [target, ...aliases].some((a) => a.toLowerCase() === name.toLowerCase()) ? aliases : [...aliases, name];

/** A member skill waiting for review: no domain or flagged pending, not merged, not rejected. */
export const NEW_SKILL_WHERE = { OR: [{ pillar_id: null }, { review_pending: true }], merged_into_id: null, rejected_at: null, status: "ACTIVE" as const };

async function newSkill(id: string) {
  const s = await prisma.skill.findUnique({ where: { id }, select: { id: true, name: true, pillar_id: true, review_pending: true, merged_into_id: true, rejected_at: true, status: true } });
  return s && (!s.pillar_id || s.review_pending) && !s.merged_into_id && !s.rejected_at && s.status === "ACTIVE" ? s : null;
}

export async function skillMembers(id: string) {
  return prisma.providerSkill.count({ where: { skill_id: id } });
}

/** Moves every claim from `fromId` to `intoId`, adds the member wording as an alias, retires the source. */
export async function mergeSkill(viewer: Viewer | null, fromId: string, intoId: string, action = "catalog.skill.merge"): Promise<WriteResult> {
  const from = await newSkill(fromId);
  if (!from) return refuse("That skill is no longer waiting for review.");
  const into = await prisma.skill.findUnique({ where: { id: intoId }, select: { id: true, name: true, aliases: true, pillar_id: true, status: true } });
  if (!into || !into.pillar_id || into.status !== "ACTIVE") return refuse("Pick a live catalog skill to merge into.");

  const moved = await prisma.$transaction(async (tx) => {
    let n = 0;
    for (const ps of await tx.providerSkill.findMany({ where: { skill_id: fromId } })) {
      const dup = await tx.providerSkill.findUnique({ where: { provider_profile_id_skill_id: { provider_profile_id: ps.provider_profile_id, skill_id: intoId } } });
      if (dup) {
        await tx.providerSkill.update({
          where: { id: dup.id },
          data: { weight: Math.max(dup.weight, ps.weight), months_total: Math.max(dup.months_total, ps.months_total) },
        });
        await tx.providerSkill.delete({ where: { id: ps.id } });
      } else await tx.providerSkill.update({ where: { id: ps.id }, data: { skill_id: intoId } });
      n++;
    }
    // Other link tables: move unless the owner already links the target, then drop the duplicate.
    const relink = async (rows: { id: string; key: string }[], has: (key: string) => Promise<boolean>, move: (id: string) => Promise<unknown>, drop: (id: string) => Promise<unknown>) => {
      for (const r of rows) await ((await has(r.key)) ? drop(r.id) : move(r.id));
    };
    const js = await tx.jobSkill.findMany({ where: { skill_id: fromId } });
    await relink(
      js.map((j) => ({ id: j.id, key: j.employer_id ? `e:${j.employer_id}` : `p:${j.project_id}` })),
      async (k) => !!(await tx.jobSkill.findFirst({ where: { skill_id: intoId, ...(k.startsWith("e:") ? { employer_id: k.slice(2) } : { project_id: k.slice(2) }) } })),
      (id) => tx.jobSkill.update({ where: { id }, data: { skill_id: intoId } }),
      (id) => tx.jobSkill.delete({ where: { id } })
    );
    const wr = await tx.workRequestSkill.findMany({ where: { skill_id: fromId } });
    await relink(
      wr.map((w) => ({ id: w.id, key: w.work_request_id })),
      async (k) => !!(await tx.workRequestSkill.findFirst({ where: { skill_id: intoId, work_request_id: k } })),
      (id) => tx.workRequestSkill.update({ where: { id }, data: { skill_id: intoId } }),
      (id) => tx.workRequestSkill.delete({ where: { id } })
    );
    await tx.skill.update({ where: { id: intoId }, data: { aliases: withAlias(into.aliases, from.name, into.name) } });
    await tx.skill.update({ where: { id: fromId }, data: { merged_into_id: intoId, status: "RETIRED", visible_to_members: false, review_pending: false } });
    return n;
  });
  await writeAudit(viewer, { action, targetTable: "skills", targetId: fromId, detail: { from: from.name, into: into.name, intoId, members: moved }, rowCount: moved });
  await refreshCatalogReview();
  return { ok: true, id: intoId, message: `Merged "${from.name}" into ${into.name}. ${moved} member${moved === 1 ? "" : "s"} moved; "${from.name}" is now an alias.` };
}

/** Adds a member skill to a domain; it starts Hidden (E821). Claims stay on the same row. */
export async function addNewSkill(viewer: Viewer, id: string, roleTypeId: string, pillarId: string): Promise<WriteResult> {
  const s = await newSkill(id);
  if (!s) return refuse("That skill is no longer waiting for review.");
  const row = await prisma.skill.findUnique({ where: { id }, select: { catalog_id: true } });
  const clash = await prisma.skill.findFirst({
    where: { catalog_id: row!.catalog_id, role_type_id: roleTypeId, pillar_id: pillarId, name: { equals: s.name, mode: "insensitive" }, NOT: { id } },
    select: { name: true },
  });
  if (clash) return refuse(`"${clash.name}" is already in that domain — merge into it instead.`);
  await prisma.skill.update({ where: { id }, data: { role_type_id: roleTypeId, pillar_id: pillarId, visible_to_members: false, review_pending: false } });
  const members = await skillMembers(id);
  await writeAudit(viewer, { action: "catalog.skill.add_new", targetTable: "skills", targetId: id, detail: { name: s.name, roleTypeId, pillarId, members } });
  await refreshCatalogReview();
  return { ok: true, id, message: `Added "${s.name}". It is hidden until you click Show.` };
}

/** Keeps the skill on members' profiles; it never enters the catalog. */
export async function rejectSkill(viewer: Viewer, id: string): Promise<WriteResult> {
  const s = await newSkill(id);
  if (!s) return refuse("That skill is no longer waiting for review.");
  await prisma.skill.update({ where: { id }, data: { rejected_at: new Date(), visible_to_members: false, review_pending: false } });
  const members = await skillMembers(id);
  await writeAudit(viewer, { action: "catalog.skill.reject", targetTable: "skills", targetId: id, detail: { name: s.name, members } });
  await refreshCatalogReview();
  return { ok: true, id, message: `Rejected "${s.name}". Members who entered it keep it on their profile.` };
}

/** Moves every link from a suggested specialization to a live one; the wording becomes an alias. */
export async function mergeSpecialization(viewer: Viewer | null, fromId: string, intoId: string, action = "catalog.spec.merge"): Promise<WriteResult> {
  const from = await prisma.specialization.findUnique({ where: { id: fromId }, select: { name: true, status: true, origin: true } });
  if (!from || from.status !== "SUGGESTED") return refuse("That specialization is no longer waiting for review.");
  const into = await prisma.specialization.findUnique({ where: { id: intoId }, select: { name: true, status: true, aliases: true } });
  if (!into || into.status !== "ACTIVE") return refuse("Pick a live specialization to merge into.");
  const moved = await prisma.$transaction(async (tx) => {
    let n = 0;
    for (const l of await tx.providerProfileSpecialization.findMany({ where: { specialization_id: fromId } })) {
      const dup = await tx.providerProfileSpecialization.findUnique({ where: { provider_profile_id_specialization_id: { provider_profile_id: l.provider_profile_id, specialization_id: intoId } } });
      if (dup) await tx.providerProfileSpecialization.delete({ where: { id: l.id } });
      else await tx.providerProfileSpecialization.update({ where: { id: l.id }, data: { specialization_id: intoId } });
      n++;
    }
    for (const l of await tx.workRequestSpecialization.findMany({ where: { specialization_id: fromId } })) {
      const dup = await tx.workRequestSpecialization.findFirst({ where: { work_request_id: l.work_request_id, specialization_id: intoId } });
      if (dup) await tx.workRequestSpecialization.delete({ where: { id: l.id } });
      else await tx.workRequestSpecialization.update({ where: { id: l.id }, data: { specialization_id: intoId } });
    }
    await tx.project.updateMany({ where: { industry_specialization_id: fromId }, data: { industry_specialization_id: intoId } });
    await tx.assessment.updateMany({ where: { industry_specialization_id: fromId }, data: { industry_specialization_id: intoId } });
    await tx.specialization.update({ where: { id: intoId }, data: { aliases: withAlias(into.aliases, from.name, into.name) } });
    await tx.specialization.update({ where: { id: fromId }, data: { merged_into_id: intoId, status: "RETIRED" } });
    return n;
  });
  await writeAudit(viewer, { action, targetTable: "specializations", targetId: fromId, detail: { from: from.name, into: into.name, intoId, members: moved }, rowCount: moved });
  await refreshCatalogReview();
  return { ok: true, id: intoId, message: `Merged "${from.name}" into ${into.name}. ${moved} member${moved === 1 ? "" : "s"} moved; "${from.name}" is now an alias.` };
}

export async function addNewSpecialization(viewer: Viewer, id: string, kind: SpecKind): Promise<WriteResult> {
  const r = await promoteSuggestion(id, kind);
  if (r.ok) await writeAudit(viewer, { action: "catalog.spec.add_new", targetTable: "specializations", targetId: id, detail: { kind } });
  if (r.ok) await refreshCatalogReview();
  return r;
}

export async function rejectSpecialization(viewer: Viewer, id: string): Promise<WriteResult> {
  const r = await rejectSuggestion(id);
  if (r.ok) await writeAudit(viewer, { action: "catalog.spec.reject", targetTable: "specializations", targetId: id });
  if (r.ok) await refreshCatalogReview();
  return r;
}

// ── Daily review notice (E910): one bell item + one email per admin per day.
const DIGEST = "catalog.review_new";
const etDay = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });

export async function waitingCounts() {
  const [skills, specs] = await Promise.all([
    prisma.skill.count({ where: NEW_SKILL_WHERE }),
    prisma.specialization.count({ where: { origin: "PROVIDER", status: "SUGGESTED" } }),
  ]);
  return { skills, specs };
}
const summaryOf = ({ skills, specs }: { skills: number; specs: number }) =>
  [skills && `${skills} new skill${skills === 1 ? "" : "s"}`, specs && `${specs} new specialization${specs === 1 ? "" : "s"}`].filter(Boolean).join(", ");

/** A member saved a term not in the catalog: create today's notice, or refresh its count. `to` overrides recipients (tests). */
// A new term is reported once, when it reaches this many different (real) people.
export const CATALOG_NOTIFY_MIN_PEOPLE = Math.max(1, Number(process.env.CATALOG_NOTIFY_MIN_PEOPLE) || 3);
const REAL_PERSON = { user: { is_test: false, NOT: [{ email: { endsWith: "@panameer.com" } }, { email: { endsWith: "@example.seed" } }, { email: { endsWith: ".example" } }] } };

/** People (test accounts excluded) per waiting skill / specialization, highest first. */
export async function waitingTermCounts() {
  const [skills, specs] = await Promise.all([
    prisma.skill.findMany({ where: NEW_SKILL_WHERE, select: { id: true, name: true, providerSkills: { where: { providerProfile: { person: REAL_PERSON } }, select: { provider_profile_id: true } } } }),
    prisma.specialization.findMany({ where: { origin: "PROVIDER", status: "SUGGESTED" }, select: { id: true, name: true, providerProfiles: { where: { providerProfile: { person: REAL_PERSON } }, select: { provider_profile_id: true } } } }),
  ]);
  return [
    ...skills.map((x) => ({ id: x.id, name: x.name, kind: "skill" as const, people: new Set(x.providerSkills.map((p) => p.provider_profile_id)).size })),
    ...specs.map((x) => ({ id: x.id, name: x.name, kind: "specialization" as const, people: new Set(x.providerProfiles.map((p) => p.provider_profile_id)).size })),
  ].sort((a, b) => b.people - a.people);
}

/** Keywords (terms the catalog doesn't know) by how many real people hold them. */
export async function keywordCounts() {
  const rows = await prisma.providerProfile.findMany({ where: { keywords: { isEmpty: false }, person: REAL_PERSON }, select: { id: true, keywords: true } });
  const by = new Map<string, { name: string; people: Set<string> }>();
  for (const r of rows)
    for (const k of r.keywords) {
      const key = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!key) continue;
      const e = by.get(key) ?? { name: k, people: new Set<string>() };
      e.people.add(r.id);
      by.set(key, e);
    }
  return [...by.entries()].map(([key, e]) => ({ key, name: e.name, people: e.people.size })).sort((a, b) => b.people - a.people);
}

/** A member saved a new term: tell admins about each term that has now reached CATALOG_NOTIFY_MIN_PEOPLE (once per term). `to` overrides recipients (tests). */
export async function notifyCatalogReview(to?: string[], fromProfileId?: string) {
  try {
    if (fromProfileId) {
      const who = await prisma.providerProfile.findUnique({ where: { id: fromProfileId }, select: { person: { select: { user: { select: { email: true, is_test: true } } } } } });
      if (who?.person.user?.is_test || /@(example\.seed|panameer\.com|[^@]*\.example)$/i.test(who?.person.user?.email ?? "")) return;
    }
    const hot = (await waitingTermCounts()).filter((t) => t.people >= CATALOG_NOTIFY_MIN_PEOPLE);
    const hotWords = (await keywordCounts()).filter((t) => t.people >= CATALOG_NOTIFY_MIN_PEOPLE);
    if (!hot.length && !hotWords.length) return;
    const admins = to ?? (await prisma.person.findMany({ where: { user: { is_system_admin: true } }, select: { id: true } })).map((p) => p.id);
    for (const t of hot)
      for (const personId of admins)
        await notify({ event: "catalog.term_catches_on", personId, entityType: t.kind, entityId: t.id, dedupeKey: `catalog.term_catches_on:${t.id}`, vars: { term: t.name, people: String(t.people), kind: t.kind } });
    for (const t of hotWords)
      for (const personId of admins)
        await notify({ event: "catalog.term_catches_on", personId, entityType: "keyword", dedupeKey: `catalog.term_catches_on:kw:${t.key}`, vars: { term: t.name, people: String(t.people), kind: "keyword" } });
  } catch (e) {
    console.error("[catalog-review] notice failed", e);
  }
}

/** After a review action: refresh open notices' counts, or clear them when nothing is left. */
export async function refreshCatalogReview() {
  const counts = await waitingCounts();
  const where = { event_key: DIGEST, resolved_at: null };
  if (!counts.skills && !counts.specs) await prisma.notification.updateMany({ where, data: { resolved_at: new Date() } });
  else await prisma.notification.updateMany({ where, data: { title: `${summaryOf(counts)} to review` } });
}

// ── Same-letter auto-link: a member term that equals a Shown catalog entry never reaches review.
const SHOWN_SKILL = { status: "ACTIVE" as const, visible_to_members: true, pillar_id: { not: null }, review_pending: false, merged_into_id: null };

/** Links every waiting member skill/specialization whose name equals a Shown catalog entry. Returns counts. */
export async function autoLinkSameLetters(onlyIds?: { skills?: string[]; specs?: string[] }) {
  const [waiting, shown, specWaiting, specShown] = await Promise.all([
    prisma.skill.findMany({ where: { ...NEW_SKILL_WHERE, ...(onlyIds?.skills ? { id: { in: onlyIds.skills } } : {}) }, select: { id: true, name: true, role_type_id: true, pillar_id: true } }),
    prisma.skill.findMany({ where: SHOWN_SKILL, select: { id: true, name: true, role_type_id: true, pillar_id: true, _count: { select: { providerSkills: true } } } }),
    prisma.specialization.findMany({ where: { origin: "PROVIDER", status: "SUGGESTED", ...(onlyIds?.specs ? { id: { in: onlyIds.specs } } : {}) }, select: { id: true, name: true } }),
    prisma.specialization.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true } }),
  ]);
  const linked: { kind: string; from: string; into: string }[] = [];
  for (const w of waiting) {
    const same = shown.filter((c) => c.id !== w.id && sameLetters(c.name) === sameLetters(w.name));
    if (!same.length) continue;
    // Only within the member's own domain (its own, or the one its claimers use most) — never across products.
    const domain = w.pillar_id ?? (await likelyDomain(w.id));
    const pick = same.find((c) => c.pillar_id === domain);
    if (!pick) continue;
    const r = await mergeSkill(null, w.id, pick.id, "auto_match_same_letters");
    if (r.ok) linked.push({ kind: "skill", from: w.name, into: pick.name });
  }
  for (const w of specWaiting) {
    const pick = specShown.find((c) => sameLetters(c.name) === sameLetters(w.name));
    if (!pick) continue;
    const r = await mergeSpecialization(null, w.id, pick.id, "auto_match_same_letters");
    if (r.ok) linked.push({ kind: "specialization", from: w.name, into: pick.name });
  }
  return linked;
}

/** For Compare: the Hidden catalog skill a waiting item spells the same as, if any. */
export async function hiddenSameLetterNames() {
  const hidden = await prisma.skill.findMany({ where: { status: "ACTIVE", visible_to_members: false, pillar_id: { not: null }, review_pending: false }, select: { name: true } });
  return new Map(hidden.map((h) => [sameLetters(h.name), h.name]));
}

/** The domain a waiting skill's claimers use most for their other skills. */
export async function likelyDomain(skillId: string): Promise<string | null> {
  const who = (await prisma.providerSkill.findMany({ where: { skill_id: skillId }, select: { provider_profile_id: true } })).map((c) => c.provider_profile_id);
  if (!who.length) return null;
  const theirs = await prisma.providerSkill.findMany({ where: { provider_profile_id: { in: who }, skill: { pillar_id: { not: null }, review_pending: false } }, select: { skill: { select: { pillar_id: true } } } });
  const tally = new Map<string, number>();
  for (const t of theirs) tally.set(t.skill.pillar_id!, (tally.get(t.skill.pillar_id!) ?? 0) + 1);
  return [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
