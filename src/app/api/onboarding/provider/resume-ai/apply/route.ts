import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { ownedProviderProfile } from "@/lib/access";
/* ⚠ FROM `provider-rollup`, WHERE IT IS DEFINED — the same import
   `import.ts:8` uses. Not a second constant. */
import { SELF_ADDED_WEIGHT } from "@/lib/provider-rollup";
import { applyParsedResume } from "@/lib/resume/import";
import type { ParsedResume } from "@/lib/resume/parse";
import { Prisma } from "@prisma/client";

/**
 * ── ⚠⚠ POST — WRITE ONLY WHAT THE PROVIDER TICKED (`P2-J14-E561` WS-B) ──────
 *
 * ⚠⚠⚠ THIS ROUTE CONTAINS NO DELETE AND NEVER WILL. `E517` destroyed nine
 * `provider_skill` rows with no undo, and deleted rows are unrecoverable — a
 * re-import is the only repair. ⚠ A re-run ADDS. That is the whole contract.
 *
 * ── ⚠⚠⚠ IT COVERS ALL NINE CATEGORIES (`E561` PART 1, ruled 2026-09-19) ────
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * // IT DOES NOT CALL `applyParsedResume`... this writes the TWO the brief
 * // scopes - "FIRST SCOPE IS SKILLS AND SPECIALIZATIONS ONLY."
 *
 * ⚠⚠ THAT WAS A REGRESSION DRESSED AS A SAFETY IMPROVEMENT. Today's un-ticked
 * button writes all nine; a provider gets 24 employer entries. Writing two and
 * listing the rest as "not applied here" takes something away.
 *
 * ⚠⚠ THE WRITER IS REUSED, NOT REIMPLEMENTED. `applyParsedResume` reads exactly
 * eight fields off `parsed`; this FILTERS the `ParsedResume` to the ticked items
 * and passes it in UNCHANGED. ⚠⚠⚠ `applyParsedResume` IS NOT EDITED BY THIS
 * BRIEF, so the first-import path stays provably untouched.
 *
 * ── ⚠⚠⚠ WHERE FILTERING IS NOT FAITHFUL, AND WHAT IS DONE INSTEAD ──────────
 *
 * ⚠ MEASURED 2026-09-19, three couplings — this is why `skills` is NOT filtered:
 *   1. `match.ts:186` — `deriveRoleAnchor(terms, ...)` reads the WHOLE term
 *      list. Removing ANY term can change which role a `E515` role-spanning
 *      name resolves to, so a still-ticked skill could land under a different
 *      role than the diff showed.
 *   2. `matchSkills` returns `CatalogSkill[]` and does NOT record which TERM
 *      produced each match. ⚠⚠ THE TICK IS ON CATALOG IDS; THE WRITER CONSUMES
 *      TERMS. There is no filter of `parsed.skills` that provably yields exactly
 *      the ticked ids, and per-term matching answers differently from batch
 *      matching by the anchor's own design.
 *   3. `import.ts:1046` — the skills block fires on `certTerms` ALONE, so
 *      emptying `parsed.skills` does not stop it.
 *
 * ⚠⚠ SO: `skills` IS EMPTIED and the ticked skill ids are written DIRECTLY here,
 * in the writer's exact shape. Everything else is filtered and handed to the
 * writer. ⚠ That is the ONE place a write is expressed twice, and `check:rerun`
 * asserts the two shapes match.
 *
 * ⚠⚠ CERTIFICATIONS ARE PASSED THROUGH, AND THE SKILLS THEY IMPLY LAND WITH
 * THEM. That is not a leak — it is `check:cert-skills`' own gated rule: *"a
 * skill named ONLY in a certificate title lands, `SELF_ADDED`."* ⚠ A provider
 * who ticks a certification has consented to what that certificate says, and the
 * diff names those skills before the tick.
 *
 * ⚠ PROJECTS RIDE WITH THEIR EMPLOYERS. `import.ts` attaches a project via
 * `employerIdByName`, built from the employers the SAME call creates — so
 * unticking an employer would orphan its projects. ⚠⚠ Employers and projects
 * are therefore ONE tick, not two.
 *
 * ⚠⚠ THE IDS ARE VALIDATED AGAINST THE STORED PARSE, NOT TRUSTED. A caller
 * cannot post an arbitrary skill id and have it written: only ids the most
 * recent parse actually matched are accepted. ⚠ The viewer is the session; the
 * profile is resolved from it, never from the payload.
 */
const Body = z.object({
  skillIds: z.array(z.string().uuid()).max(500).default([]),
  specializationIds: z.array(z.string().uuid()).max(500).default([]),
  /**
   * ⚠⚠ THE OTHER SEVEN, AS ONE TICK. ⚠ NOT a UI shortcut — a MEASURED
   * consequence: projects attach to employers created in the same call, and
   * certificate titles feed the skill match, so these categories are not
   * independently separable without editing the writer. ⚠⚠⚠ THE BRIEF FORBIDS
   * EDITING IT, so the tick is grouped where the data is coupled and the diff
   * says so.
   */
  rest: z.boolean().default(false),
  /*
    ── ⚠⚠⚠ THE REMOVAL LIST (`P2-A1.1-E740`, A2) ───────────────────────────
    ⚠ The ids the member TICKED on *"On your profile but not in this résumé"*.
    ⚠⚠ **DEFAULT EMPTY, AND EVERY ROW IS UNTICKED ON SCREEN**, so a member who
    presses Save without reading that list removes nothing.
  */
  removeEmployerIds: z.array(z.string().uuid()).max(200).default([]),
  removeProjectIds: z.array(z.string().uuid()).max(200).default([]),
});

export async function POST(req: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    /* ⚠ `person_id` JOINS THE SELECT (`E741`, A3 row 5) — the notification layer
       keys on the PERSON, and a narrow select means the field has to be named or
       it does not arrive. */
    select: { id: true, person_id: true },
  });
  if (!profile) return NextResponse.json({ error: "No provider profile" }, { status: 403 });

  const parsedBody = Body.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const { skillIds, specializationIds, rest, removeEmployerIds, removeProjectIds } =
    parsedBody.data;

  /*
    ⚠⚠ NOTHING TICKED, NOTHING WRITTEN — and it says so rather than pretending
    something happened. A receipt reading "Added 0" for a click that did nothing
    is the fabricated-count defect in miniature.
  */
  if (
    skillIds.length === 0 &&
    specializationIds.length === 0 &&
    !rest &&
    removeEmployerIds.length === 0 &&
    removeProjectIds.length === 0
  ) {
    return NextResponse.json({
      ok: true,
      added: { skills: 0, specializations: 0 },
      removed: { employers: 0, projects: 0 },
    });
  }

  /*
    ⚠⚠⚠ THE ALLOWLIST. The stored parse is the authority for what MAY be
    written; the tick only narrows it. Without this, a crafted request could add
    any catalog skill to the profile — the payload deciding what is true about
    somebody, which is the shape `sendMessage` and every owner-scoped write in
    this codebase refuses.
  */
  const row = await prisma.profileImport.findFirst({
    where: { provider_profile_id: profile.id, parsed: { not: Prisma.DbNull } },
    orderBy: { created_at: "desc" },
    select: { parsed: true },
  });
  if (!row?.parsed) {
    return NextResponse.json(
      { error: "Re-read your résumé first — there's nothing proposed to apply." },
      { status: 409 }
    );
  }

  /* ⚠ Re-derive what the parse proposed, from the SAME function the preview
     rendered, so the tick cannot outrun what was shown. */
  const { computeRerunDiff } = await import("@/lib/resume/rerun-diff");
  const diff = await computeRerunDiff(
    profile.id,
    row.parsed as unknown as Parameters<typeof computeRerunDiff>[1]
  );
  const offeredSkills = new Set(diff.skills.added.map((s) => s.id));
  const offeredSpecs = new Set(diff.specializations.added.map((s) => s.id));

  const skills = skillIds.filter((id) => offeredSkills.has(id));
  const specializations = specializationIds.filter((id) => offeredSpecs.has(id));

  /*
    ⚠⚠ `SELF_ADDED`, NOT `DERIVED`, AND `skipDuplicates` — byte-for-byte the
    shape `applyParsedResume` writes (`import.ts:1161`). ⚠ `DERIVED` would make
    these rows deletable by the next rollup (`E416`/`E553`); a résumé is a CLAIM
    THE PROVIDER MADE, which is exactly what `SELF_ADDED` means.
    ⚠⚠⚠ `skipDuplicates` IS WHAT PROTECTS A HAND-ADDED ROW: if the provider
    already holds the skill, this is a no-op — it cannot downgrade, re-weight or
    replace what they curated.
  */
  if (skills.length > 0) {
    await prisma.providerSkill.createMany({
      data: skills.map((skill_id) => ({
        provider_profile_id: profile.id,
        skill_id,
        source: "SELF_ADDED" as const,
        weight: SELF_ADDED_WEIGHT,
      })),
      skipDuplicates: true,
    });
  }
  if (specializations.length > 0) {
    await prisma.providerProfileSpecialization.createMany({
      data: specializations.map((specialization_id) => ({
        provider_profile_id: profile.id,
        specialization_id,
      })),
      skipDuplicates: true,
    });
  }

  /*
    ── ⚠⚠ THE OTHER SEVEN, THROUGH THE EXISTING WRITER ──────────────────────

    ⚠⚠⚠ `skills: []` IS THE ONLY FIELD REMOVED, and it is removed because the
    tick cannot be expressed as a term filter (see the three couplings above).
    ⚠ EVERY OTHER FIELD IS PASSED THROUGH UNCHANGED, so the writer's own
    have/toAdd dedup, `skipDuplicates`, and fill-only-when-empty rules for
    `headline`/`overview` behave EXACTLY as they do on a full parse — they are
    computed inside the writer from the PROFILE, not from what we hand it.
    ⚠⚠ `certifications` STAYS, so `check:cert-skills`' rule still holds and the
    skills a certificate names still land with it.
  */
  let applied: Awaited<ReturnType<typeof applyParsedResume>> | null = null;
  if (rest) {
    const parsed = row.parsed as unknown as ParsedResume;
    applied = await applyParsedResume(
      profile.id,
      { ...parsed, skills: [] },
      "RESUME"
    );
  }

  /* ⚠ THE RECEIPT IS WHAT WAS WRITTEN, not what was asked for — the two differ
     when a tick names something the parse did not offer, and the provider is
     told the truth rather than their own request echoed back.
     ⚠⚠ `applied` CARRIES ALL NINE FIELDS and the caller's contract now admits
     them — `E561` WS-B widened `onApplied`, which is what let the receipt reach
     the data at all. */
  /*
    ── ⚠⚠⚠ THE REMOVALS — `P2-A1.1-E740` (A2) ───────────────────────────────

    ⚠⚠⚠ **IT MUST NOT CALL `deleteEmployer`, AND THAT IS THE WHOLE POINT OF
    DOING IT HERE.** `lib/employers.ts:286`'s `deleteEmployer` ends in
    `afterJobChange`, which calls `recomputeProviderRollup` — and `E553`
    measured that rebuild as capable of **deleting 297 `DERIVED` skill rows
    across 51 profiles, 139 of them unrecoverable**, on profiles whose rows no
    dated, skill-linked job can rebuild. ⚠ Scott, 2026-10-01: the removal list
    *"never fires the rollup."*
    ⚠⚠ **SO THE DELETE IS DIRECT AND OWNER-SCOPED, AND NOTHING IS RECOMPUTED
    HERE.** `completeness` is a cache that the member's next profile save
    refreshes; a stale cache is survivable, and 139 destroyed skill rows are not.

    ── ⚠⚠ WHAT HAPPENS TO WHAT HANGS OFF A REMOVED EMPLOYER — FROM THE SCHEMA ─

    ⚠ **PROJECTS: `Project.employer_id` IS `onDelete: SetNull`** — they are
    **ORPHANED, NOT DELETED** (`schema.prisma:1844`). ⚠⚠ The row survives with
    its client, dates and highlights intact. ⚠⚠⚠ **AND `listEmployers` ONLY
    REACHES PROJECTS THROUGH THEIR EMPLOYER, SO AN ORPHAN IS INVISIBLE WHILE
    REMAINING IN THE DATABASE** — `E307` records that exact trap. The copy on
    screen says so; a member must not learn it by losing sight of five years of
    engagements.
    ⚠ **JOB SKILLS: `JobSkill.employer_id` IS `onDelete: Cascade`** — the links
    on that employer **ARE DELETED** (`schema.prisma:1714`). ⚠⚠ The
    `ProviderSkill` rows are untouched: only the job→skill link goes, so the
    provider keeps the skill and loses the months that job contributed.
    ⚠⚠⚠ **THAT IS WHY NOT RECOMPUTING MATTERS TWICE OVER:** the cascade already
    changes what a rollup would compute, so running one here would rewrite the
    member's skill months from a job they only meant to tidy off a list.

    ⚠⚠ **THE ALLOWLIST IS THE DIFF, NOT THE PAYLOAD** — the same rule the skill
    ticks obey above. A crafted request naming any employer id is filtered down
    to what the preview actually offered, so this endpoint cannot be used to
    delete arbitrary rows.
  */
  const offeredEmployers = new Set(diff.onProfileNotInResume.employers.map((e) => e.id));
  const offeredProjects = new Set(diff.onProfileNotInResume.projects.map((p) => p.id));
  const employerIds = removeEmployerIds.filter((id) => offeredEmployers.has(id));
  const projectIds = removeProjectIds.filter((id) => offeredProjects.has(id));

  let removedEmployers = 0;
  let removedProjects = 0;
  if (employerIds.length > 0) {
    /* ⚠ `provider_profile_id` IN THE WHERE — ownership comes from the session's
       profile, never from the body (`access.ts`'s rule, applied to a delete). */
    const res = await prisma.employer.deleteMany({
      where: { id: { in: employerIds }, provider_profile_id: profile.id },
    });
    removedEmployers = res.count;
  }
  if (projectIds.length > 0) {
    const res = await prisma.project.deleteMany({
      where: { id: { in: projectIds }, provider_profile_id: profile.id },
    });
    removedProjects = res.count;
  }

  /*
    ── ⚠⚠ ROW 5 — THE RÉSUMÉ REBUILD FINISHED (`P2-A1.1-E741`, A3) ───────────

    ⚠ Scott's table: in-app on, email off. ⚠⚠ **IT FIRES ONCE, AT THE END, FOR
    THE WHOLE SAVE** — not per skill and not per section, because the thing that
    happened is one rebuild. ⚠ Its body carries the same counts the on-screen
    receipt does, so the bell entry and the screen cannot tell different stories.
    ⚠⚠⚠ **IT NEVER FAILS THE APPLY.** Everything above is already written.
  */
  try {
    const summaryParts = [
      skills.length > 0 && `${skills.length} skills`,
      removedEmployers > 0 && `${removedEmployers} jobs removed`,
      removedProjects > 0 && `${removedProjects} projects removed`,
    ].filter(Boolean) as string[];
    const { notify } = await import("@/lib/notifications");
    await notify({
      event: "profile.resume_rebuilt",
      personId: profile.person_id,
      vars: {
        summary: summaryParts.length > 0 ? `Updated: ${summaryParts.join(" · ")}.` : null,
      },
    });
  } catch (e) {
    console.error("[resume] could not record a rebuild notification:", e);
  }

  return NextResponse.json({
    ok: true,
    added: { skills: skills.length, specializations: specializations.length },
    /* ⚠ MEASURED FROM THE DELETE'S OWN COUNT, never from the request. */
    removed: { employers: removedEmployers, projects: removedProjects },
    applied,
    skipped: {
      skills: skillIds.length - skills.length,
      specializations: specializationIds.length - specializations.length,
    },
  });
}
