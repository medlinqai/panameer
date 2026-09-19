import { prisma } from "@/lib/prisma";
import { applyParsedResume } from "@/lib/resume/import";
import { computeRerunDiff } from "@/lib/resume/rerun-diff";
import { SELF_ADDED_WEIGHT } from "@/lib/provider-rollup";
import type { ParsedResume } from "@/lib/resume/parse";

/**
 * ── ⚠⚠⚠ `check:rerun` — THE COUNTER-CASE IS THE DESTRUCTION CASE ───────────
 *
 * `P2-J14-E561` WS-C. Modelled on `check:role-prune`, which does exactly this
 * for `E517`.
 *
 * ⚠⚠ `E517` DESTROYED NINE `provider_skill` ROWS WITH NO UNDO, and deleted rows
 * are unrecoverable — a re-import is the only repair. ⚠ So the case this gate
 * exists to catch is not "does the re-run work", it is **"has the re-run started
 * removing things."**
 *
 * THE COUNTER-CASE: a profile holding a HAND-ADDED skill, re-run against a
 * résumé that does not mention it. ⚠⚠⚠ ZERO ROWS MAY BE DELETED. If a future
 * change makes the re-run destructive, this fails loudly and by construction.
 *
 * ── ⚠⚠ AND IT GATES THE `E585`-SHAPED DUPLICATION ──────────────────────────
 *
 * ⚠ `rerun-diff.ts` reproduces the writer's skill match — the same `certTerms`,
 * dedup, catalog query, `matchSkills`, and `have`/`toAdd` split. ⚠⚠ THAT IS TWO
 * COMPUTATIONS OF ONE CONCEPT (`E585`), AND IT IS ACCEPTABLE ONLY BECAUSE THIS
 * GATE ASSERTS THEY AGREE. ⚠⚠⚠ A diff that disagrees with the writer shows a
 * provider one thing and does another. Do not delete this assertion.
 *
 * ⚠ NO AI, NO NETWORK: the parsed payload is constructed, exactly as
 * `check:role-prune` constructs its own.
 * ⚠ NOTHING IS SEEDED (`E564`). The probe creates a throwaway `.test` account,
 * asserts against it and deletes it in `finally` — the same shape the existing
 * gate uses, and no row survives the run.
 */
let fail = 0;
const assert = (c: boolean, label: string) => {
  console.log(`${c ? "ok   " : "FAIL "} ${label}`);
  if (!c) fail++;
};

const blank = (): ParsedResume =>
  ({
    fullName: null, headline: null, email: null, phone: null, location: null,
    summary: null, overview: null, skills: [], experiences: [], education: [],
    projects: [], certifications: [], languages: [], links: [],
  }) as unknown as ParsedResume;

async function main() {
  /* Two disjoint sets: what the résumé mentions, and what the provider added. */
  const mentioned = ["Procurement", "Inventory", "Purchasing"];
  const handAdded = ["Payroll", "Core HR"];

  const rows = await prisma.skill.findMany({
    where: { status: "ACTIVE", name: { in: [...mentioned, ...handAdded] } },
    select: { id: true, name: true },
  });
  const byName = new Map(rows.map((r) => [r.name, r.id]));
  const handIds = handAdded.map((n) => byName.get(n)).filter(Boolean) as string[];
  if (handIds.length === 0 || rows.length < 3) {
    console.log("skip  — catalog does not carry enough of the probe skills");
    return;
  }

  const company = await prisma.company.findFirst({ select: { id: true } });
  const user = await prisma.user.create({
    data: {
      email: `e561.rerun.${Date.now()}@example.test`,
      email_verified: new Date(),
      tos_accepted_at: new Date(),
      first_name: "E561",
      last_name: "RerunProbe",
    },
    select: { id: true },
  });
  const person = await prisma.person.create({
    data: {
      company_id: company!.id, user_id: user.id,
      first_name: "E561", last_name: "RerunProbe", is_service_provider: true,
    },
    select: { id: true },
  });
  const profile = await prisma.providerProfile.create({
    data: { person_id: person.id, headline: "E561 rerun probe" },
    select: { id: true },
  });

  try {
    /*
      ⚠⚠ THE HAND-ADDED ROWS. `SELF_ADDED` is what the skills STEP writes when a
      provider picks a skill themselves — this is a curated row, not an imported
      one, and a re-run must never touch it.
    */
    await prisma.providerSkill.createMany({
      data: handIds.map((skill_id) => ({
        provider_profile_id: profile.id,
        skill_id,
        source: "SELF_ADDED" as const,
        weight: SELF_ADDED_WEIGHT,
      })),
      skipDuplicates: true,
    });
    const before = await prisma.providerSkill.findMany({
      where: { provider_profile_id: profile.id },
      select: { skill_id: true },
    });
    assert(
      before.length === handIds.length,
      `the probe holds ${before.length} hand-added skills the résumé will not mention`
    );

    /* ⚠ A résumé that mentions NONE of them. */
    const parsed = blank();
    parsed.skills = mentioned;

    /* ── 1 · THE DIFF PROPOSES AND WRITES NOTHING ────────────────────────── */
    const diff = await computeRerunDiff(profile.id, parsed);
    const afterDiff = await prisma.providerSkill.count({
      where: { provider_profile_id: profile.id },
    });
    assert(
      afterDiff === before.length,
      `⚠⚠ THE DIFF WRITES NOTHING — ${before.length} before, ${afterDiff} after`
    );

    /*
      ── 2 · ⚠⚠⚠ THE COUNTER-CASE. THE HAND-ADDED ROWS SURVIVE ─────────────
      This is the assertion the gate exists for. If a re-run ever starts
      removing what it did not add, it fails here.
    */
    assert(
      diff.skills.noLongerMentioned.length === handIds.length,
      `the hand-added skills land in "no longer mentioned" (${diff.skills.noLongerMentioned.length} of ${handIds.length})`
    );

    /* ⚠ Applied EXACTLY as the apply route applies it: `skills: []` handed to the
       writer, the ticked ids written directly. Same shape, same order. */
    await applyParsedResume(profile.id, { ...parsed, skills: [] }, "RESUME");
    const tickedIds = diff.skills.added.map((s) => s.id);
    if (tickedIds.length > 0) {
      await prisma.providerSkill.createMany({
        data: tickedIds.map((skill_id) => ({
          provider_profile_id: profile.id,
          skill_id,
          source: "SELF_ADDED" as const,
          weight: SELF_ADDED_WEIGHT,
        })),
        skipDuplicates: true,
      });
    }

    const after = await prisma.providerSkill.findMany({
      where: { provider_profile_id: profile.id },
      select: { skill_id: true },
    });
    const afterIds = new Set(after.map((r) => r.skill_id));
    const survived = handIds.filter((id) => afterIds.has(id));
    assert(
      survived.length === handIds.length,
      `⚠⚠⚠ ZERO ROWS DELETED — all ${handIds.length} hand-added skills survive a re-run that never mentions them`
    );
    assert(
      after.length >= before.length,
      `the row count never falls — ${before.length} before, ${after.length} after`
    );

    /*
      ── 3 · ⚠⚠⚠ THE DIFF AND THE WRITER AGREE — TWO INDEPENDENT COMPUTATIONS

      ⚠ THE ONLY THING THAT MAKES `rerun-diff.ts`'s DUPLICATION ACCEPTABLE
      (`E585`). ⚠⚠ IT MUST NOT BE TAUTOLOGICAL: comparing the diff against rows
      written FROM the diff proves nothing, because both sides came from the same
      list. ⚠⚠⚠ SO A SECOND, VIRGIN PROFILE IS GIVEN THE **FULL** PARSE AND THE
      WRITER'S OWN MATCH IS COMPARED AGAINST WHAT THE DIFF PROPOSED FOR IT.
    */
    const twinPerson = await prisma.person.create({
      data: {
        company_id: company!.id,
        first_name: "E561", last_name: "RerunTwin", is_service_provider: true,
      },
      select: { id: true },
    });
    const twin = await prisma.providerProfile.create({
      data: { person_id: twinPerson.id, headline: "E561 rerun twin" },
      select: { id: true },
    });
    try {
      /* The diff's proposal for a profile that holds nothing. */
      const twinDiff = await computeRerunDiff(twin.id, parsed);
      const proposed = new Set(twinDiff.skills.added.map((x) => x.id));

      /* ⚠ The WRITER's own answer, from the SAME parse, through its own match —
         `skills` NOT emptied here, because this is the comparison. */
      await applyParsedResume(twin.id, parsed, "RESUME");
      const written = new Set(
        (
          await prisma.providerSkill.findMany({
            where: { provider_profile_id: twin.id },
            select: { skill_id: true },
          })
        ).map((r) => r.skill_id)
      );

      const missing = [...proposed].filter((id) => !written.has(id));
      const extra = [...written].filter((id) => !proposed.has(id));
      assert(
        missing.length === 0,
        `⚠⚠ EVERYTHING THE DIFF PROMISED, THE WRITER WRITES — ${proposed.size} proposed, ${missing.length} missing`
      );
      assert(
        extra.length === 0,
        `⚠⚠⚠ THE WRITER WRITES NOTHING THE DIFF DID NOT PROMISE — ${written.size} written, ${extra.length} unannounced`
      );
    } finally {
      await prisma.providerSkill.deleteMany({ where: { provider_profile_id: twin.id } });
      await prisma.providerProfileSpecialization.deleteMany({ where: { provider_profile_id: twin.id } });
      await prisma.providerProfileRole.deleteMany({ where: { provider_profile_id: twin.id } });
      await prisma.certification.deleteMany({ where: { provider_profile_id: twin.id } });
      await prisma.employer.deleteMany({ where: { provider_profile_id: twin.id } });
      await prisma.providerProfile.delete({ where: { id: twin.id } });
      await prisma.person.delete({ where: { id: twinPerson.id } });
    }

    /*
      ── 4 · ⚠ "NO LONGER MENTIONED" IS NEVER A REMOVAL INSTRUCTION ────────
      It is information. Asserting it is disjoint from what was written is what
      stops a future change quietly wiring it to a delete.
    */
    const noLonger = new Set(diff.skills.noLongerMentioned.map((s) => s.id));
    assert(
      tickedIds.every((id) => !noLonger.has(id)),
      `"no longer mentioned" and "added" never overlap`
    );

    /*
      ── 5 · ⚠⚠⚠ THE RE-RUN PATH HOLDS NO DELETE. STATIC, AND IT IS THE ONE
      ASSERTION THAT CANNOT BE SATISFIED BY LUCK ────────────────────────────

      ⚠ The behavioural counter-case above proves nothing was deleted ON THIS
      RUN, with these rows. ⚠⚠ THIS PROVES THERE IS NO CODE TO DELETE WITH —
      `E517` destroyed nine rows with no undo, so "it did not happen to delete
      anything today" is not the guarantee worth holding.
      ⚠ COMMENTS ARE STRIPPED FIRST (rule 12): this file and the route both quote
      superseded code under `E164`, and a quote is not live code.
    */
    const fs = await import("node:fs");
    const strip = (x: string) =>
      x.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
    for (const f of [
      "src/app/api/onboarding/provider/resume-ai/apply/route.ts",
      "src/lib/resume/rerun-diff.ts",
    ]) {
      const body = strip(fs.readFileSync(f, "utf8"));
      assert(
        !/\.deleteMany\(|\.delete\(/.test(body),
        `⚠⚠⚠ NO DELETE IN ${f.split("/").pop()} — a re-run ADDS, and that is the whole contract`
      );
    }

    /* ── 6 · ⚠ THE WRITER IS NOT EDITED BY THIS BRIEF ────────────────────── */
    const src = fs.readFileSync("src/lib/resume/import.ts", "utf8");
    assert(
      /export async function applyParsedResume\(\s*profileId: string,\s*parsed: ParsedResume,\s*source: "RESUME",\s*\)/.test(src),
      `⚠⚠ \`applyParsedResume\`'s SIGNATURE IS UNCHANGED — the re-run filters its input, it does not edit the writer`
    );
  } finally {
    await prisma.providerSkill.deleteMany({ where: { provider_profile_id: profile.id } });
    await prisma.providerProfileSpecialization.deleteMany({ where: { provider_profile_id: profile.id } });
    await prisma.providerProfileRole.deleteMany({ where: { provider_profile_id: profile.id } });
    await prisma.certification.deleteMany({ where: { provider_profile_id: profile.id } });
    await prisma.employer.deleteMany({ where: { provider_profile_id: profile.id } });
    await prisma.providerProfile.delete({ where: { id: profile.id } });
    await prisma.person.delete({ where: { id: person.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }

  console.log(`\ncheck:rerun — ${fail === 0 ? "all passed" : `${fail} FAILED`}`);
  if (fail > 0) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
