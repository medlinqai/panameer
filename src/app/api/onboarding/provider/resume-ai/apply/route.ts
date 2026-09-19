import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { ownedProviderProfile } from "@/lib/access";
/* ⚠ FROM `provider-rollup`, WHERE IT IS DEFINED — the same import
   `import.ts:8` uses. Not a second constant. */
import { SELF_ADDED_WEIGHT } from "@/lib/provider-rollup";
import { Prisma } from "@prisma/client";

/**
 * ── ⚠⚠ POST — WRITE ONLY WHAT THE PROVIDER TICKED (`P2-J14-E561` WS-B) ──────
 *
 * ⚠⚠⚠ THIS ROUTE CONTAINS NO DELETE AND NEVER WILL. `E517` destroyed nine
 * `provider_skill` rows with no undo, and deleted rows are unrecoverable — a
 * re-import is the only repair. ⚠ A re-run ADDS. That is the whole contract.
 *
 * ⚠⚠ IT DOES NOT CALL `applyParsedResume`, AND THAT IS DELIBERATE. That writer
 * applies NINE categories; this writes the TWO the brief scopes — *"FIRST SCOPE
 * IS SKILLS AND SPECIALIZATIONS ONLY. Title, overview, work history, education
 * and certifications are out."* ⚠⚠⚠ NOT CALLING IT IS ALSO WHAT MAKES THE
 * FIRST-IMPORT PATH PROVABLY UNTOUCHED: `applyParsedResume` is not edited by
 * this brief at all, so there is no way for a re-run change to reach it.
 *
 * ⚠ THE CONSEQUENCE IS REPORTED, NOT HIDDEN: the seven other categories are
 * SHOWN in the diff (so nothing lands unannounced) but are NOT applied by this
 * route. Today's un-ticked re-run does apply them. **That narrowing is the
 * brief's scope and it is raised at the WS-B gate for Scott to rule on.**
 *
 * ⚠⚠ THE IDS ARE VALIDATED AGAINST THE STORED PARSE, NOT TRUSTED. A caller
 * cannot post an arbitrary skill id and have it written: only ids the most
 * recent parse actually matched are accepted. ⚠ The viewer is the session; the
 * profile is resolved from it, never from the payload.
 */
const Body = z.object({
  skillIds: z.array(z.string().uuid()).max(500).default([]),
  specializationIds: z.array(z.string().uuid()).max(500).default([]),
});

export async function POST(req: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: "No provider profile" }, { status: 403 });

  const parsedBody = Body.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const { skillIds, specializationIds } = parsedBody.data;

  /*
    ⚠⚠ NOTHING TICKED, NOTHING WRITTEN — and it says so rather than pretending
    something happened. A receipt reading "Added 0" for a click that did nothing
    is the fabricated-count defect in miniature.
  */
  if (skillIds.length === 0 && specializationIds.length === 0) {
    return NextResponse.json({ ok: true, added: { skills: 0, specializations: 0 } });
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

  /* ⚠ THE RECEIPT IS WHAT WAS WRITTEN, not what was asked for — the two differ
     when a tick names something the parse did not offer, and the provider is
     told the truth rather than their own request echoed back. */
  return NextResponse.json({
    ok: true,
    added: { skills: skills.length, specializations: specializations.length },
    skipped: {
      skills: skillIds.length - skills.length,
      specializations: specializationIds.length - specializations.length,
    },
  });
}
