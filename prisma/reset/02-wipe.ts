import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { SURVIVORS, EXPLICIT_DELETES, MANIFEST_PATH } from "./survivors-spec";

/**
 * ── ⚠⚠⚠ THE RESET (`P0-E595` WS-B). AUTHORISED BY SCOTT 2026-09-20. ───────
 *
 * ⚠⚠ TWO STEPS, AND THE MANIFEST IS THE GATE BETWEEN THEM. A plan run computes
 * the delete set and WRITES the manifest, deleting nothing. A `--write` run
 * REFUSES without that manifest, re-derives the set, and refuses again if the
 * two disagree. ⚠ So the thing that is deleted is the thing somebody read.
 *
 * ── ⚠⚠⚠ WHAT IT MUST NOT TOUCH ───────────────────────────────────────────
 *
 * ⚠ **`Lesson` AND `LearningPath` ARE THE LEARN CATALOGUE.** Scott: do not
 * touch them. ⚠⚠ THEY ARE SAFE BY SCHEMA, NOT BY CARE: both `expert_person_id`
 * relations are `onDelete: SetNull`, so deleting a Person nulls the pointer and
 * never removes a lesson. ⚠ Verified before and after regardless — a schema
 * reading is a claim, and the counts are the evidence.
 * ⚠ The five survivors hold every non-null expert pointer between them, so no
 * lesson should lose its expert either. **Asserted, not assumed.**
 *
 * ── ⚠ WHY BOTH `Person` AND `User` ARE DELETED EXPLICITLY ────────────────
 *
 * ⚠⚠ `Person.user` IS `onDelete: SetNull`. Deleting a User does NOT delete its
 * Person — it orphans it with a null `user_id`. Deleting only one side would
 * leave half the record behind, still holding a name and an address.
 */

type Manifest = {
  plannedAt: string;
  survivorPersonIds: string[];
  survivorUserIds: string[];
  deletePersonIds: string[];
  deleteUserIds: string[];
  before: Record<string, number>;
  learnBaseline: { lessons: number; paths: number; lessonsWithExpert: number; pathsWithExpert: number };
};

const MODELS = [
  "user", "person", "providerProfile", "connection", "colleagueInvite",
  "employer", "project", "providerSkill", "certification", "package",
  "learnEnrollment", "sentEmail", "profileImport", "profileView",
] as const;

async function counts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const m of MODELS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    out[m] = await (prisma as any)[m].count();
  }
  /* ⚠ THE CATALOGUE IS COUNTED BUT NEVER DELETED — it is here so the report can
     PROVE it did not move. */
  out.lesson = await prisma.lesson.count();
  out.learningPath = await prisma.learningPath.count();
  return out;
}

async function learnBaseline() {
  return {
    lessons: await prisma.lesson.count(),
    paths: await prisma.learningPath.count(),
    lessonsWithExpert: await prisma.lesson.count({ where: { expert_person_id: { not: null } } }),
    pathsWithExpert: await prisma.learningPath.count({ where: { expert_person_id: { not: null } } }),
  };
}

async function resolve() {
  const emails = SURVIVORS.map((s) => s.email);
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, person: { select: { id: true } } },
  });
  const missing = emails.filter((e) => !users.some((u) => (u.email ?? "").toLowerCase() === e));
  /* ⚠⚠ A SURVIVOR THAT DOES NOT RESOLVE IS A STOP. The alternative is deleting
     somebody this list was written to protect. */
  if (missing.length) throw new Error(`SURVIVORS NOT FOUND — refusing: ${missing.join(", ")}`);

  const survivorUserIds = users.map((u) => u.id);
  const survivorPersonIds = users.map((u) => u.person?.id).filter((v): v is string => !!v);

  const deletePersons = await prisma.person.findMany({
    where: { id: { notIn: survivorPersonIds } },
    select: { id: true },
  });
  const deleteUsers = await prisma.user.findMany({
    where: { id: { notIn: survivorUserIds } },
    select: { id: true },
  });
  return {
    survivorUserIds,
    survivorPersonIds,
    deletePersonIds: deletePersons.map((p) => p.id),
    deleteUserIds: deleteUsers.map((u) => u.id),
  };
}

async function main() {
  const write = process.argv.includes("--write");
  const r = await resolve();

  /* ⚠ The two Scott named are proved to be IN the delete set rather than
     assumed — they are the reason this run exists as much as the wipe is. */
  const named = await prisma.user.findMany({
    where: { email: { in: EXPLICIT_DELETES } },
    select: { id: true, email: true, person: { select: { id: true } } },
  });
  for (const n of named) {
    const inUsers = r.deleteUserIds.includes(n.id);
    const inPersons = !n.person || r.deletePersonIds.includes(n.person.id);
    console.log(`  named delete  ${(n.email ?? "").padEnd(30)} user:${inUsers ? "✓" : "⚠ NOT IN SET"}  person:${inPersons ? "✓" : "⚠ NOT IN SET"}`);
    if (!inUsers || !inPersons) throw new Error(`${n.email} is not in the delete set — REFUSING`);
  }

  const before = await counts();
  const learn = await learnBaseline();

  console.log(`\n${write ? "WIPING" : "PLAN"} — survivors ${r.survivorUserIds.length} users / ${r.survivorPersonIds.length} persons`);
  console.log(`         delete  ${r.deleteUserIds.length} users / ${r.deletePersonIds.length} persons\n`);
  for (const [m, c] of Object.entries(before)) console.log(`  before  ${m.padEnd(18)} ${c}`);
  console.log(`\n  LEARN BASELINE — lessons ${learn.lessons} (expert set on ${learn.lessonsWithExpert}), paths ${learn.paths} (expert set on ${learn.pathsWithExpert})`);

  if (!write) {
    const manifest: Manifest = { plannedAt: new Date().toISOString(), ...r, before, learnBaseline: learn };
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`\n⚠ PLAN ONLY — nothing deleted. Manifest written to ${MANIFEST_PATH}.`);
    console.log("⚠ Re-run with --write to commit. The write REFUSES without this file.");
    return;
  }

  /* ── ⚠⚠⚠ THE MANIFEST IS REQUIRED, AND IT IS RE-VERIFIED ───────────────── */
  if (!existsSync(MANIFEST_PATH))
    throw new Error(`NO MANIFEST at ${MANIFEST_PATH} — REFUSING to delete. Run the plan first.`);
  const m: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const same = (a: string[], b: string[]) =>
    a.length === b.length && [...a].sort().join() === [...b].sort().join();
  if (!same(m.deletePersonIds, r.deletePersonIds) || !same(m.deleteUserIds, r.deleteUserIds))
    throw new Error("THE DATABASE MOVED SINCE THE PLAN — re-run the plan and read it again. REFUSING.");
  if (!same(m.survivorPersonIds, r.survivorPersonIds))
    throw new Error("THE SURVIVOR SET MOVED SINCE THE PLAN. REFUSING.");
  console.log("  manifest verified against a fresh derivation ✓\n");

  /*
    ⚠⚠ PERSON FIRST, THEN USER. Deleting the Person cascades its profile,
    skills, employers, projects and the rest (106 Cascade relations); deleting
    the User then clears the auth row and its connections.
    ⚠ Chunked: a single `notIn` of 200 ids is fine, but the cascade fan-out is
    large and the pooler has a statement timeout.
  */
  const CHUNK = 25;
  let delP = 0;
  for (let i = 0; i < r.deletePersonIds.length; i += CHUNK) {
    const ids = r.deletePersonIds.slice(i, i + CHUNK);
    const res = await prisma.person.deleteMany({ where: { id: { in: ids } } });
    delP += res.count;
    process.stdout.write(`\r  persons deleted: ${delP}/${r.deletePersonIds.length}`);
  }
  console.log("");
  let delU = 0;
  for (let i = 0; i < r.deleteUserIds.length; i += CHUNK) {
    const ids = r.deleteUserIds.slice(i, i + CHUNK);
    const res = await prisma.user.deleteMany({ where: { id: { in: ids } } });
    delU += res.count;
    process.stdout.write(`\r  users deleted:   ${delU}/${r.deleteUserIds.length}`);
  }
  console.log("\n");

  const after = await counts();
  const learnAfter = await learnBaseline();
  for (const [k, v] of Object.entries(after))
    console.log(`  after   ${k.padEnd(18)} ${v}   (was ${before[k]})`);

  console.log("\n════ ⚠⚠⚠ THE CATALOGUE MUST BE UNTOUCHED ════");
  const ok =
    learnAfter.lessons === learn.lessons &&
    learnAfter.paths === learn.paths &&
    learnAfter.lessonsWithExpert === learn.lessonsWithExpert &&
    learnAfter.pathsWithExpert === learn.pathsWithExpert;
  console.log(`  lessons ${learn.lessons} -> ${learnAfter.lessons}   with expert ${learn.lessonsWithExpert} -> ${learnAfter.lessonsWithExpert}`);
  console.log(`  paths   ${learn.paths} -> ${learnAfter.paths}   with expert ${learn.pathsWithExpert} -> ${learnAfter.pathsWithExpert}`);
  console.log(ok ? "  ✅ UNCHANGED" : "  ⚠⚠⚠ THE CATALOGUE MOVED — INVESTIGATE BEFORE ANYTHING ELSE");
  if (!ok) process.exitCode = 1;
}

main()
  .catch((e) => { console.error("\n" + String(e)); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
