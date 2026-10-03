/**
 * ── `check:test-accounts` (`P2-ALL-E793`) ───────────────────────────────────
 *
 * ⚠⚠⚠ **THIS IS DATA-LOSS LOGIC ON A DATABASE SHARED WITH LIVE MEMBERS**, so it
 * is one of the three kinds of code Scott still wants mutation-tested. The
 * assertions below are written so that removing EITHER half of the remove path's
 * filter fails the gate.
 *
 * ⚠⚠ **IT CREATES ITS OWN TWO ROWS AND REMOVES EXACTLY THOSE**, then asserts the
 * live counts are unchanged. A real member followed the build mid-run earlier
 * today; a gate that touches `users` has to prove it gave everything back.
 */
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { marketplaceVisibleWhere } from "@/lib/access";
import {
  TEST_SET,
  expectedConfirmation,
  hideTestFromMembers,
  previewRemovable,
  removeTestAccounts,
  setTestFlag,
} from "@/lib/admin/test-accounts";
import { readFileSync } from "fs";

const failures: string[] = [];
let pass = 0;
function check(name: string, cond: boolean, msg: string) {
  if (cond) pass++;
  else failures.push(`${name} — ${msg}`);
}

const viewer = { userId: "00000000-0000-4000-8000-00000000e793" } as Viewer;
const SCRATCH_REAL = "check-e793-real@panameer.com";
const SCRATCH_TEST = "check-e793-test@panameer.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: [SCRATCH_REAL, SCRATCH_TEST] } } });
  await prisma.adminAudit.deleteMany({ where: { actor_id: viewer.userId } });
}

async function main() {
  /**
   * ── ⚠⚠⚠ IDENTITIES, NOT TOTALS — AND THIS IS THE SECOND TIME TODAY ─────────
   *
   * ⚠⚠ **REAL PEOPLE SIGN UP WHILE THIS RUNS.** Measured 2026-10-03: two real
   * `gmail.com` accounts and another address were created during this session,
   * one of them 16:12 — inside a single gate run. ⚠ A `count()` compared
   * before/after therefore goes red for a stranger using the product, which is
   * exactly the mistake `E787` made with followers and had to unlearn.
   * ⚠⚠⚠ **SO THIS ASKS THE ONLY QUESTIONS THE GATE CAN HONESTLY OWN: did it
   * delete anything it did not create, and did it leave anything behind?**
   */
  const beforeIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id),
  );
  const before = {
    test: await prisma.user.count({ where: { is_test: true } }),
    followers: await prisma.workTrackerFollower.count(),
  };

  /* ── §1 the predicate ─────────────────────────────────────────────────── */

  check(
    "1a — a real viewer hides test accounts",
    JSON.stringify(hideTestFromMembers(false)) === '{"is_test":false}',
    JSON.stringify(hideTestFromMembers(false)),
  );
  check(
    "1b — a test viewer sees everyone",
    JSON.stringify(hideTestFromMembers(true)) === "{}",
    JSON.stringify(hideTestFromMembers(true)),
  );
  /**
   * ⚠⚠ THE SHARED MARKETPLACE PREDICATE CARRIES THE RULE, which is what makes
   * the ten surfaces inherit it. ⚠ Asserted on the OBJECT, not on a grep, so a
   * refactor that renames the clause still has to keep the behaviour.
   */
  const realWhere = JSON.stringify(marketplaceVisibleWhere(false));
  const testWhere = JSON.stringify(marketplaceVisibleWhere(true));
  check(
    "1c — marketplaceVisibleWhere() excludes test accounts by default",
    realWhere.includes('"is_test":false'),
    realWhere.slice(0, 200),
  );
  check(
    "1d — and does not, for a test viewer",
    !testWhere.includes("is_test"),
    testWhere.slice(0, 200),
  );
  check(
    "1e — the two differ, so §1c cannot pass vacuously",
    realWhere !== testWhere,
    "ruling 11: identical predicates would make the pair meaningless",
  );

  /* ── §2 the set ───────────────────────────────────────────────────────── */

  check("2a — the set is nine accounts", TEST_SET.length === 9, `${TEST_SET.length}`);
  check(
    "2b — every address is @panameer.com, which is deliverable",
    TEST_SET.every((t) => t.email.endsWith("@panameer.com")),
    "a reserved domain would hard-bounce if any path ever mailed them",
  );
  check(
    "2c — the set covers requesters, buyers, a recruiter and providers",
    new Set(TEST_SET.map((t) => t.kind)).size === 4,
    [...new Set(TEST_SET.map((t) => t.kind))].join(","),
  );
  check(
    "2d — no address collides with a real account today",
    (await prisma.user.count({
      where: { email: { in: TEST_SET.map((t) => t.email) }, is_test: false },
    })) === 0,
    "a real account on one of those addresses would be relabelled by `create`",
  );

  /* ── §3 the remove path — the dangerous one ───────────────────────────── */

  try {
    await cleanup();
    /** ⚠ Two rows, identical but for the flag. The pair is what proves the
     *  filter rather than the luck of an empty table. */
    const real = await prisma.user.create({
      data: { email: SCRATCH_REAL, first_name: "Scratch", last_name: "Real", is_test: false },
      select: { id: true },
    });
    const test = await prisma.user.create({
      data: { email: SCRATCH_TEST, first_name: "Scratch", last_name: "Test", is_test: true },
      select: { id: true },
    });

    const preview = await previewRemovable();
    const emails = preview.map((p) => p.email);
    check(
      "3a — preview lists the test row",
      emails.includes(SCRATCH_TEST),
      `preview: ${emails.join(", ") || "(empty)"}`,
    );
    check(
      "3b — preview NEVER lists the real row",
      !emails.includes(SCRATCH_REAL),
      "the preview is what the admin confirms against — a real row here is the defect",
    );

    /** ⚠⚠ THE CONFIRMATION IS COUNTED: a wrong number must be refused. */
    let refused = false;
    try {
      await removeTestAccounts(viewer, "REMOVE 999");
    } catch {
      refused = true;
    }
    check("3c — a mismatched confirmation is refused", refused, "REMOVE 999 was accepted");
    check(
      "3d — and nothing was deleted by the refusal",
      (await prisma.user.count({ where: { email: SCRATCH_TEST } })) === 1,
      "the refused call still deleted",
    );

    /**
     * ⚠⚠⚠ WRAPPED, BECAUSE A MUTATION MADE THIS THROW AND THE THROW HID THE
     * RESULT IT WAS PROTECTING. With the confirmation check mutated away, the
     * REFUSED call above actually deletes, so by the time this line runs there
     * is nothing left and `removeTestAccounts` threw "no test accounts to
     * remove" — killing the process before the failure summary printed. ⚠ The
     * gate still went red, but as a stack trace instead of a named assertion,
     * and a red nobody can read is a red people learn to ignore (ruling 10).
     */
    let result: { removed: number; emails: string[] } = { removed: -1, emails: [] };
    try {
      result = await removeTestAccounts(viewer, expectedConfirmation(preview.length));
    } catch (e) {
      failures.push(
        `3e-pre — the real removal threw, which usually means the refused call above already deleted: ${String(e).slice(0, 120)}`,
      );
    }
    check("3e — the test row is gone", (await prisma.user.count({ where: { email: SCRATCH_TEST } })) === 0, "still there");
    /** ⚠⚠⚠ THE ONE THAT MATTERS. */
    check(
      "3f — THE REAL ROW SURVIVED",
      (await prisma.user.count({ where: { email: SCRATCH_REAL } })) === 1,
      "a real account was deleted by the test-account remove path",
    );
    check("3g — it reported what it removed", result.removed >= 1, `${result.removed}`);

    /** ⚠ And it wrote the audit row BEFORE deleting. */
    const audit = await prisma.adminAudit.findFirst({
      where: { actor_id: viewer.userId, action: "test_accounts.remove" },
      select: { row_count: true, detail: true },
    });
    check("3h — the removal is in the audit log", audit !== null, "no audit row for the delete");
    check(
      "3i — and the log names the addresses",
      JSON.stringify(audit?.detail ?? {}).includes(SCRATCH_TEST),
      JSON.stringify(audit?.detail ?? {}).slice(0, 160),
    );

    /* ── §4 marking a real account ────────────────────────────────────────── */

    let needsAck = false;
    try {
      await setTestFlag(viewer, real.id, true);
    } catch {
      needsAck = true;
    }
    check(
      "4a — marking a REAL account TEST is refused without the acknowledgement",
      needsAck,
      "it would put a real member in the remove path",
    );
    check(
      "4b — and the flag did not change",
      (await prisma.user.findUnique({ where: { id: real.id }, select: { is_test: true } }))?.is_test === false,
      "the refusal still wrote",
    );
    await setTestFlag(viewer, real.id, true, true);
    check(
      "4c — with the acknowledgement it does change",
      (await prisma.user.findUnique({ where: { id: real.id }, select: { is_test: true } }))?.is_test === true,
      "the acknowledged call did not write",
    );
    void test;
  } finally {
    await cleanup();
  }

  /* ── §5 the source carries no unfiltered delete ───────────────────────── */

  /**
   * ⚠⚠ A SOURCE ASSERTION, because the behavioural ones above can only test the
   * paths that exist. ⚠ It STRIPS COMMENTS first — the house rule quotes
   * superseded code (`E164`), and a quote must not read as live code (rule 12).
   */
  const raw = readFileSync("src/lib/admin/test-accounts.ts", "utf8");
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const deletes = [...code.matchAll(/user\.deleteMany\(\{[\s\S]{0,200}?\}\)/g)].map((m) => m[0]);
  check("5a — the module has a delete to check", deletes.length > 0, "no user.deleteMany found at all");
  check(
    "5b — every user delete in the module is scoped by is_test",
    deletes.every((d) => /is_test:\s*true/.test(d)),
    `unscoped delete: ${deletes.find((d) => !/is_test:\s*true/.test(d))?.slice(0, 120)}`,
  );

  /* ── §6 nothing of Scott's moved ──────────────────────────────────────── */

  const afterIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id),
  );
  const after = {
    test: await prisma.user.count({ where: { is_test: true } }),
    followers: await prisma.workTrackerFollower.count(),
  };

  /** ⚠⚠⚠ THE ONE THAT MATTERS: nothing that existed before is gone. */
  const removed = [...beforeIds].filter((id) => !afterIds.has(id));
  check(
    "6a — this gate deleted nothing it did not create",
    removed.length === 0,
    `${removed.length} pre-existing users are gone: ${removed.slice(0, 5).join(", ")}`,
  );
  /** ⚠ And it left nothing behind. ⚠⚠ New ids are ALLOWED — a real signup
   *  during the run is a stranger using the product, not a defect — so this
   *  checks the gate's OWN addresses rather than the count. */
  check(
    "6b — it left none of its own rows behind",
    (await prisma.user.count({ where: { email: { in: [SCRATCH_REAL, SCRATCH_TEST] } } })) === 0,
    "a scratch account survived the teardown",
  );
  check(
    "6c — the test-account count is back where it started",
    before.test === after.test,
    `${before.test} → ${after.test}`,
  );
  check(
    "6d — the followers are untouched",
    before.followers === after.followers,
    `${before.followers} → ${after.followers} — real third parties follow the build`,
  );
  check("6e — §6a had identities to compare", beforeIds.size > 10, `${beforeIds.size} users`);
  /** ⚠ Reported, never asserted: a live signup mid-run is information, not a
   *  failure. It is printed so a reader knows the table moved under the gate. */
  const appeared = [...afterIds].filter((id) => !beforeIds.has(id)).length;
  if (appeared > 0) console.log(`  note: ${appeared} account(s) were created by someone else while this ran.`);

  if (failures.length > 0) {
    console.error(`check:test-accounts — ${failures.length} FAILED, ${pass} passed\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`check:test-accounts — ${pass}/${pass} passed`);
  await prisma.$disconnect();
}

main();
