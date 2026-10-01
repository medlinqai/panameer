import { prisma } from "@/lib/prisma";
import { OFFERABLE, activeCatalogId } from "@/lib/catalog";
import { matchSkills } from "@/lib/resume/match";
import { jobKey } from "@/lib/resume/job-key";
import { shownSkills, selectedRoleIds } from "@/lib/shown-skills";
import type { ParsedResume } from "@/lib/resume/parse";

/**
 * ── ⚠⚠ THE RE-RUN DIFF (`P2-J14-E561` WS-B) — PROPOSE, WRITE NOTHING ────────
 *
 * ⚠⚠⚠ THIS MODULE WRITES NOTHING. EVER. It reads the profile, reads a parse
 * that has already happened, and returns what a re-run WOULD do. The provider
 * ticks; `applyParsedResume` writes only what they ticked.
 * ⚠ `E517` DESTROYED NINE SKILL ROWS AND THERE IS NO UNDO — deleted
 * `provider_skill` rows are unrecoverable and a re-import is the only repair.
 * That is why the diff exists at all, and why nothing here holds a `delete`.
 *
 * ── ⚠⚠ IT MUST AGREE WITH THE WRITER, AND THAT IS THE RISK ─────────────────
 *
 * ⚠ The skill match is reproduced from `applyParsedResume` (`import.ts:1042`
 * onward) EXACTLY: the same `certTerms` construction, the same dedup, the same
 * `OFFERABLE` + active-catalog query, the same `matchSkills`, the same
 * `have`/`toAdd` split. ⚠⚠ A DIFF THAT DISAGREES WITH THE WRITER IS WORSE THAN
 * NO DIFF — it would show a provider one thing and do another.
 * ⚠⚠⚠ THIS IS `E585`'S SHAPE (two computations of one concept, kept in step by
 * comment) AND IT IS ACCEPTED HERE ONLY BECAUSE `WS-C`'s GATE ASSERTS THEY
 * AGREE. Do not edit one without the other, and do not delete that gate.
 *
 * ⚠ `E514` — 148 `provider_skill` rows across 23 profiles point OUTSIDE the
 * active catalog. They are EXCLUDED from "no longer mentioned": they are that
 * defect surfacing, not a parse result, and presenting them as "the résumé no
 * longer mentions this" would invite a provider to remove a real skill.
 */

export type DiffSkill = {
  id: string;
  name: string;
  /**
   * ── ⚠⚠⚠ THE SILENT NO-OP, MADE VISIBLE ───────────────────────────────────
   *
   * ⚠ `E517` filters what is OFFERED, not what is HELD: a skill outside the
   * provider's selected roles is written, kept, and NEVER RENDERED on their
   * profile. ⚠⚠ MEASURED AT `E561` WS-A — a re-run can add a row the provider
   * will never see.
   * ⚠⚠⚠ A DIFF THAT SAYS "ADDED" AND SHOWS NOTHING AFTERWARDS IS A LIE BY
   * OMISSION. So the row says so BEFORE they tick it, and points at where roles
   * are chosen. ⚠ It is NOT a destruction and it is NOT an error — the skill is
   * genuinely held, and widening a role reveals it.
   */
  shown: boolean;
};

export type RerunDiff = {
  skills: {
    /** Matched by the parse, not on the profile. ⚠ The only ticked-by-default set. */
    added: DiffSkill[];
    /** Matched by the parse and already held. Nothing to do. */
    already: DiffSkill[];
    /**
     * ⚠⚠ ON THE PROFILE, ABSENT FROM THIS PARSE. INFORMATION ONLY.
     * ⚠⚠⚠ NEVER PRE-TICKED, NEVER REMOVED, NOT REMOVABLE FROM THIS SURFACE.
     * A résumé that stops mentioning a skill is not evidence the provider lost
     * it — `E549` settled the same rule for a missing end date: *"absence is not
     * a negative statement."*
     */
    noLongerMentioned: DiffSkill[];
  };
  specializations: { added: { id: string; name: string }[] };
  /**
   * ── ⚠⚠⚠ "ON YOUR PROFILE BUT NOT IN THIS RÉSUMÉ" (`P2-A1.1-E740`, A2) ──────
   *
   * ⚠ SCOTT, super run 2026-09-30 item 6: *"a rebuild shows 'On your profile but
   * not in this résumé' for employers and projects with no match (use the
   * import's own `haveRole` matching; no second matcher). Each row is unticked
   * by default; only ticked rows are removed on save."*
   *
   * ⚠⚠ **IT IS THE ONLY REMOVAL SURFACE IN THE DIFF, AND IT IS OPT-IN.** Every
   * other list here ADDS. ⚠⚠⚠ **A RÉSUMÉ THAT STOPS MENTIONING A JOB IS NOT
   * EVIDENCE THE JOB DID NOT HAPPEN** — the same rule `noLongerMentioned`
   * already states for skills, and `E549` settled for a missing end date:
   * *"absence is not a negative statement."* ⚠ So nothing here is ever
   * pre-ticked, and a member who ticks nothing loses nothing.
   *
   * ⚠⚠ **EACH ROW CARRIES WHAT REMOVING IT COSTS, MEASURED FROM THE SCHEMA** —
   * see `removalConsequence` below. A tick box next to a job, with no statement
   * of what else goes, is how somebody deletes work history they meant to keep.
   */
  onProfileNotInResume: {
    employers: {
      id: string;
      name: string | null;
      roleTitle: string | null;
      /** ⚠ Projects hanging off this employer. They are ORPHANED, not deleted. */
      projectCount: number;
      /** ⚠ `JobSkill` rows on this employer. They CASCADE — they are deleted. */
      jobSkillCount: number;
    }[];
    projects: {
      id: string;
      name: string;
      /** ⚠ Shown so the member can tell two similarly-named projects apart. */
      clientName: string | null;
      jobSkillCount: number;
    }[];
  };
  /**
   * ⚠ The seven categories outside the brief's first scope, reported so the
   * provider is not surprised. ⚠⚠ `headline` and `overview` are written ONLY
   * when the profile's own value is EMPTY (`import.ts:703`), so they can only
   * ever FILL, never REPLACE — the copy must say so.
   */
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
      /* ⚠ `id` AND THE TWO COUNTS JOIN THE SELECT (`E740` A2) — the removal
         list needs to name a row and state what removing it costs. */
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
      /* The TITLE lives on the person since E595 WS-B — the diff asks whether
         an import would FILL it, so it has to read where it now is. */
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

  /* ⚠ THE SAME HELPER THE WRITER USES (`import.ts:759`), not a second query —
     `null` on a never-seeded database degrades to unscoped, exactly as there. */
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

  /*
    ⚠⚠ WHICH OF THESE WOULD ACTUALLY RENDER? `shownSkills` is `E517`'s ONE RULE
    and this asks it rather than re-deriving the answer — the mistake `E585`
    records. ⚠ NO SELECTION SHOWS EVERYTHING: a provider with no role recorded
    sees all of them, so nothing is flagged hidden for them.
  */
  const roleIds = selectedRoleIds(profile);
  const shownIds = new Set(
    shownSkills(roleIds, catalog, (c) => c.role_type_id).map((c) => c.id)
  );
  /* ⚠ `shownSkills` with NO selection returns everything, so this is simply
     membership — no special case, and no re-derivation of the rule. */
  const isShown = (id: string) => shownIds.has(id);

  const added = matched
    .filter((m) => !have.has(m.id))
    .map((m) => ({ id: m.id, name: m.name, shown: isShown(m.id) }));
  const already = matched
    .filter((m) => have.has(m.id))
    .map((m) => ({ id: m.id, name: m.name, shown: isShown(m.id) }));

  /*
    ⚠⚠ "NO LONGER MENTIONED" EXCLUDES ROWS OUTSIDE THE ACTIVE CATALOG (`E514`).
    A row the matcher could never have returned is not a parse result, and
    listing it here would read as "your résumé dropped this."
  */
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
    where: { ...OFFERABLE },
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
  /* ⚠⚠ THE SHARED KEY (`E740` A2). ⚠⚠⚠ THIS LINE USED TO JOIN WITH A SPACE
     WHILE `import.ts` JOINED WITH A PIPE — two matchers for one question, and the
     removal list below is built on that question. See `job-key.ts`. */
  const haveEmployers = new Set(
    profile.employers.map((e) => jobKey(e.name, e.role_title))
  );
  const haveEdu = new Set(profile.education.map((e) => e.institution.toLowerCase()));
  const haveCerts = new Set(profile.certifications.map((c) => c.name.toLowerCase()));
  const haveLangs = new Set(profile.languages.map((l) => l.name.toLowerCase()));

  /*
    ── ⚠⚠⚠ "ON YOUR PROFILE BUT NOT IN THIS RÉSUMÉ" (`E740` A2) ──────────────

    ⚠ The SAME `jobKey` the writer uses, so a job the importer would skip as
    already-held is exactly a job that does NOT appear here. ⚠⚠ Built by
    SUBTRACTION from the parse, never by a second matcher.

    ⚠⚠⚠ **A PROJECT IS MATCHED ON ITS OWN NAME, NOT ON `jobKey`** — a project
    has no role title, and `jobKey` would collapse every one of them onto
    `"name|"`. ⚠ Stated because reaching for the shared helper here would LOOK
    like consistency and would quietly match nothing.
  */
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
      /* ⚠ `SetNull` — these are ORPHANED, not deleted. */
      projectCount: e._count.projects,
      /* ⚠ `Cascade` — these ARE deleted. */
      jobSkillCount: e._count.skills,
    }));

  /* ⚠⚠ SOLO PROJECTS ONLY. A project hanging off an employer is already
     represented by that employer's row, and offering it separately would let a
     member remove a project and keep a job that no longer has it — two ticks
     for one decision, with nothing on screen saying they are related. */
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
      /* ⚠ FILL, NEVER REPLACE — the writer guards both on the profile's value
         being empty, so a curated headline or overview is untouchable here. */
      /* SOURCE IS Person.title SINCE E595 WS-B; the FILL-NEVER-REPLACE rule
         above is unchanged. */
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
