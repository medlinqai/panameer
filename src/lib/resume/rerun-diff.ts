import { prisma } from "@/lib/prisma";
import { OFFERABLE, activeCatalogId } from "@/lib/catalog";
import { matchSkills } from "@/lib/resume/match";
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
      employers: { select: { name: true, role_title: true } },
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
  const haveEmployers = new Set(
    profile.employers.map((e) => `${e.name} ${e.role_title ?? ""}`.toLowerCase())
  );
  const haveEdu = new Set(profile.education.map((e) => e.institution.toLowerCase()));
  const haveCerts = new Set(profile.certifications.map((c) => c.name.toLowerCase()));
  const haveLangs = new Set(profile.languages.map((l) => l.name.toLowerCase()));

  return {
    skills: { added, already, noLongerMentioned },
    specializations: { added: specAdded },
    other: {
      /* ⚠ FILL, NEVER REPLACE — the writer guards both on the profile's value
         being empty, so a curated headline or overview is untouchable here. */
      headlineWillFill: !profile.headline?.trim() && Boolean(parsed.headline),
      overviewWillFill: !profile.overview?.trim() && Boolean(parsed.overview),
      employers: (parsed.experiences ?? []).filter(
        (e) =>
          !haveEmployers.has(
            `${String((e as { employer?: string }).employer ?? "")} ${String(
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
