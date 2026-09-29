/**
 * `check:certification-tests` — a skill resolves to a PUBLISHED certification test or to
 * nothing, and a DRAFT is nothing (`P2-A4-E701`, rulings 93d–93g). ⚠ Run:
 * `npm run check:certification-tests`.
 *
 * ── ⚠⚠ WHAT IT ASSERTS (11) ─────────────────────────────────────────────────
 *
 *  1. ⚠⚠⚠ **A `DRAFT` ASSESSMENT RESOLVES AS NO CERTIFICATION.** The schema's own rule:
 *     *"a generated test nobody has read must not award a certificate."* `93e`:
 *     generation is automatic, **publishing is the human act**.
 *  2. ⚠⚠ **PUBLISHING IT FLIPS THE ANSWER** — proved by doing it and watching the
 *     resolver change, which is the acceptance criterion's own words.
 *  3. ⚠ The PATH must be published too — a published test on an unpublished path is a
 *     door onto a wall (`E579`).
 *  4. ⚠⚠ **ONE DEFINITION, ONE PLACE (`E585`)** — nothing outside this module walks
 *     `learningPathSkill` to answer the same question.
 *  5. ⚠⚠⚠ **THE PASS IS THE ATTEMPT, NOT THE `Certification` ROW** — measured
 *     2026-09-29, all 12 certifications are `SELF_REPORTED` with no `learning_path_id`,
 *     and a self-uploaded PDF is not a pass.
 *  6. ⚠ Three button states, never two booleans — a union cannot express the impossible
 *     fourth combination.
 *
 * ── ⚠⚠ SCOPE (91), STATED ──────────────────────────────────────────────────
 *
 * ⚠ STATIC: the schema and `src/lib/certification-tests.ts`, comments stripped (rule 12).
 * ⚠⚠ LIVE: **it builds its own path, its own assessment and its own join row**, proves
 * the rule in both directions, and **deletes exactly what it created, by id.**
 * ⚠⚠⚠ **IT DOES NOT TOUCH THE SIX REAL `DRAFT` ASSESSMENTS. Publishing one to prove a
 * point would leave a model-written test live if this gate crashed halfway** — and an
 * unreviewed test that can award a certificate is the exact harm `93e` names.
 * ⚠ **NO UI IS ASSERTED: WS-C (the button) IS NOT BUILT.** Said here, not implied.
 *
 * ── ⚠ SUBJECT EXISTS (92) · DIRECTION (90) ─────────────────────────────────
 *
 * ⚠ Inputs asserted before anything is measured; the live half asserts its fixtures were
 * created, so *"0 failures"* cannot mean *"nothing was tested"* (`E586`).
 * ⚠⚠ Every rule is proved by breaking it, and `E607` — the assertion under test must be
 * the thing that catches it.
 */
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};
const strip = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^([ \t]*)\/\/.*$/gm, (_m, i) => i);

/* ═══ 0 · INPUTS FIRST (92) ════════════════════════════════════════════════ */

const LIB = join("src", "lib", "certification-tests.ts");
const SCHEMA = join("prisma", "schema.prisma");
check("0 — the resolver exists where this guard expects it", existsSync(LIB), LIB);
check("0 — and is not empty", existsSync(LIB) && statSync(LIB).size > 0);
const lib = existsSync(LIB) ? strip(readFileSync(LIB, "utf8")) : "";
const schema = existsSync(SCHEMA) ? strip(readFileSync(SCHEMA, "utf8")) : "";
check("0 — stripping comments left live code", lib.trim().length > 300, `${lib.trim().length} chars`);

const joinModel = (/model LearningPathSkill \{[\s\S]*?\n\}/.exec(schema) ?? [""])[0];

/* ═══ 1 · THE JOIN'S SHAPE ═════════════════════════════════════════════════ */

check("1 — `LearningPathSkill` is in the schema", joinModel.length > 0);
check(
  "1 — ⚠⚠ it is a JOIN, unique on the pair — the same claim cannot be made twice",
  /@@unique\(\[learning_path_id, skill_id\]\)/.test(joinModel)
);
check(
  "1 — ⚠ and indexed from the skill side, which is the direction the button asks in",
  /@@index\(\[skill_id\]\)/.test(joinModel)
);
check(
  "1 — both sides cascade, so a deleted path or skill leaves no orphan claim",
  (joinModel.match(/onDelete: Cascade/g) ?? []).length === 2
);
/* ⚠⚠ NO VERSION FIELD. Whether a certification carries a release stamp (24A, 25B) is
   STILL SCOTT'S and unanswered — so the absence is asserted, not left to drift. */
check(
  "1 — ⚠⚠ ABSENCE: no release/version stamp was invented (still Scott's, unanswered)",
  !/release|version|\b24A\b|\b25B\b/i.test(joinModel),
  "the brief says do not invent a version field — flag it instead"
);

/* ═══ 2 · THE RESOLVER'S SHAPE, AND ONE DEFINITION ═════════════════════════ */

for (const fn of ["certificationTestForSkill", "hasPassed", "testButtonState"]) {
  check(`2 — \`${fn}\` exists to be asserted on`, new RegExp(`export (?:async )?function ${fn}\\b`).test(lib));
}
check(
  "2 — ⚠⚠⚠ the resolver requires the ASSESSMENT to be PUBLISHED",
  /assessment:\s*\{\s*status:\s*"PUBLISHED"\s*\}/.test(lib),
  "a DRAFT test nobody has read must not award a certificate"
);
check(
  "2 — ⚠ and the PATH to be PUBLISHED too",
  /status:\s*"PUBLISHED",[\s\S]{0,120}assessment:/.test(lib),
  "a published test on an unpublished path is a door onto a wall"
);
check(
  "2 — ⚠⚠ the pass is read from the ATTEMPT, not from a Certification row",
  /certificationAttempt\.findFirst/.test(lib) && !/certification\.(findFirst|findMany)/.test(lib),
  "all 12 Certification rows are SELF_REPORTED — a PDF is not a pass"
);
check(
  "2 — ⚠ the button has THREE named states, as a union not two booleans",
  /"NO_TEST"/.test(lib) && /"CAN_REQUEST"/.test(lib) && /"ALREADY_PASSED"/.test(lib)
);
/*
  ⚠⚠⚠ ONE DEFINITION, ONE PLACE (`E585`). Nothing outside this module may walk the join
  to answer the same question — that is how two surfaces come to disagree in public.
*/
const walk = (d: string, out: string[] = []): string[] => {
  for (const e of readdirSync(d)) {
    if (e === "node_modules" || e.startsWith(".")) continue;
    const f = join(d, e);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (/\.tsx?$/.test(e)) out.push(relative(".", f));
  }
  return out;
};
const others = walk("src").filter((f) => f !== LIB && /(?:prisma|tx)\.learningPathSkill\./.test(strip(readFileSync(f, "utf8"))));
check(
  "2 — ⚠⚠ ABSENCE: only this module queries `learningPathSkill` (one definition, E585)",
  others.length === 0,
  others.join(", ")
);

/* ═══ 3 · LIVE — THE DRAFT RULE, PROVED BY PUBLISHING AND WATCHING IT FLIP ══ */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

async function live() {
  const { certificationTestForSkill } = await import("@/lib/certification-tests");
  const before = {
    paths: await prisma.learningPath.count(),
    assessments: await prisma.certificationTest.count(),
    joins: await prisma.learningPathSkill.count(),
    certs: await prisma.certification.count(),
  };
  const skill = await prisma.skill.findFirst({ select: { id: true } });
  check("3 — a skill exists to resolve against", skill != null);
  if (!skill) return;

  const tag = Math.random().toString(36).slice(2, 10);
  let pathId: string | null = null;
  let assessmentId: string | null = null;
  let joinId: string | null = null;
  try {
    const path = await prisma.learningPath.create({
      data: {
        title: `GATE ${tag}`,
        slug: `gate-cert-${tag}`,
        audience: "END_USER",
        status: "PUBLISHED",
      },
      select: { id: true },
    });
    pathId = path.id;
    /* ⚠⚠ THE ASSESSMENT STARTS `DRAFT` — that is the state the rule is about. */
    const a = await prisma.certificationTest.create({
      data: {
        learning_path_id: path.id,
        status: "DRAFT",
        pass_threshold: 70,
        questions: [],
      },
      select: { id: true },
    });
    assessmentId = a.id;
    const j = await prisma.learningPathSkill.create({
      data: { learning_path_id: path.id, skill_id: skill.id },
      select: { id: true },
    });
    joinId = j.id;
    check("3 — the fixture was created (path + DRAFT assessment + join)", true);

    /* ⚠⚠⚠ DIRECTION ONE: A DRAFT RESOLVES TO NOTHING. */
    const whileDraft = await certificationTestForSkill(skill.id);
    check(
      "3 — ⚠⚠⚠ a DRAFT assessment resolves as NO certification",
      whileDraft === null || whileDraft.learningPathId !== path.id,
      whileDraft ? `resolved to ${whileDraft.learningPathTitle}` : "null"
    );

    /*
      ── ⚠⚠⚠ DIRECTION TWO: PUBLISH IT AND WATCH THE ANSWER FLIP ────────────────

      ⚠⚠ **A REVIEWER IS WRITTEN WITH THE PUBLISH, AND THAT IS NOT DECORATION IN A
      FIXTURE.** `check:learn-review` asserts *"every write of status PUBLISHED also
      writes `reviewed_by` AND `reviewed_at`"* — and it **caught this gate** when
      `P2-A4-E702` renamed the model and the whole family was re-run.
      ⚠⚠⚠ **THE RED WAS REAL AND IT WAS MINE: `P2-A4-E701` ADDED THIS FIXTURE AND NEVER
      RAN `check:learn-review`, WHICH IS THE GATE ASSERTING THE RULE IT BROKE (98e).**
      ⚠ **AND A FIXTURE THAT MODELS THE WRONG SHAPE TEACHES THE WRONG SHAPE** — the rule
      exists because a test published with no reviewer is `93e`'s harm exactly: *"a
      generated test nobody has read must not award a certificate."*
      ⚠ The reviewer is any real Person; this fixture is deleted moments later, but it
      publishes the way the product must.
    */
    const reviewer = await prisma.person.findFirst({ select: { id: true } });
    check("3 — a person exists to stand as reviewer", reviewer != null);
    await prisma.certificationTest.update({
      where: { id: a.id },
      data: { status: "PUBLISHED", reviewed_by: reviewer?.id ?? null, reviewed_at: new Date() },
    });
    const whenPublished = await certificationTestForSkill(skill.id);
    check(
      "3 — ⚠⚠⚠ publishing it flips the answer — the resolver now finds it, by name",
      whenPublished != null,
      whenPublished ? `found ${whenPublished.learningPathTitle}` : "still null"
    );

    /* ⚠ AND THE PATH'S OWN STATUS MATTERS TOO. */
    await prisma.learningPath.update({ where: { id: path.id }, data: { status: "DRAFT" } });
    const pathDrafted = await certificationTestForSkill(skill.id);
    check(
      "3 — ⚠ unpublishing the PATH hides it again, even with a PUBLISHED test",
      pathDrafted == null || pathDrafted.learningPathId !== path.id
    );
  } finally {
    /* ⚠⚠ DELETE EXACTLY WHAT WAS CREATED, BY ID, INNERMOST FIRST. */
    if (joinId) await prisma.learningPathSkill.deleteMany({ where: { id: joinId } });
    if (assessmentId) await prisma.certificationTest.deleteMany({ where: { id: assessmentId } });
    if (pathId) await prisma.learningPath.deleteMany({ where: { id: pathId } });
  }

  const after = {
    paths: await prisma.learningPath.count(),
    assessments: await prisma.certificationTest.count(),
    joins: await prisma.learningPathSkill.count(),
    certs: await prisma.certification.count(),
  };
  check(
    "3 — ⚠⚠ the gate left nothing behind",
    after.paths === before.paths && after.assessments === before.assessments &&
      after.joins === before.joins && after.certs === before.certs,
    `paths ${before.paths}→${after.paths}, assessments ${before.assessments}→${after.assessments}, joins ${before.joins}→${after.joins}, certs ${before.certs}→${after.certs}`
  );
  /* ⚠⚠⚠ AND THE SIX REAL DRAFTS ARE STILL DRAFT. This gate must never leave a
     model-written test publishable. */
  const drafts = await prisma.certificationTest.count({ where: { status: "DRAFT" } });
  check("3 — ⚠⚠⚠ the real DRAFT assessments are untouched — still 6", drafts === 6, `${drafts} DRAFT`);
  check(
    "3 — ⚠ and the join is still EMPTY, because nothing was seeded",
    after.joins === 0,
    `${after.joins} rows — an empty join is the honest "no certification exists yet"`
  );
}

live()
  .catch((e) => failures.push(`3 — the live half threw instead of asserting: ${(e as Error).message}`))
  .finally(async () => {
    await prisma.$disconnect();
    if (failures.length) {
      console.error(`\ncheck:certification-tests — ${failures.length} FAILED, ${pass} passed, 0 not run\n`);
      for (const f of failures) console.error(`  ✗ ${f}`);
      process.exit(1);
    }
    console.log(`check:certification-tests — ${pass}/${pass} passed, 0 failed, 0 not run`);
    console.log("  ⚠ NOTE: WS-C (the button) is NOT built, so no UI is asserted.");
  });
