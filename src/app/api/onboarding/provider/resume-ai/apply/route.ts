import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { ownedProviderProfile } from "@/lib/access";
import { SELF_ADDED_WEIGHT } from "@/lib/provider-rollup";
import { applyParsedResume } from "@/lib/resume/import";
import type { ParsedResume } from "@/lib/resume/parse";
import { Prisma } from "@prisma/client";

const Body = z.object({
  skillIds: z.array(z.string().uuid()).max(500).default([]),
  specializationIds: z.array(z.string().uuid()).max(500).default([]),
  rest: z.boolean().default(false),
  removeEmployerIds: z.array(z.string().uuid()).max(200).default([]),
  removeProjectIds: z.array(z.string().uuid()).max(200).default([]),
});

export async function POST(req: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true, person_id: true },
  });
  if (!profile) return NextResponse.json({ error: "No provider profile" }, { status: 403 });

  const parsedBody = Body.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const { skillIds, specializationIds, rest, removeEmployerIds, removeProjectIds } =
    parsedBody.data;

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

  const { computeRerunDiff } = await import("@/lib/resume/rerun-diff");
  const diff = await computeRerunDiff(
    profile.id,
    row.parsed as unknown as Parameters<typeof computeRerunDiff>[1]
  );
  const offeredSkills = new Set(diff.skills.added.map((s) => s.id));
  const offeredSpecs = new Set(diff.specializations.added.map((s) => s.id));

  const skills = skillIds.filter((id) => offeredSkills.has(id));
  const specializations = specializationIds.filter((id) => offeredSpecs.has(id));

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

  let applied: Awaited<ReturnType<typeof applyParsedResume>> | null = null;
  if (rest) {
    const parsed = row.parsed as unknown as ParsedResume;
    applied = await applyParsedResume(
      profile.id,
      { ...parsed, skills: [] },
      "RESUME"
    );
  }

  const offeredEmployers = new Set(diff.onProfileNotInResume.employers.map((e) => e.id));
  const offeredProjects = new Set(diff.onProfileNotInResume.projects.map((p) => p.id));
  const employerIds = removeEmployerIds.filter((id) => offeredEmployers.has(id));
  const projectIds = removeProjectIds.filter((id) => offeredProjects.has(id));

  let removedEmployers = 0;
  let removedProjects = 0;
  if (employerIds.length > 0) {
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
