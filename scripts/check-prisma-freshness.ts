/**
 * ── `check:prisma-freshness` (`P2-ALL-E799`) ────────────────────────────────
 *
 * ⚠⚠ **IT TESTS THE RULE, NOT THE MACHINE.** The thing worth guarding is the
 * decision — *generate* vs *restart* vs *say nothing* — and that is a pure
 * function of three timestamps, so it can be tested without stopping a server.
 *
 * ⚠⚠⚠ **THE REAL FAILURE IT ENCODES:** Scott's dev server was fourteen hours
 * older than the generated Prisma client, every query selecting `User.is_test`
 * threw `Unknown field`, and what reached him was *"Encountered a script tag
 * while rendering React component"* from the root layout — an innocent file he
 * had already ruled on. ⚠ A message that names the wrong layer costs more than
 * no message.
 */
import { freshness } from "@/lib/prisma-freshness";

const failures: string[] = [];
let pass = 0;
function check(name: string, cond: boolean, msg: string) {
  if (cond) pass++;
  else failures.push(`${name} — ${msg}`);
}

const HOUR = 3_600_000;
/** A plausible clock: schema edited, client generated, server started. */
const t0 = Date.parse("2026-10-03T00:00:00Z");

check(
  "1 — a fresh trio says nothing",
  freshness({ schemaMs: t0, clientMs: t0 + 1000, processStartMs: t0 + 2000 }).problem === null,
  "schema → client → server, in order, is the normal case and must be silent",
);

check(
  "2 — a schema newer than the client asks for a GENERATE",
  freshness({ schemaMs: t0 + HOUR, clientMs: t0, processStartMs: t0 + 2 * HOUR }).problem === "generate",
  "this is the `db:push` trap CLAUDE.md already names",
);

/**
 * ⚠⚠⚠ THE CASE THAT ACTUALLY BIT, AND THE ONE NO DOC COVERED. The client on
 * disk is current; the PROCESS is older than it. ⚠ Scott's own numbers: server
 * up at 00:05, client generated at 14:12.
 */
check(
  "3 — a client newer than the process asks for a RESTART",
  freshness({ schemaMs: t0, clientMs: t0 + 14 * HOUR, processStartMs: t0 + 5 * 60_000 }).problem === "restart",
  "regenerating does nothing for a server that is already running",
);

/**
 * ⚠⚠ THE TWO PROBLEMS MUST NOT BE CONFLATED — the whole value of this check is
 * that the two sentences differ, and a function returning one string for both
 * would pass every test above.
 */
const gen = freshness({ schemaMs: t0 + HOUR, clientMs: t0, processStartMs: t0 + 2 * HOUR });
const res = freshness({ schemaMs: t0, clientMs: t0 + HOUR, processStartMs: t0 + 60_000 });
check(
  "4 — and they give DIFFERENT advice",
  gen.message !== res.message &&
    /prisma generate/.test(gen.message ?? "") &&
    /restart/i.test(res.message ?? "") &&
    !/prisma generate/.test(res.message ?? ""),
  `generate: ${gen.message?.slice(0, 40)} | restart: ${res.message?.slice(0, 40)}`,
);

check(
  "5 — GENERATE wins when both are true",
  freshness({ schemaMs: t0 + 2 * HOUR, clientMs: t0 + HOUR, processStartMs: t0 }).problem === "generate",
  "a client built from a stale schema is wrong even after a restart, so it is named first",
);

/**
 * ⚠⚠ UNKNOWN IS NOT BROKEN. A bundled production server has no `schema.prisma`
 * to read, and a warning nobody can act on is noise that teaches people to
 * ignore the channel (ruling 10).
 */
check(
  "6 — a missing file is silence, not a warning",
  freshness({ schemaMs: null, clientMs: t0, processStartMs: t0 }).problem === null &&
    freshness({ schemaMs: t0, clientMs: null, processStartMs: t0 }).problem === null,
  "it must not guess where it cannot see",
);

/**
 * ⚠⚠⚠ THE SLACK IS PART OF THE RULE. `prisma generate` writes the schema copy
 * and the client within the same second often enough that a strict comparison
 * would fire on a perfectly fresh pair — which is the false red that gets a
 * check deleted.
 */
check(
  "7 — sub-second ordering is tolerated in BOTH directions",
  freshness({ schemaMs: t0 + 400, clientMs: t0, processStartMs: t0 + 900 }).problem === null &&
    freshness({ schemaMs: t0, clientMs: t0 + 900, processStartMs: t0 + 300 }).problem === null,
  "a few hundred milliseconds is not staleness",
);
check(
  "8 — but a real gap is not tolerated",
  freshness({ schemaMs: t0 + 5000, clientMs: t0, processStartMs: t0 + 9000 }).problem === "generate",
  "five seconds is past the slack and is a genuine ordering problem",
);

/**
 * ⚠ And the caller's contract: a message exists exactly when a problem does.
 * A problem with no sentence is a warning nobody can act on; a sentence with no
 * problem is a warning on a healthy machine.
 */
const cases: Parameters<typeof freshness>[0][] = [
  { schemaMs: t0, clientMs: t0, processStartMs: t0 },
  { schemaMs: t0 + HOUR, clientMs: t0, processStartMs: t0 },
  { schemaMs: t0, clientMs: t0 + HOUR, processStartMs: t0 },
  { schemaMs: null, clientMs: null, processStartMs: t0 },
];
check(
  "9 — a message exists exactly when a problem does",
  cases.every((c) => {
    const f = freshness(c);
    return (f.problem === null) === (f.message === null);
  }),
  "the two fields must agree in every case",
);

if (failures.length) {
  console.error(`\ncheck:prisma-freshness — ${failures.length} FAILED, ${pass} passed`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\ncheck:prisma-freshness — ${pass}/${pass} passed`);
