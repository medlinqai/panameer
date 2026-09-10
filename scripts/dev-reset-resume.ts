/**
 * `dev:reset-resume` — clear ONE profile's résumé-sourced sections so an import
 * can be re-run (`P1-A1.4-E407` WS-8).
 *
 * ── ⚠⚠ WHY THIS IS A SCRIPT AND NOT A BUTTON ──────────────────────────────
 *
 * SCOTT: *"Can I re-run the resume creation? So I could delete this whole run,
 * you write a fix, then i re-run it?"* — and then the right order: *"oops i run
 * the brief… then re-run the resume parser."* That loop did not work, for two
 * measured reasons: `applyParsedResume` is ADDITIVE (it de-duplicates against
 * what is there and never clears), and the "read it again" panel is hidden once
 * `employers.length > 0` — the very state that makes somebody want a re-read.
 *
 * ⚠⚠ THE PREFERRED FIX IS BLOCKED, AND THIS IS THE REPORTED REASON. Replacing
 * only the rows a previous import created needs to know WHICH rows those are,
 * and **the schema does not record it**: `ProfileImport` is referenced by
 * nothing except `ProviderProfile.imports`, and no Employer, Skill, Education,
 * Language or Certification row carries an import id or an `origin`. An imported
 * row and a hand-typed one are INDISTINGUISHABLE. `E407`: *"if you cannot tell
 * them apart, STOP AND REPORT rather than guessing, because the failure mode is
 * deleting a provider's own work."* Adding provenance is a schema change and
 * needs Scott's word, so it is reported, not built.
 *
 * ⚠ SO THIS IS THE BRIEF'S OPTION 3 — a DEV-ONLY reset, run deliberately by a
 * person, against ONE named email. ⚠⚠ IT IS NOT A USER-FACING CONTROL. No route,
 * no button, no API. Shipping a destructive control to providers to solve a
 * testing problem is exactly what `E407` forbids.
 *
 * ⚠ IT REFUSES TO DELETE WITHOUT `--yes`. A dry run is the default: it prints
 * every count first, so the person sees what is about to go before it goes.
 *
 * USAGE
 *   npm run dev:reset-resume -- someone@example.com          # dry run, prints counts
 *   npm run dev:reset-resume -- someone@example.com --yes    # actually clears
 */
import { prisma } from "@/lib/prisma";

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => a.includes("@"))?.toLowerCase();
  const confirmed = args.includes("--yes");

  if (!email) {
    console.error(
      "usage: npm run dev:reset-resume -- <email> [--yes]\n" +
        "  Clears the résumé-sourced sections of ONE provider profile.\n" +
        "  Without --yes it only reports what it would clear."
    );
    process.exit(1);
  }

  const person = await prisma.person.findFirst({
    where: { user: { email } },
    select: { id: true, first_name: true, last_name: true, providerProfile: { select: { id: true } } },
  });
  if (!person?.providerProfile) {
    console.error(`No provider profile found for ${email}.`);
    process.exit(1);
  }
  const profileId = person.providerProfile.id;

  const [employers, projects, education, languages, certifications, skills, imports] =
    await Promise.all([
      prisma.employer.count({ where: { provider_profile_id: profileId } }),
      prisma.project.count({ where: { provider_profile_id: profileId } }),
      prisma.education.count({ where: { provider_profile_id: profileId } }),
      prisma.language.count({ where: { provider_profile_id: profileId } }),
      prisma.certification.count({ where: { provider_profile_id: profileId } }),
      prisma.providerSkill.count({ where: { provider_profile_id: profileId } }),
      prisma.profileImport.count({ where: { provider_profile_id: profileId } }),
    ]);

  console.log(`\nProfile: ${person.first_name} ${person.last_name}  <${email}>`);
  console.log(`  employers       ${employers}`);
  console.log(`  projects        ${projects}`);
  console.log(`  education       ${education}`);
  console.log(`  languages       ${languages}`);
  console.log(`  certifications  ${certifications}`);
  console.log(`  skills          ${skills}`);
  console.log(`  imports         ${imports}`);

  /*
    ⚠⚠ HEADLINE AND OVERVIEW ARE NOT TOUCHED. `applyParsedResume` already
    refuses to overwrite typed text — it fills them ONLY when empty — so they are
    the one part of the profile that is known to be the person's own words. ⚠ A
    consequence worth knowing: because they are kept, a re-import will not
    refresh them. Clear them by hand if that is what you want to test.
  */
  console.log(
    `\n⚠ headline and overview are NOT cleared — they are the only fields known to be typed by the person.`
  );

  if (!confirmed) {
    console.log(`\nDRY RUN. Nothing was deleted. Re-run with --yes to clear the sections above.\n`);
    await prisma.$disconnect();
    return;
  }

  /*
    ⚠ ONE TRANSACTION. A half-cleared profile is worse than an uncleared one: the
    re-import would then de-duplicate against whatever survived and produce a
    mixture nobody can reason about.
    ⚠ PROJECTS BEFORE EMPLOYERS — a project hangs off an employer.
  */
  await prisma.$transaction([
    prisma.project.deleteMany({ where: { provider_profile_id: profileId } }),
    prisma.employer.deleteMany({ where: { provider_profile_id: profileId } }),
    prisma.education.deleteMany({ where: { provider_profile_id: profileId } }),
    prisma.language.deleteMany({ where: { provider_profile_id: profileId } }),
    prisma.certification.deleteMany({ where: { provider_profile_id: profileId } }),
    prisma.providerSkill.deleteMany({ where: { provider_profile_id: profileId } }),
    prisma.profileImport.deleteMany({ where: { provider_profile_id: profileId } }),
  ]);

  console.log(`\n✓ Cleared. Re-run the import from /join/provider — the "read it again"`);
  console.log(`  panel is visible again now that there are no employers.\n`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
