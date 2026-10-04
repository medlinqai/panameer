import { prisma } from "@/lib/prisma";
import { OFFERABLE, OFFERABLE_BASE, activeCatalogId } from "@/lib/catalog";
import { matchSkills } from "@/lib/resume/match";
import { jobKey } from "@/lib/resume/job-key";
import { shownSkills, selectedRoleIds } from "@/lib/shown-skills";
import type { ParsedResume } from "@/lib/resume/parse";

export type DiffSkill = {
  id: string;
  name: string;
  shown: boolean;
};

export type RerunDiff = {
  skills: {
    added: DiffSkill[];
    /** Matched by the parse and already held. Nothing to do. */
    already: DiffSkill[];
    noLongerMentioned: DiffSkill[];
  };
  specializations: { added: { id: string; name: string }[] };
  onProfileNotInResume: {
    employers: {
      id: string;
      name: string | null;
      roleTitle: string | null;
      projectCount: number;
      jobSkillCount: number;
    }[];
    projects: {
      id: string;
      name: string;
      clientName: string | null;
      jobSkillCount: number;
    }[];
  };
  other: {
    headlineWillFill: boolean;
    overviewWillFill: boolean;
    employers: number;
    projects: number;
    education: number;
    certifications: number;
    languages: number;
  };
};

/** Reproduced from `applyParsedResume` — see the agreement warning above. */
function certTermsOf(parsed: ParsedResume): string[] {
  return (parsed.certifications ?? [])
    .map((c) => String((c as { name?: string }).name ?? "").trim())
    .filter(Boolean);
}

export async function computeRerunDiff(
  profileId: string,
  parsed: ParsedResume
): Promise<RerunDiff> {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    include: {
      employers: {
        select: {
          id: true,
          name: true,
          role_title: true,
          _count: { select: { projects: true, skills: true } },
        },
      },
      projects: {
        select: {
          id: true,
          name: true,
          client_name: true,
          employer_id: true,
          _count: { select: { skills: true } },
        },
      },
      person: { select: { title: true } },
      education: { select: { institution: true } },
      languages: { select: { name: true } },
      certifications: { select: { name: true } },
      skills: { select: { skill_id: true, source: true } },
      specializations: { select: { specialization_id: true } },
    },
  });
  if (!profile) {
    return {
      skills: { added: [], already: [], noLongerMentioned: [] },
      specializations: { added: [] },
      onProfileNotInResume: { employers: [], projects: [] },
      other: {
        headlineWillFill: false,
        overviewWillFill: false,
        employers: 0,
        projects: 0,
        education: 0,
        certifications: 0,
        languages: 0,
      },
    };
  }

  const catalogId = await activeCatalogId();
  const inActiveCatalog = catalogId ? { catalog_id: catalogId } : {};

  const catalog = await prisma.skill.findMany({
    where: { ...OFFERABLE, ...inActiveCatalog },
    select: { id: true, name: true, role_type_id: true },
  });

  const certTerms = certTermsOf(parsed);
  const seenTerm = new Set<string>();
  const terms = [...parsed.skills, ...certTerms].filter((t) => {
    const k = t.trim().toLowerCase();
    if (!k || seenTerm.has(k)) return false;
    seenTerm.add(k);
    return true;
  });
  const { matched } = matchSkills(terms, catalog);

  const have = new Set(profile.skills.map((s) => s.skill_id));
  const matchedIds = new Set(matched.map((m) => m.id));

  const roleIds = selectedRoleIds(profile);
  const shownIds = new Set(
    shownSkills(roleIds, catalog, (c) => c.role_type_id).map((c) => c.id)
  );
  const isShown = (id: string) => shownIds.has(id);

  const added = matched
    .filter((m) => !have.has(m.id))
    .map((m) => ({ id: m.id, name: m.name, shown: isShown(m.id) }));
  const already = matched
    .filter((m) => have.has(m.id))
    .map((m) => ({ id: m.id, name: m.name, shown: isShown(m.id) }));

  const inCatalog = new Map(catalog.map((c) => [c.id, c.name]));
  const noLongerMentioned = profile.skills
    .filter((s) => !matchedIds.has(s.skill_id) && inCatalog.has(s.skill_id))
    .map((s) => ({
      id: s.skill_id,
      name: inCatalog.get(s.skill_id) ?? "",
      shown: isShown(s.skill_id),
    }));

  /* ── Specializations — the writer's vocabulary match, additively ────────── */
  const heldSpecs = new Set(profile.specializations.map((x) => x.specialization_id));
  const vocabulary = await prisma.specialization.findMany({
    where: { ...OFFERABLE_BASE },
    select: { id: true, name: true },
  });
  const haystack = [
    ...parsed.skills,
    ...(parsed.overview ? [parsed.overview] : []),
  ]
    .join(" ")
    .toLowerCase();
  const specAdded = vocabulary
    .filter((v) => !heldSpecs.has(v.id) && haystack.includes(v.name.toLowerCase()))
    .map((v) => ({ id: v.id, name: v.name }));

  /* ── The other seven, so nothing lands unannounced ──────────────────────── */
  const haveEmployers = new Set(
    profile.employers.map((e) => jobKey(e.name, e.role_title))
  );
  const haveEdu = new Set(profile.education.map((e) => e.institution.toLowerCase()));
  const haveCerts = new Set(profile.certifications.map((c) => c.name.toLowerCase()));
  const haveLangs = new Set(profile.languages.map((l) => l.name.toLowerCase()));

  const parsedJobKeys = new Set(
    (parsed.experiences ?? []).map((e) => jobKey(e.employer, e.roleTitle))
  );
  const parsedProjectNames = new Set(
    (parsed.projects ?? [])
      .map((pr) => String((pr as { name?: string }).name ?? "").trim().toLowerCase())
      .filter(Boolean)
  );

  const unmatchedEmployers = profile.employers
    .filter((e) => !parsedJobKeys.has(jobKey(e.name, e.role_title)))
    .map((e) => ({
      id: e.id,
      name: e.name,
      roleTitle: e.role_title,
      projectCount: e._count.projects,
      jobSkillCount: e._count.skills,
    }));

  const unmatchedProjects = profile.projects
    .filter((pr) => pr.employer_id == null)
    .filter((pr) => !parsedProjectNames.has(pr.name.trim().toLowerCase()))
    .map((pr) => ({
      id: pr.id,
      name: pr.name,
      clientName: pr.client_name,
      jobSkillCount: pr._count.skills,
    }));

  return {
    skills: { added, already, noLongerMentioned },
    onProfileNotInResume: {
      employers: unmatchedEmployers,
      projects: unmatchedProjects,
    },
    specializations: { added: specAdded },
    other: {
      headlineWillFill: !profile.person?.title?.trim() && Boolean(parsed.headline),
      overviewWillFill: !profile.overview?.trim() && Boolean(parsed.overview),
      employers: (parsed.experiences ?? []).filter(
        (e) =>
          !haveEmployers.has(
            `${String((e as { employer?: string }).employer ?? "")} ${String(
              (e as { title?: string }).title ?? ""
            )}`.toLowerCase()
          )
      ).length,
      projects: (parsed.projects ?? []).length,
      education: (parsed.education ?? []).filter(
        (e) =>
          !haveEdu.has(
            String((e as { institution?: string }).institution ?? "").toLowerCase()
          )
      ).length,
      certifications: (parsed.certifications ?? []).filter(
        (c) => !haveCerts.has(String((c as { name?: string }).name ?? "").toLowerCase())
      ).length,
      languages: (parsed.languages ?? []).filter(
        (l) => !haveLangs.has(String(l).toLowerCase())
      ).length,
    },
  };
}
