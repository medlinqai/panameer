import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { ownedProviderProfile } from "@/lib/access";
import { suggestableSkills } from "@/lib/resume/match";
import { getOnboardingState } from "@/lib/onboarding";

/**
 * Confirm imported skill terms the catalog didn't recognise (WS-B / E051-5).
 *
 * The provider ticks the real ones on the review; they are added as CUSTOM
 * skills on their own profile. Junk is left unticked and discarded — nothing
 * reaches the catalog that a human didn't affirm.
 *
 * WHY NOT REUSE THE `catalog` STEP. That handler enforces the wizard's
 * `MAX_SKILLS` = 15 ceiling, which is right for a person picking skills by hand
 * and wrong here: the importer writes matched skills without that cap (the
 * parser's own cap is 40), so a résumé that produced 20 matches would make every
 * confirmation fail with "Pick up to 15 skills" — an error about a limit the
 * provider never chose to exceed. Same upsert semantics, same `is_custom` flag,
 * without a ceiling that belongs to a different surface.
 *
 * `is_custom` IS the queue for the future admin catalog editor: the terms real
 * providers confirmed are exactly the candidates worth promoting into the
 * taxonomy, and they can be listed with one query. Building that editor is a
 * later brief — this only makes sure the evidence for it accumulates.
 */
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

  /*
    Re-filter SERVER-SIDE through the same rule the suggestion list was built
    with. The client sends back a subset of what it was shown, but "what it was
    shown" is not something a server can take on trust — this endpoint would
    otherwise be an open write into the skill table with a free-text name.
  */
  const terms = suggestableSkills(raw.filter((t): t is string => typeof t === "string"));
  if (terms.length === 0) {
    return NextResponse.json({ error: "Nothing to add" }, { status: 400 });
  }

  const catalogRow = await prisma.serviceCatalog.findFirst({ select: { id: true } });
  if (!catalogRow) {
    return NextResponse.json({ error: "Catalog unavailable" }, { status: 500 });
  }

  const added: string[] = [];
  for (const term of terms) {
    const name = term.slice(0, 120);
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
      },
      select: { id: true, name: true },
    });
    // createMany + skipDuplicates: re-confirming a term must not 500 on the
    // composite unique.
    await prisma.providerSkill.createMany({
      data: [{ provider_profile_id: profile.id, skill_id: skill.id }],
      skipDuplicates: true,
    });
    added.push(skill.name);
  }

  return NextResponse.json({ added, state: await getOnboardingState(viewer) });
}
