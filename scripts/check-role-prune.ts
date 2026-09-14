import { prisma } from "@/lib/prisma";
import { applyParsedResume, } from "@/lib/resume/import";
import { deriveRolesFromSkills, saveProviderStep } from "@/lib/onboarding";
import type { ParsedResume } from "@/lib/resume/parse";

/**
 * ⚠⚠ DOES THE ROLE STEP'S PRUNE EAT THE IMPORT? (`P2-J1.4-E507` / `E509` WS-A)
 *
 * ⚠ THE WALK ACCOUNT MEASURED 1 ProviderSkill ROW WHERE THE IMPORT MATCHED TEN.
 * `E416` had NOT regressed — the ten were written correctly as `SELF_ADDED` and
 * then DELETED by the role step, which prunes every skill whose role is not one
 * the provider "claimed":
 *     skill: { role_type_id: { notIn: roleTypeIds } }
 * ⚠⚠ THE PRUNE IS CORRECT. THE ROLE WAS WRONG. `Technology-Specific · Salesforce`
 * was derived by catalog size (`E509`), so ten Application-Specific skills were
 * strandable-by-definition and the only survivor was `ADFdi` — a name collision
 * that happens to live under Technology-Specific.
 *
 * ⚠ THIS ASSERTS THE ROOT FIX HOLDS: derive the role from the provider's OWN
 * skills, save it the way the role step does, and the imported skills SURVIVE.
 * ⚠ No AI, no network: the parsed payload is constructed.
 */
let fail = 0;
const assert = (c: boolean, label: string) => {
  console.log(`${c ? "ok   " : "FAIL "} ${label}`);
  if (!c) fail++;
};

const blank = (): ParsedResume =>
  ({
    fullName: null, headline: null, email: null, phone: null, location: null,
    summary: null, skills: [], experiences: [], education: [], projects: [],
    certifications: [], languages: [], links: [],
  }) as unknown as ParsedResume;

async function main() {
  /* Real Application-Specific skills, the shape the fixture produced. */
  const wanted = ["Procurement", "Inventory", "Purchasing", "General Ledger", "Tax"];
  const catalogRows = await prisma.skill.findMany({
    where: { status: "ACTIVE", name: { in: wanted } },
    select: { id: true, name: true, role_type_id: true },
  });
  if (catalogRows.length < 3) {
    console.log("skip  — catalog does not carry enough of the probe skills");
    return;
  }

  const company = await prisma.company.findFirst({ select: { id: true } });
  /* ⚠ A REAL User, because `saveProviderStep` takes a Viewer and refuses an
     unverified account — the probe must go through the same door the wizard does. */
  const user = await prisma.user.create({
    data: {
      email: `e507.prune.${Date.now()}@example.test`,
      email_verified: new Date(),
      tos_accepted_at: new Date(),
      first_name: "E507",
      last_name: "PruneProbe",
    },
    select: { id: true },
  });
  const person = await prisma.person.create({
    data: {
      company_id: company!.id, user_id: user.id,
      first_name: "E507", last_name: "PruneProbe", is_service_provider: true,
    },
    select: { id: true },
  });
  const viewer = {
    userId: user.id, role: "MEMBER", isSystemAdmin: false, isAdmin: false,
    isServiceBuyer: false, isServiceProvider: true, isServiceCoordinator: false,
    isSupport: false, pAccountId: null,
  } as Parameters<typeof saveProviderStep>[0];
  const profile = await prisma.providerProfile.create({
    data: { person_id: person.id, headline: "E507 prune probe" },
    select: { id: true },
  });

  try {
    const parsed = blank();
    parsed.skills = wanted;
    const applied = await applyParsedResume(profile.id, parsed, "RESUME");
    const afterImport = await prisma.providerSkill.count({ where: { provider_profile_id: profile.id } });
    assert(afterImport > 0, `the import writes skills (${afterImport} rows, ${applied.skillsMatched} matched)`);

    /* ⚠ WHAT `E509` WS-A DERIVES — the provider's own skills, not catalog size. */
    const derived = await deriveRolesFromSkills(profile.id);
    const roles = await prisma.roleType.findMany({ select: { id: true, display: true, name: true } });
    const rn = new Map(roles.map((r) => [r.id, r.display ?? r.name]));
    assert(
      derived.roleTypeIds.length > 0,
      `the role derives from those skills (${derived.roleTypeIds.map((r) => rn.get(r)).join(", ")})`
    );

    /* ⚠ SAVED THE WAY THE ROLE STEP SAVES IT — the same code path that prunes. */
    await saveProviderStep(viewer, "roles", { roleTypeIds: derived.roleTypeIds } as never);

    const survivors = await prisma.providerSkill.count({ where: { provider_profile_id: profile.id } });
    assert(
      survivors === afterImport,
      `⚠⚠ THE ROLE STEP DOES NOT EAT THEM — ${afterImport} before, ${survivors} after`
    );

    /*
      ── ⚠⚠ PART D — THE DOMAIN SELF-CORRECTS (`E507`) ─────────────────────

      `E509` WS-A kept a catalog-count fallback for the manual path. It must not
      outlive the evidence: once the provider HAS skills, a domain chosen by
      catalog size is wrong. Force a stale domain onto the profile and confirm a
      skills save moves it back — WITHIN the chosen role, never across it.
    */
    const primaryRole = derived.roleTypeIds[0];
    const wrongPillar = await prisma.skill.findFirst({
      where: { status: "ACTIVE", role_type_id: primaryRole, pillar_id: { not: null } },
      orderBy: { name: "desc" },
      select: { pillar_id: true },
    });
    const right = (await deriveRolesFromSkills(profile.id)).pillarId;
    if (wrongPillar?.pillar_id && wrongPillar.pillar_id !== right) {
      await prisma.providerProfile.update({
        where: { id: profile.id },
        data: { pillar_id: wrongPillar.pillar_id },
      });
      const held = await prisma.providerSkill.findMany({
        where: { provider_profile_id: profile.id }, select: { skill_id: true } });
      await saveProviderStep(viewer, "skills", { skillIds: held.map((h) => h.skill_id) } as never);
      const after = await prisma.providerProfile.findUnique({
        where: { id: profile.id }, select: { pillar_id: true, role_type_id: true } });
      assert(after?.pillar_id === right, `a skills save RECOMPUTES a stale domain back to the evidence`);
      assert(after?.role_type_id === primaryRole, `and it does NOT touch the provider's chosen ROLE`);
    } else {
      console.log("skip  — no distinct second domain under this role to stale-test with");
    }

    /* ⚠ AND THE COUNTER-CASE: a WRONG role really would prune them, which is why
       the derivation is the fix and the prune is not the bug. */
    const wrongRole = roles.find((r) => (r.display ?? r.name).startsWith("Technology"));
    await saveProviderStep(viewer, "roles", { roleTypeIds: [wrongRole!.id] } as never);
    const afterWrong = await prisma.providerSkill.count({ where: { provider_profile_id: profile.id } });
    assert(
      afterWrong < afterImport,
      `a WRONG role prunes them (${afterImport} → ${afterWrong}) — the prune is correct, the role was not`
    );
  } finally {
    await prisma.providerSkill.deleteMany({ where: { provider_profile_id: profile.id } });
    await prisma.providerProfileSpecialization.deleteMany({ where: { provider_profile_id: profile.id } });
    await prisma.providerProfileRole.deleteMany({ where: { provider_profile_id: profile.id } });
    await prisma.certification.deleteMany({ where: { provider_profile_id: profile.id } });
    await prisma.providerProfile.delete({ where: { id: profile.id } });
    await prisma.person.delete({ where: { id: person.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }

  console.log(`\ncheck:role-prune — ${fail === 0 ? "all passed" : `${fail} FAILED`}`);
  if (fail > 0) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
