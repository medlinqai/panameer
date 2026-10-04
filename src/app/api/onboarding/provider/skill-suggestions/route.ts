import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { ownedProviderProfile } from "@/lib/access";
import { suggestableSkills } from "@/lib/resume/match";
import { getOnboardingState } from "@/lib/onboarding";
import { SELF_ADDED_WEIGHT } from "@/lib/provider-rollup";
import { activeCatalogId } from "@/lib/catalog";
import { titleCaseSkill } from "@/lib/skill-match";

export async function POST(request: Request) {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Owner-scoped: the profile comes from the SESSION, never from the request.
  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true, role_type_id: true, pillar_id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "No provider profile" }, { status: 403 });
  }
  if (!profile.role_type_id || !profile.pillar_id) {
    return NextResponse.json(
      { error: "Choose your role and domain before adding skills." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const raw: unknown = (body as { terms?: unknown }).terms;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "No terms supplied" }, { status: 400 });
  }

  const terms = suggestableSkills(raw.filter((t): t is string => typeof t === "string"));
  if (terms.length === 0) {
    return NextResponse.json({ error: "Nothing to add" }, { status: 400 });
  }

  const catalogId = await activeCatalogId();
  const catalogRow = catalogId ? { id: catalogId } : null;
  if (!catalogRow) {
    return NextResponse.json({ error: "Catalog unavailable" }, { status: 500 });
  }

  const added: string[] = [];
  for (const term of terms) {
    const name = titleCaseSkill(term.slice(0, 120));
    const skill = await prisma.skill.upsert({
      where: {
        catalog_id_role_type_id_pillar_id_name: {
          catalog_id: catalogRow.id,
          role_type_id: profile.role_type_id,
          pillar_id: profile.pillar_id,
          name,
        },
      },
      update: {},
      create: {
        catalog_id: catalogRow.id,
        role_type_id: profile.role_type_id,
        pillar_id: profile.pillar_id,
        name,
        is_custom: true,
        origin: "PROVIDER",
      },
      select: { id: true, name: true },
    });
    // createMany + skipDuplicates: re-confirming a term must not 500 on the
    // composite unique.
    await prisma.providerSkill.createMany({
      data: [{
        provider_profile_id: profile.id,
        skill_id: skill.id,
        source: "SELF_ADDED" as const,
        weight: SELF_ADDED_WEIGHT,
      }],
      skipDuplicates: true,
    });
    added.push(skill.name);
  }

  return NextResponse.json({ added, state: await getOnboardingState(viewer) });
}
