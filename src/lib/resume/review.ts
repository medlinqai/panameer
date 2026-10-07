import { prisma } from "@/lib/prisma";
import { OFFERABLE, activeCatalogId } from "@/lib/catalog";
import { SELF_ADDED_WEIGHT } from "@/lib/provider-rollup";
import { formatSkillName, matchSkill } from "@/lib/skill-match";
import { autoLinkSameLetters, notifyCatalogReview } from "@/lib/catalog-review";
import { recomputeCompleteness } from "@/lib/onboarding";
import { matchSkills } from "@/lib/resume/match";
import { normCompany } from "@/lib/resume/company-list";
import { companySortState, applyCompanySort, type SortChoice } from "@/lib/resume/company-sort";
import { fixKey, loadFixes, saveFixes, recordRemoved, forgetRemoved, recordSwitch, type FixKind } from "@/lib/resume/fixes";
import { importProfileDocument } from "@/lib/resume/import";
import type { ParsedResume } from "@/lib/resume/parse";

// "What we got": the résumé review, one chunk at a time (brief_resume_review_chunks_2026-10-07).
export type ChunkKey = "companies" | "projects" | "skills" | "certs" | "edu" | "about";
const yr = (d: Date | null) => (d ? d.toISOString().slice(0, 7) : null);
const span = (a: Date | null, b: Date | null) => (a ? `${yr(a)} – ${b ? yr(b) : "now"}` : null);

/** Groups of ids whose key repeats: the duplicates a chunk offers to merge. */
function dupes<T extends { id: string }>(rows: T[], key: (r: T) => string) {
  const by = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    if (k) by.set(k, [...(by.get(k) ?? []), r]);
  }
  return [...by.values()].filter((g) => g.length > 1).map((g) => g.map((r) => r.id));
}

export async function reviewState(profileId: string) {
  const [imp, profile, fixes, sort] = await Promise.all([
    prisma.profileImport.findFirst({
      where: { provider_profile_id: profileId, status: "PARSED" },
      orderBy: { created_at: "desc" },
      select: { id: true, raw_text: true, parsed: true, source_offsets: true, file_name: true },
    }),
    prisma.providerProfile.findUnique({
      where: { id: profileId },
      select: {
        overview: true,
        person: { select: { title: true } },
        projects: { select: { id: true, name: true, client_name: true, start_date: true, end_date: true }, orderBy: { start_date: "desc" } },
        certifications: { select: { id: true, name: true, issuer: true, year: true }, orderBy: { created_at: "asc" } },
        education: { select: { id: true, institution: true, degree: true, field: true, end_year: true }, orderBy: { created_at: "asc" } },
        skills: { select: { id: true, skill: { select: { id: true, name: true, is_custom: true, review_pending: true } } } },
      },
    }),
    loadFixes(profileId),
    companySortState(profileId),
  ]);
  if (!profile) return null;
  const parsed = (imp?.parsed ?? null) as ParsedResume | null;
  const removed = (k: FixKind, n: string) => (fixes.removed[k] ?? []).includes(fixKey(n));

  // Companies: one switch per row; look-alike names offered for merge.
  const companies = (sort?.rows ?? []).map((r) => {
    const choice = fixes.switches[normCompany(r.name)] ?? r.current ?? r.preselect;
    return { name: r.name, dates: r.dates, detail: r.detail, title: r.title, guess: r.guess, choice, unsure: !r.current && !fixes.switches[normCompany(r.name)] && r.guess !== "EMPLOYER" && r.guess !== "PROJECT" };
  });
  const lookalikes: [string, string][] = [];
  for (let i = 0; i < companies.length; i++)
    for (let j = i + 1; j < companies.length; j++) {
      const a = normCompany(companies[i].name), b = normCompany(companies[j].name);
      const pair = [companies[i].name, companies[j].name] as [string, string];
      if (!a || !b || (fixes.keepBoth ?? []).includes(fixKey(pair.join("|")))) continue;
      if (a === b || a.startsWith(b + " ") || b.startsWith(a + " ")) lookalikes.push(pair);
    }

  const projects = profile.projects.map((p) => ({ id: p.id, name: p.name, client: p.client_name, dates: span(p.start_date, p.end_date) }));
  const certs = profile.certifications.map((c) => ({ id: c.id, name: c.name, issuer: c.issuer, year: c.year }));
  const edu = profile.education.map((e) => ({ id: e.id, institution: e.institution, degree: e.degree, field: e.field, year: e.end_year }));

  // Skills: in the catalog · new to Panameer · probably not skills.
  const onProfile = profile.skills.map((s) => ({ id: s.id, skillId: s.skill.id, name: s.skill.name, custom: s.skill.is_custom }));
  const have = new Set(onProfile.map((s) => fixKey(s.name)));
  let fresh: string[] = [];
  if (parsed?.skills?.length) {
    const catalog = await prisma.skill.findMany({ where: OFFERABLE, select: { id: true, name: true, role_type_id: true } });
    fresh = matchSkills(parsed.skills, catalog).unmatched.filter((n) => !have.has(fixKey(n)) && !removed("newSkill", n));
  }
  const junk = (parsed?.droppedSkills ?? []).filter((n) => !removed("junk", n) && !have.has(fixKey(n)));

  const groups = {
    projects: dupes(projects, (p) => `${fixKey(p.name)}|${fixKey(p.client)}`),
    certs: dupes(certs, (c) => fixKey(c.name)),
    edu: dupes(edu, (e) => fixKey(e.institution)),
  };
  const about = { title: profile.person.title ?? "", overview: profile.overview ?? "" };
  const check: Record<ChunkKey, number> = {
    companies: companies.filter((c) => c.unsure).length + lookalikes.length,
    projects: groups.projects.length,
    skills: junk.length,
    certs: groups.certs.length,
    edu: groups.edu.length,
    about: (about.title.trim() ? 0 : 1) + (about.overview.trim() ? 0 : 1),
  };
  const count: Record<ChunkKey, number> = { companies: companies.length, projects: projects.length, skills: onProfile.length + fresh.length, certs: certs.length, edu: edu.length, about: 0 };
  return {
    importId: imp?.id ?? null,
    fileName: imp?.file_name ?? null,
    text: imp?.raw_text ?? "",
    offsets: (imp?.source_offsets ?? {}) as Record<string, number[]>,
    companies,
    lookalikes,
    employers: sort?.employers ?? [],
    projects,
    certs,
    edu,
    skills: { catalog: onProfile.filter((s) => !s.custom), mine: onProfile.filter((s) => s.custom), fresh, junk },
    dupes: groups,
    about,
    count,
    check,
  };
}
export type ReviewState = NonNullable<Awaited<ReturnType<typeof reviewState>>>;

export async function searchCatalog(q: string) {
  if (q.trim().length < 2) return [];
  return prisma.skill.findMany({ where: { ...OFFERABLE, name: { contains: q.trim(), mode: "insensitive" } }, select: { id: true, name: true }, take: 10, orderBy: { name: "asc" } });
}

export type ReviewAction =
  | { action: "remove"; kind: "skill" | "project" | "cert" | "edu"; id: string }
  | { action: "dismiss"; kind: "newSkill" | "junk"; names: string[] }
  | { action: "edit"; kind: "project"; id: string; name: string; client: string }
  | { action: "edit"; kind: "cert"; id: string; name: string; issuer: string }
  | { action: "edit"; kind: "edu"; id: string; institution: string; degree: string }
  | { action: "edit"; kind: "about"; title: string; overview: string }
  | { action: "merge"; kind: "project" | "cert" | "edu"; keepId: string; dropIds: string[] }
  | { action: "company"; name: string; choice: SortChoice }
  | { action: "companyMerge"; keep: string; drop: string }
  | { action: "keepBoth"; a: string; b: string }
  | { action: "addSkill"; skillId: string }
  | { action: "reread" }
  | { action: "commit" };

/** Applies one review change for the profile's owner; every removal is recorded so a re-read keeps it. */
export async function reviewAction(profileId: string, a: ReviewAction): Promise<{ ok: true } | { ok: false; error: string }> {
  const own = { provider_profile_id: profileId };
  switch (a.action) {
    case "remove": {
      if (a.kind === "skill") {
        const row = await prisma.providerSkill.findFirst({ where: { id: a.id, ...own }, select: { id: true, skill: { select: { name: true } } } });
        if (!row) return { ok: false, error: "Not found." };
        await prisma.providerSkill.delete({ where: { id: row.id } });
        await recordRemoved(profileId, "skill", [row.skill.name]);
      } else if (a.kind === "project") {
        const row = await prisma.project.findFirst({ where: { id: a.id, ...own }, select: { name: true } });
        if (!row) return { ok: false, error: "Not found." };
        await prisma.project.delete({ where: { id: a.id } });
        await recordRemoved(profileId, "project", [row.name]);
      } else if (a.kind === "cert") {
        const row = await prisma.certification.findFirst({ where: { id: a.id, ...own }, select: { name: true } });
        if (!row) return { ok: false, error: "Not found." };
        await prisma.certification.delete({ where: { id: a.id } });
        await recordRemoved(profileId, "cert", [row.name]);
      } else {
        const row = await prisma.education.findFirst({ where: { id: a.id, ...own }, select: { institution: true, degree: true } });
        if (!row) return { ok: false, error: "Not found." };
        await prisma.education.delete({ where: { id: a.id } });
        await recordRemoved(profileId, "edu", [`${row.institution} ${row.degree ?? ""}`]);
      }
      break;
    }
    case "dismiss":
      await recordRemoved(profileId, a.kind, a.names);
      break;
    case "edit": {
      if (a.kind === "about") {
        const p = await prisma.providerProfile.update({ where: { id: profileId }, data: { overview: a.overview.trim().slice(0, 4000) || null }, select: { person_id: true } });
        await prisma.person.update({ where: { id: p.person_id }, data: { title: a.title.trim().slice(0, 200) || null } });
        break;
      }
      const data =
        a.kind === "project" ? { name: a.name.trim().slice(0, 200), client_name: a.client.trim().slice(0, 200) }
        : a.kind === "cert" ? { name: a.name.trim().slice(0, 200), issuer: a.issuer.trim().slice(0, 200) || null }
        : { institution: a.institution.trim().slice(0, 200), degree: a.degree.trim().slice(0, 200) || null };
      if (!Object.values(data)[0]) return { ok: false, error: "A name is needed." };
      const r =
        a.kind === "project" ? await prisma.project.updateMany({ where: { id: a.id, ...own }, data })
        : a.kind === "cert" ? await prisma.certification.updateMany({ where: { id: a.id, ...own }, data })
        : await prisma.education.updateMany({ where: { id: a.id, ...own }, data });
      if (!r.count) return { ok: false, error: "Not found." };
      break;
    }
    case "merge": {
      const ids = a.dropIds.filter((x) => x !== a.keepId);
      const where = { id: { in: ids }, ...own };
      if (a.kind === "project") await prisma.project.deleteMany({ where });
      else if (a.kind === "cert") await prisma.certification.deleteMany({ where });
      else await prisma.education.deleteMany({ where });
      break;
    }
    case "company":
      await applyCompanySort(profileId, [{ name: a.name, choice: a.choice }]);
      await recordSwitch(profileId, a.name, a.choice);
      break;
    case "companyMerge": {
      const keep = a.keep.trim().slice(0, 200), dropKey = normCompany(a.drop), keepKey = normCompany(keep);
      const [projects, employers] = await Promise.all([
        prisma.project.findMany({ where: own, select: { id: true, client_name: true } }),
        prisma.employer.findMany({ where: own, select: { id: true, name: true } }),
      ]);
      const pIds = projects.filter((p) => normCompany(p.client_name) === dropKey && dropKey !== keepKey).map((p) => p.id);
      if (pIds.length) await prisma.project.updateMany({ where: { id: { in: pIds } }, data: { client_name: keep } });
      const dropEmp = employers.filter((e) => normCompany(e.name) === dropKey && e.name !== keep);
      const keepEmp = employers.find((e) => normCompany(e.name) === keepKey && e.name === keep) ?? employers.find((e) => normCompany(e.name) === keepKey && !dropEmp.includes(e));
      for (const e of dropEmp) {
        if (keepEmp) {
          await prisma.project.updateMany({ where: { employer_id: e.id, ...own }, data: { employer_id: keepEmp.id } });
          await prisma.employer.delete({ where: { id: e.id } });
        } else await prisma.employer.update({ where: { id: e.id }, data: { name: keep } });
      }
      await recordRemoved(profileId, "company", [a.drop]);
      break;
    }
    case "keepBoth": {
      const f = await loadFixes(profileId);
      f.keepBoth = [...new Set([...(f.keepBoth ?? []), fixKey(`${a.a}|${a.b}`), fixKey(`${a.b}|${a.a}`)])];
      await saveFixes(profileId, f);
      break;
    }
    case "addSkill": {
      const skill = await prisma.skill.findFirst({ where: { id: a.skillId, ...OFFERABLE }, select: { id: true, name: true } });
      if (!skill) return { ok: false, error: "That skill isn't in the catalog." };
      await prisma.providerSkill.upsert({
        where: { provider_profile_id_skill_id: { provider_profile_id: profileId, skill_id: skill.id } },
        update: {},
        create: { provider_profile_id: profileId, skill_id: skill.id, source: "SELF_ADDED", weight: SELF_ADDED_WEIGHT },
      });
      await forgetRemoved(profileId, "skill", skill.name);
      break;
    }
    case "reread": {
      const imp = await prisma.profileImport.findFirst({
        where: { provider_profile_id: profileId, status: "PARSED", raw_text: { not: null } },
        orderBy: { created_at: "desc" },
        select: { raw_text: true, storage_path: true, file_name: true, mime_type: true },
      });
      if (!imp?.raw_text) return { ok: false, error: "Upload your résumé first." };
      const r = await importProfileDocument({ profileId, source: "RESUME", fileName: imp.file_name ?? "resume", mimeType: imp.mime_type ?? "text/plain", bytes: Buffer.alloc(0), startedAt: Date.now(), reuse: { text: imp.raw_text, storagePath: imp.storage_path } });
      if (r.status === "FAILED") return { ok: false, error: r.error ?? "We couldn't read it again." };
      break;
    }
    case "commit": {
      const st = await reviewState(profileId);
      if (st?.skills.fresh.length) await addMemberSkills(profileId, st.skills.fresh);
      break;
    }
  }
  await recomputeCompleteness(profileId).catch(() => null);
  return { ok: true };
}

/** "New to Panameer": each becomes the member's own skill, suggested to the catalog. */
async function addMemberSkills(profileId: string, names: string[]) {
  const [p, catalogId, rows] = await Promise.all([
    prisma.providerProfile.findUnique({ where: { id: profileId }, select: { role_type_id: true, pillar_id: true } }),
    activeCatalogId(),
    prisma.skill.findMany({ where: OFFERABLE, select: { id: true, name: true, is_custom: true } }),
  ]);
  if (!p?.role_type_id || !p.pillar_id || !catalogId) return;
  const known = rows.map((r) => ({ id: r.id, name: r.name, isCustom: r.is_custom }));
  const ids: string[] = [];
  const fresh: string[] = [];
  for (const raw of names.slice(0, 30)) {
    const name = formatSkillName(raw.trim().slice(0, 120));
    if (!name) continue;
    const m = matchSkill(name, known);
    if (m.kind === "exact") { ids.push(m.skill.id); continue; }
    const s = await prisma.skill.upsert({
      where: { catalog_id_role_type_id_pillar_id_name: { catalog_id: catalogId, role_type_id: p.role_type_id, pillar_id: p.pillar_id, name } },
      update: {},
      create: { catalog_id: catalogId, role_type_id: p.role_type_id, pillar_id: p.pillar_id, name, is_custom: true, origin: "PROVIDER", review_pending: true },
    });
    ids.push(s.id);
    if (Date.now() - s.created_at.getTime() < 60_000) fresh.push(s.id);
  }
  await prisma.providerSkill.createMany({ data: ids.map((skill_id) => ({ provider_profile_id: profileId, skill_id, source: "SELF_ADDED" as const, weight: SELF_ADDED_WEIGHT })), skipDuplicates: true });
  if (fresh.length) {
    await autoLinkSameLetters({ skills: fresh });
    await notifyCatalogReview(undefined, profileId);
  }
}
