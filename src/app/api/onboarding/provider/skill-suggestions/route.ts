import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { ownedProviderProfile } from "@/lib/access";
import { suggestableSkills } from "@/lib/resume/match";
import { getOnboardingState } from "@/lib/onboarding";
import { SELF_ADDED_WEIGHT } from "@/lib/provider-rollup";
import { activeCatalogId } from "@/lib/catalog";
import { titleCaseSkill } from "@/lib/skill-match";

/**
 * Confirm imported skill terms the catalog didn't recognise (WS-B / E051-5).
 *
 * The provider ticks the real ones on the review; they are added as CUSTOM
 * skills on their own profile. Junk is left unticked and discarded — nothing
 * reaches the catalog that a human didn't affirm.
 *
 * WHY NOT REUSE THE `catalog` STEP. It used to be the 15-skill ceiling, which
 * the importer never honoured and which E202 has now removed everywhere. What
 * remains is the `is_custom` flag: these terms are NOT in the catalog, and the
 * catalog step has no way to express that.
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

  /* ⚠⚠ BY CODE, NEVER `findFirst()` (`P1-A1.5-E483`) — see `activeCatalogId`. */
  const catalogId = await activeCatalogId();
  const catalogRow = catalogId ? { id: catalogId } : null;
  if (!catalogRow) {
    return NextResponse.json({ error: "Catalog unavailable" }, { status: 500 });
  }

  const added: string[] = [];
  for (const term of terms) {
    /* ⚠⚠ STORED IN TITLE CASE (`E602` WS-B 3), and `titleCaseSkill` leaves a
       word alone when it already carries an upper-case letter — so a provider
       typing `iProcurement` or `OTBI` keeps it, while `purchase requisitions`
       is stored as `Purchase Requisitions`.
       ⚠ SUPERSEDED, quoted not deleted (`E164`):
       //   const name = term.slice(0, 120); */
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
        /* ⚠⚠ `origin` IS THE SHIELD NOW (`P1-A1.5-E480`), NOT `is_custom`.
           The seed's retirement pass reads `origin` and may only delete
           `SEED` rows. ⚠ WITHOUT THIS LINE THIS ROW DEFAULTS TO `SEED` AND
           THE NEXT RESEED DELETES IT SILENTLY. Both are written while
           `is_custom` survives as the superseded ancestor. */
        is_custom: true,
        origin: "PROVIDER",
      },
      select: { id: true, name: true },
    });
    // createMany + skipDuplicates: re-confirming a term must not 500 on the
    // composite unique.
    /*
      ⚠⚠ `source` AND `weight` ARE NAMED, AND THAT IS THE WHOLE POINT
      (`P1-A1.4-E553`). ⚠ SUPERSEDED, quoted not deleted (`E164`):
          data: [{ provider_profile_id: profile.id, skill_id: skill.id }],
      ⚠⚠ `ProviderSkill.source` DEFAULTS TO `DERIVED`, so this minted a row the
      ROLLUP believes it wrote — and `recomputeProviderRollup` deletes every
      DERIVED row before rebuilding from dated jobs. A term the provider
      confirmed has no job behind it, so the rebuild could never recreate it and
      the next import silently destroyed it. ⚠ A CONFIRMED SUGGESTION IS
      `SELF_ADDED` — *"claimed on the profile with no job behind it"* — which the
      rollup preserves and upgrades if a job ever derives it.
      ⚠ `SELF_ADDED_WEIGHT` travels with it or `getOnboardingState`'s
      `weight > 0 || source === "SELF_ADDED"` filter hides the row.
    */
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
