import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { certificationTestForSkill } from "@/lib/certification-tests";
import { userIdForPerson, asPersonId, LearnIdentityError } from "@/lib/learn-identity";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const strip = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^([ \t]*)\/\/.*$/gm, (_m, i) => i);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

/* ═══ 0 · INPUTS FIRST ═════════════════════════════════════════════════════ */

const IDENT = join("src", "lib", "learn-identity.ts");
const TESTS = join("src", "lib", "certification-tests.ts");
check("0 — the identity module exists", existsSync(IDENT), IDENT);
check("0 — the certification library exists", existsSync(TESTS), TESTS);
const ident = existsSync(IDENT) ? strip(readFileSync(IDENT, "utf8")) : "";
const tests = existsSync(TESTS) ? strip(readFileSync(TESTS, "utf8")) : "";
check("0 — stripping comments left live code behind", ident.trim().length > 400 && tests.trim().length > 400);

/* ═══ 1 · THE BRANDS ARE ON THE SIGNATURES ═════════════════════════════════ */

check(
  "1 — ⚠⚠ `UserId` and `PersonId` are distinct BRANDED types, not aliases",
  /type UserId = string & \{ readonly __brand: "UserId" \}/.test(ident) &&
    /type PersonId = string & \{ readonly __brand: "PersonId" \}/.test(ident),
  "a plain `type UserId = string` is assignable from anything and holds nothing"
);
check(
  "1 — ⚠⚠⚠ `hasPassed` takes a `UserId`, so a personId cannot reach it",
  /export async function hasPassed\(\s*userId: UserId/.test(tests),
  "this is the parameter ruling 102c names"
);
check(
  "1 — ⚠⚠⚠ `testButtonState` takes a `UserId` too",
  /userId: UserId,\s*skillId: string/.test(tests)
);
check(
  "1 — ⚠ the pass query still keys on `user_id`, which is what the brand describes",
  /where: \{ user_id: userId/.test(tests),
  "a brand that describes the wrong column is a confident lie"
);

/* ═══ 2 · ONE CROSSING, AND IT REFUSES ════════════════════════════════════ */

check(
  "2 — ⚠⚠⚠ the resolver exists and is the one named crossing",
  /export async function userIdForPerson\(personId: PersonId\): Promise<UserId>/.test(ident),
  "E585 — one place resolves Person -> User and asserts the pairing there"
);
check(
  "2 — ⚠⚠⚠ it cannot return null — the signature forbids it",
  !/Promise<UserId \| null>/.test(ident) && !/return null/.test(ident),
  "90b — answering `no` about a provider who simply has no account is a false statement"
);
check(
  "2 — ⚠⚠ and it throws on both absent shapes: no person, and a person with no account",
  (ident.match(/throw new LearnIdentityError/g) ?? []).length >= 2
);
const CROSSERS = walk("src").filter((f) => {
  if (f === IDENT) return false;
  const live = strip(readFileSync(f, "utf8"));
  if (!/certificationAttempt|certificationTest|hasPassed|testButtonState/.test(live)) {
    return false;
  }
  for (const m of live.matchAll(/prisma\s*\.\s*person\s*\.\s*(?:findUnique|findFirst|findMany)\s*\(/g)) {
    let depth = 1;
    let i = m.index! + m[0].length;
    while (i < live.length && depth > 0) {
      if (live[i] === "(") depth++;
      else if (live[i] === ")") depth--;
      i++;
    }
    const body = live.slice(m.index!, i);
    if (/select[\s\S]*?user_id:\s*true/.test(body)) return true;
  }
  return false;
});
check(
  "2 — ⚠⚠⚠ ABSENCE: no second place resolves a person to an account for a Learn query",
  CROSSERS.length === 0,
  CROSSERS.map((f) => f.replace("src/", "")).join(", ") + " — route it through userIdForPerson"
);

/* ═══ 3 · THE `DRAFT` RULE, IN THE SOURCE ═════════════════════════════════ */

check(
  "3 — ⚠⚠⚠ the resolver requires the TEST published AND the PATH published",
  /status: "PUBLISHED",\s*assessment: \{ status: "PUBLISHED" \}/.test(tests),
  "93e — generation is automatic, publishing is the human act; a draft awards nothing"
);
check(
  "3 — MUTATION: that scan WOULD catch the path requirement being dropped",
  !/status: "PUBLISHED",\s*assessment: \{ status: "PUBLISHED" \}/.test(
    'learningPath: { assessment: { status: "PUBLISHED" } },'
  )
);

/* ═══ 4 · LIVE — THE RULE PROVED ON REAL ROWS, WITHOUT MOVING A STATUS ════ */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

async function live() {
  const before = {
    links: await prisma.learningPathSkill.count(),
    attempts: await prisma.certificationAttempt.count(),
    tests: await prisma.certificationTest.count(),
  };

  /* ── the three fixtures, which must genuinely differ ── */
  const bothPublished = await prisma.learningPath.findFirst({
    where: { status: "PUBLISHED", assessment: { status: "PUBLISHED" } },
    select: { id: true, title: true },
  });
  const testDraft = await prisma.learningPath.findFirst({
    where: { status: "PUBLISHED", assessment: { status: "DRAFT" } },
    select: { id: true, title: true },
  });
  const pathDraft = await prisma.learningPath.findFirst({
    where: { status: "DRAFT", assessment: { isNot: null } },
    select: { id: true, title: true },
  });
  const skill = await prisma.skill.findFirst({ select: { id: true, name: true } });

  check("4 — a path with BOTH published exists to prove the positive case", bothPublished != null);
  check("4 — ⚠⚠ a path whose TEST is DRAFT exists — the rule's first half", testDraft != null);
  check("4 — ⚠⚠ a DRAFT path exists — the rule's second half", pathDraft != null);
  check("4 — a skill exists to link", skill != null);
  check(
    "4 — ⚠⚠⚠ the three fixtures are genuinely different paths",
    bothPublished != null &&
      testDraft != null &&
      pathDraft != null &&
      new Set([bothPublished.id, testDraft.id, pathDraft.id]).size === 3,
    "three identical fixtures agree with each other and with nothing else (E603 WS-C)"
  );
  if (!bothPublished || !testDraft || !pathDraft || !skill) return before;

  const mine: { learning_path_id: string; skill_id: string }[] = [];
  const link = async (pathId: string) => {
    await prisma.learningPathSkill.create({
      data: { learning_path_id: pathId, skill_id: skill.id },
    });
    mine.push({ learning_path_id: pathId, skill_id: skill.id });
  };
  const unlink = async () => {
    for (const w of mine.splice(0)) {
      await prisma.learningPathSkill.deleteMany({ where: w });
    }
  };

  try {
    check(
      "4 — ⚠ with the join empty, the skill resolves to NO test (the greyed state)",
      (await certificationTestForSkill(skill.id)) === null,
      "E701's join holds 0 rows, so every skill is legitimately NO_TEST today"
    );

    await link(bothPublished.id);
    const okCase = await certificationTestForSkill(skill.id);
    check(
      "4 — ⚠⚠ a PUBLISHED test on a PUBLISHED path RESOLVES",
      okCase != null && okCase.learningPathId === bothPublished.id,
      `got ${okCase ? okCase.learningPathTitle : "null"} for ${bothPublished.title}`
    );
    await unlink();

    /* ── ⚠⚠⚠ A DRAFT TEST IS NOT A CERTIFICATION (93e) ── */
    await link(testDraft.id);
    const draftTest = await certificationTestForSkill(skill.id);
    check(
      "4 — ⚠⚠⚠ a DRAFT test on a PUBLISHED path resolves to NOTHING",
      draftTest === null,
      `got ${draftTest ? draftTest.learningPathTitle : "null"} — a test nobody has read must award nothing`
    );
    await unlink();

    /* ── ⚠⚠ AND THE PATH MUST BE PUBLISHED TOO ── */
    await link(pathDraft.id);
    const draftPath = await certificationTestForSkill(skill.id);
    check(
      "4 — ⚠⚠ a test on a DRAFT path resolves to NOTHING either",
      draftPath === null,
      "a published test on an unpublished path is a door onto a wall"
    );
    await unlink();
  } finally {
    /* ⚠⚠ DELETE EXACTLY WHAT THIS GATE CREATED. Never a bare deleteMany. */
    await unlink();
  }

  /* ── ⚠⚠⚠ AND THE RESOLVER REFUSES RATHER THAN ANSWERING "NO" ── */
  const orphan = await prisma.person.findFirst({
    where: { user_id: null },
    select: { id: true },
  });
  if (orphan) {
    let threw: string | null = null;
    try {
      await userIdForPerson(asPersonId(orphan.id));
    } catch (e) {
      threw = e instanceof LearnIdentityError ? e.code : `wrong error: ${String(e)}`;
    }
    check(
      "4 — ⚠⚠⚠ a person with NO ACCOUNT makes the resolver REFUSE, not return falsy",
      threw === "NO_ACCOUNT",
      `${threw} — answering "has not passed" about them would be a false statement`
    );
  } else {
    /* ⚠ Reported rather than skipped silently: the branch exists and was not exercised. */
    check(
      "4 — a person with no account exists to prove the refusal",
      false,
      "NOT RUN: every Person currently has a user_id, so the NO_ACCOUNT branch is unexercised"
    );
  }

  /* ⚠ And a person WITH an account resolves cleanly. */
  const withAccount = await prisma.person.findFirst({
    where: { user_id: { not: null } },
    select: { id: true, user_id: true },
  });
  check("4 — a person WITH an account exists", withAccount != null);
  if (withAccount) {
    const resolved = await userIdForPerson(asPersonId(withAccount.id));
    check(
      "4 — ⚠⚠ and the resolver returns that person's OWN account id, by identity",
      resolved === withAccount.user_id,
      `${resolved} vs ${withAccount.user_id}`
    );
  }

  const after = {
    links: await prisma.learningPathSkill.count(),
    attempts: await prisma.certificationAttempt.count(),
    tests: await prisma.certificationTest.count(),
  };
  check(
    "4 — ⚠⚠ the gate left no skill links behind",
    after.links === before.links,
    `LearningPathSkill ${before.links} → ${after.links}`
  );
  check(
    "4 — ⚠⚠⚠ AND NO STATUS WAS MOVED: tests and attempts unchanged",
    after.tests === before.tests && after.attempts === before.attempts,
    `CertificationTest ${before.tests}→${after.tests}, CertificationAttempt ${before.attempts}→${after.attempts}`
  );
  return before;
}

live()
  .catch((e) => {
    failures.push(`4 — the live half threw instead of asserting: ${(e as Error).message}`);
  })
  .finally(async () => {
    await prisma.$disconnect();
    const notRun = failures.filter((f) => f.includes("NOT RUN")).length;
    if (failures.length > 0) {
      console.error(
        `check:learn-identity — ${failures.length - notRun} FAILED, ${pass} passed, ${notRun} not run\n`
      );
      for (const f of failures) console.error(`  ✗ ${f}`);
      process.exit(1);
    }
    console.log(`check:learn-identity — ${pass}/${pass} passed, 0 failed, 0 not run`);
    console.log("  ⚠ THE ID TANGLE IS HELD BY `tsc`, NOT BY THIS GATE: UserId and PersonId are");
    console.log("    branded, so a personId reaching hasPassed is a COMPILE error (E711 proved it");
    console.log("    twice — a PersonId, and an unnamed bare string).");
    console.log("  ⚠⚠ NOT BUILT, AND IT IS THE REST OF THE BRIEF: `certification-tests.ts` has");
    console.log("    ZERO external callers. There is no three-state control, nothing threads a");
    console.log("    skill from a work request, and CertificationAttempt holds 0 rows — so");
    console.log("    ALREADY_PASSED cannot be reached with real data. LearningPathSkill: 0 rows.");
  });
