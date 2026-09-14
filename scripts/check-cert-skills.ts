import { prisma } from "@/lib/prisma";
import { applyParsedResume } from "@/lib/resume/import";
import { OFFERABLE } from "@/lib/catalog";
import type { ParsedResume } from "@/lib/resume/parse";

/**
 * ⚠⚠ DOES A CERTIFICATE ACTUALLY PRODUCE A SKILL? (`P2-J1.4-E509` WS-B)
 *
 * WS-B shipped with ZERO net new skills on the supplied fixture, because the one
 * certificate that matched named a skill the résumé already listed. ⚠ THAT
 * PROVED ONLY THAT NOTHING BROKE. It never proved the path WORKS.
 *
 * ⚠ THIS RUNS THE REAL `applyParsedResume` AGAINST A REAL PROFILE with a parsed
 * payload whose skills section does NOT contain the skill, and whose CERTIFICATE
 * TITLE does. If a `ProviderSkill` row appears, the path works end to end. If it
 * does not, WS-B is unproven and says so out loud.
 *
 * ⚠ IT CLEANS UP AFTER ITSELF and touches no existing profile: it creates a
 * throwaway Person + ProviderProfile and deletes both, whatever the outcome.
 * ⚠ NO AI, NO NETWORK, NO COST — the payload is constructed, not parsed.
 */
let fail = 0;
const assert = (cond: boolean, label: string) => {
  console.log(`${cond ? "ok   " : "FAIL "} ${label}`);
  if (!cond) fail++;
};

const blank = (): ParsedResume =>
  ({
    fullName: null, headline: null, email: null, phone: null, location: null,
    summary: null, skills: [], experiences: [], education: [],
    /* ⚠ EVERY LIST THE APPLIER WALKS — a missing one is a TypeError, not a
       no-op, and the point of this probe is the skills path, not a crash. */
    projects: [], certifications: [], languages: [], links: [],
  }) as unknown as ParsedResume;

async function main() {
  /*
    A real ACTIVE catalog skill to embed in a certificate title.

    ⚠⚠ MATCHED BY NAME, NOT BY A SINGLE ID, AND THAT IS NOT LAZINESS — IT IS THE
    CATALOG'S OWN SHAPE. `Purchasing` exists THREE times in `PANAMEER_V1`, under
    three different (role, domain) pairs, because a skill's identity is the
    TRIPLE and not the name. `Inventory` and `Project Costing` exist four times
    each. ⚠ An assertion pinned to one id fails for the right answer — which is
    exactly what the first cut of this probe did, and it read as "WS-B is
    broken" when WS-B was fine.
    ⚠ SO: collect EVERY id carrying the name and assert the write landed on ONE
    of them.
  */
  const targets = await prisma.skill.findMany({
    where: { ...OFFERABLE, name: "Purchasing" },
    select: { id: true, name: true },
  });
  const target = targets[0];
  const targetIds = new Set(targets.map((t) => t.id));
  if (!target) {
    console.log("skip  — no ACTIVE 'Purchasing' skill in this catalog");
    return;
  }

  const company = await prisma.company.findFirst({ select: { id: true } });
  const person = await prisma.person.create({
    data: {
      company_id: company!.id,
      first_name: "E509",
      last_name: "CertProbe",
      is_service_provider: true,
    },
    select: { id: true },
  });
  /* ⚠ THE PERSON IS CREATED FIRST, SO THE CLEANUP MUST COVER A FAILURE BETWEEN
     THE TWO. The first run of this probe threw on a NOT NULL column here and
     left an orphan Person behind, because the `try` had not started yet. */
  const profile = await prisma.providerProfile.create({
    /* ⚠ `headline` is NOT NULL on ProviderProfile — supplied so the probe does
       not depend on a default that does not exist. */
    data: { person_id: person.id, headline: "E509 cert probe" },
    select: { id: true },
  });

  try {
    const parsed = blank();
    /* ⚠⚠ THE SKILLS SECTION DELIBERATELY DOES NOT NAME IT. If this list
       contained "Purchasing" the test would pass for the old reason. */
    parsed.skills = ["Something Unmatchable 12345"];
    parsed.certifications = [
      { name: `Oracle ${target.name} Certified Specialist`, issuer: null, issuedOn: null, expiresOn: null },
    ];

    const applied = await applyParsedResume(profile.id, parsed, "RESUME");

    const rows = await prisma.providerSkill.findMany({
      where: { provider_profile_id: profile.id },
      select: { skill_id: true, source: true },
    });
    const landed = rows.find((r) => targetIds.has(r.skill_id));

    assert(
      !!landed,
      `a skill named ONLY in a certificate title lands as a ProviderSkill ("${target.name}")`
    );
    assert(
      landed?.source === "SELF_ADDED",
      `and it is written SELF_ADDED (E416), not DERIVED — got ${landed?.source ?? "(none)"}`
    );
    assert(
      applied.skillsMatchedNames.includes(target.name),
      `and the receipt reports it as matched`
    );
    /* ⚠ THE CERTIFICATE SENTENCE MUST NOT BECOME A SUGGESTED SKILL. */
    assert(
      !applied.skillSuggestions.some((s) => /Certified Specialist/i.test(s)),
      `the certificate title is NOT offered to the admin as a candidate skill`
    );
    /* ⚠ AND THE UNMATCHED SKILL FROM THE SKILLS SECTION IS STILL REPORTED. */
    assert(
      applied.skillsUnmatched.includes("Something Unmatchable 12345"),
      `a genuinely unmatched SKILL is still reported as a gap`
    );
  } finally {
    await prisma.providerSkill.deleteMany({ where: { provider_profile_id: profile.id } });
    await prisma.providerProfileSpecialization.deleteMany({ where: { provider_profile_id: profile.id } });
    await prisma.certification.deleteMany({ where: { provider_profile_id: profile.id } });
    await prisma.providerProfile.delete({ where: { id: profile.id } });
    await prisma.person.delete({ where: { id: person.id } });
  }

  console.log(`\ncheck:cert-skills — ${fail === 0 ? "all passed" : `${fail} FAILED`}`);
  if (fail > 0) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
