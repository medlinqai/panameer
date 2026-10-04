import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import {
  UserEditError,
  markEmailVerified,
  setActive,
  setLocked,
  setName,
  setRoles,
} from "@/lib/admin/user-edit";
import { readFileSync } from "fs";

const failures: string[] = [];
let pass = 0;
function check(name: string, cond: boolean, msg: string) {
  if (cond) pass++;
  else failures.push(`${name} — ${msg}`);
}

/** ⚠ Comments stripped before any source scan — load-bearing rule 12. */
const strip = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const lib = strip(readFileSync("src/lib/admin/user-edit.ts", "utf8"));
const route = strip(readFileSync("src/app/api/admin/user-edit/route.ts", "utf8"));
const panel = strip(readFileSync("src/components/admin/UserEditPanel.tsx", "utf8"));

/* ── §1 the route is gated before it reads anything ─────────────────────── */

const guardAt = route.indexOf('guardApi("canAdminister")');
const bodyAt = route.indexOf("request.json()");
check(
  "1a — the route guards on canAdminister",
  guardAt > -1,
  "an admin write with no guard is the whole of load-bearing rule 5",
);
check(
  "1b — and the guard runs BEFORE the body is read",
  guardAt > -1 && bodyAt > -1 && guardAt < bodyAt,
  `guard at ${guardAt}, body at ${bodyAt} — parsing first leaks work to the unauthorised`,
);
check(
  "1c — it returns on refusal rather than falling through",
  /if \(gate instanceof NextResponse\) return gate;/.test(route),
  "a guard whose result is ignored is not a guard",
);
check(
  "1d — an unknown action is refused, not ignored",
  /Unknown action/.test(route) && /status: 400/.test(route),
  "a switch with no default accepts anything and does nothing, silently",
);
/**
 * ⚠⚠ THE ROUTE DOES NOT TOUCH THE DATABASE. Every write goes through
 * `lib/admin/user-edit.ts`, which is where the audit entry and the refusals
 * live — a route that could write directly could skip both.
 */
check(
  "1e — the route owns no prisma access of its own",
  !/from "@\/lib\/prisma"/.test(route) && !/prisma\./.test(route),
  "writes belong to the library, with the audit trail they carry",
);

/* ── §2 the audit trail ─────────────────────────────────────────────────── */

/**
 * ⚠⚠⚠ THE AUDIT IS WHY THE LANE EXISTS. Scott's test users vanished in a reset
 * and the app could not say what had happened to them.
 */
const mutators = [...lib.matchAll(/export async function (\w+)\(/g)].map((m) => m[1]);
check(
  "2a — every exported mutator exists and is accounted for",
  mutators.length >= 6,
  `found ${JSON.stringify(mutators)}`,
);
const noAudit = mutators.filter((fn) => {
  const from = lib.indexOf(`export async function ${fn}(`);
  const next = mutators
    .map((o) => lib.indexOf(`export async function ${o}(`))
    .filter((i) => i > from)
    .sort((a, b) => a - b)[0];
  return !lib.slice(from, next === undefined ? lib.length : next).includes("writeAudit(");
});
check(
  "2b — and every one of them writes an audit entry",
  noAudit.length === 0,
  `no writeAudit in: ${JSON.stringify(noAudit)}`,
);
check(
  "2c — the audit records before AND after",
  /before:/.test(lib) && /after:/.test(lib),
  "an entry that records only the new value cannot answer what changed",
);

/* ── §3 nothing here hard-deletes, and nothing here handles a password ──── */

check(
  "3a — no delete of any kind lives in this module",
  !/\.delete\(/.test(lib) && !/\.deleteMany\(/.test(lib),
  "deactivation is SOFT; the only delete in the codebase is E793's test-account path",
);
/**
 * ⚠⚠ AN ADMIN WHO CAN READ OR SET A MEMBER'S PASSWORD IS A WORSE PROBLEM THAN A
 * MEMBER WHO CANNOT SIGN IN. The reset reuses `E528`'s path and returns `sent`.
 */
check(
  "3b — it never writes or returns a password",
  !/password_hash|password:/.test(lib) && !/bcrypt/.test(lib),
  "the reset sends a link; it does not set a password",
);
check(
  "3c — and no token or link is recorded in the audit",
  !/token/i.test(lib.slice(lib.indexOf("sendPasswordReset"))),
  "a reset token in an audit row is a takeover waiting in a log",
);

/* ── §4 the panel asks before the two locking actions ───────────────────── */

check(
  "4a — Lock and Deactivate go through a question",
  /setAsking\("lock"\)/.test(panel) && /setAsking\("deactivate"\)/.test(panel),
  "both must set the asking state rather than calling straight through",
);
check(
  "4b — and the UNDO directions do not ask",
  /call\("lock", \{ locked: false \}/.test(panel) &&
    /call\("active", \{ active: true, confirmed: true \}/.test(panel),
  "unlocking and reactivating give access back; a confirmation there is friction for nothing",
);
check(
  "4c — only one question is on screen at a time",
  /useState<"lock" \| "deactivate" \| null>/.test(panel),
  "two confirmations on screen is how the wrong one gets clicked",
);

/* ── §5 THE REFUSALS, AGAINST THE REAL DATABASE ─────────────────────────── */

/**
 * ── ⚠⚠⚠ THE GATE MAKES ITS OWN SUBJECT (`E586`'s LESSON, APPLIED) ───────────
 *
 * ⚠ **THE FIRST VERSION OF THIS CHECK SKIPPED AND PRINTED `14/14 passed`**,
 * because no `is_test` account existed on this machine — nobody had clicked
 * *Create test accounts* yet. ⚠⚠ That is **exactly `E586`**: a gate with no
 * inputs reporting success, quoted as green in tables for weeks.
 * ⚠⚠⚠ **SO IT DOES NOT DEPEND ON A BUTTON HAVING BEEN PRESSED.** It creates one
 * disposable `is_test` row, uses it, and removes exactly that row.
 *
 * ⚠⚠ **THE ADDRESS IS ON `UNDELIVERABLE_DOMAINS` ON PURPOSE** — `.invalid` is
 * reserved by RFC 2606 and the transport refuses it, so no code path reachable
 * from here can mail anybody even if one were added later.
 * ⚠ It is NOT `example.seed`: other gates and briefs quote the count of those,
 * and a row that exists for ninety seconds should not appear in a figure
 * somebody is reconciling.
 */
async function makeSubject() {
  /** ⚠ `Person.company_id` is REQUIRED, so an existing company is borrowed
   *  read-only. Creating one would leave a second row to clean up. */
  const company = await prisma.company.findFirst({ select: { id: true } });
  if (!company) throw new Error("no company exists to attach a person to");
  const email = `check-user-edit-${Date.now()}@panameer.invalid`;
  const user = await prisma.user.create({
    data: {
      email,
      first_name: "Check",
      last_name: "Subject",
      /** ⚠⚠⚠ `is_test: true` IS WHAT MAKES THIS SAFE. Every write below is
       *  aimed at this row, and the remove path cannot touch `is_test: false`. */
      is_test: true,
    },
    select: { id: true, email: true, locked: true, is_active: true },
  });
  const person = await prisma.person.create({
    data: { company_id: company.id, user_id: user.id, first_name: "Check", last_name: "Subject" },
    select: { id: true },
  });
  return { user, personId: person.id };
}

async function main() {
  const usersBefore = await prisma.user.count();
  const peopleBefore = await prisma.person.count();
  const made = await makeSubject();
  const subject = made.user;
  const personId = made.personId;
  const before = { locked: subject.locked, is_active: subject.is_active };
  check(
    "5-pre — the subject exists and is flagged as a test row",
    subject.is_active === true && subject.locked === false,
    `a fresh row must start unlocked and active: ${JSON.stringify(before)}`,
  );

  const actor: Viewer = {
    userId: "00000000-0000-0000-0000-000000000000",
    role: "ADMIN", isSystemAdmin: true, isAdmin: true,
    isServiceBuyer: false, isServiceProvider: false, isServiceCoordinator: false,
    isSupport: false, pAccountId: null,
  };
  /** ⚠ The same actor, except that it IS the subject — the self-target case. */
  const selfActor: Viewer = { ...actor, userId: subject.id };

  async function refuses(fn: () => Promise<unknown>, code: string) {
    try {
      await fn();
      return `no error (expected ${code})`;
    } catch (e) {
      if (e instanceof UserEditError) return e.code === code ? null : `got ${e.code}, wanted ${code}`;
      return `got ${(e as Error).name}: ${(e as Error).message.slice(0, 60)}`;
    }
  }

  /**
   * ⚠⚠⚠ THE CONFIRMATION IS SERVER-SIDE. A disabled button is not a guarantee —
   * this route is reachable with curl by anyone holding an admin session.
   */
  check(
    "5a — locking without a confirmation is refused",
    (await refuses(() => setLocked(actor, personId, true, false), "CONFIRM")) === null,
    (await refuses(() => setLocked(actor, personId, true, false), "CONFIRM")) ?? "",
  );
  check(
    "5b — deactivating without a confirmation is refused",
    (await refuses(() => setActive(actor, personId, false, false), "CONFIRM")) === null,
    (await refuses(() => setActive(actor, personId, false, false), "CONFIRM")) ?? "",
  );
  /**
   * ⚠⚠ AND THE SELF-TARGET REFUSAL BEATS THE CONFIRMATION — `confirmed: true`
   * here, and it still refuses. ⚠ Locking the account you are signed in with
   * ends the session that is the only way back to the screen.
   */
  check(
    "5c — an admin cannot lock their own account, even confirmed",
    (await refuses(() => setLocked(selfActor, personId, true, true), "INVALID")) === null,
    (await refuses(() => setLocked(selfActor, personId, true, true), "INVALID")) ?? "",
  );
  check(
    "5d — nor deactivate it",
    (await refuses(() => setActive(selfActor, personId, false, true), "INVALID")) === null,
    (await refuses(() => setActive(selfActor, personId, false, true), "INVALID")) ?? "",
  );
  check(
    "5e — a name with neither part is refused",
    (await refuses(() => setName(actor, personId, "  ", ""), "INVALID")) === null,
    "a person with no name at all is how a row becomes unfindable",
  );
  check(
    "5f — a person who does not exist is NOT_FOUND, not a crash",
    (await refuses(
      () => setRoles(actor, "00000000-0000-0000-0000-000000000000", { buyer: true }),
      "NOT_FOUND",
    )) === null,
    "the id comes from a URL and may be anything",
  );

  /**
   * ⚠⚠⚠ AND THE REFUSALS CHANGED NOTHING. Six refusals above; if any had written
   * first and thrown second, the account would be locked right now. ⚠ Asserted
   * by IDENTITY on this one row, not by a count of locked accounts.
   */
  const after = await prisma.user.findUnique({
    where: { id: subject.id },
    select: { locked: true, is_active: true },
  });
  check(
    "5g — and every refusal left the row exactly as it was",
    after?.locked === before.locked && after?.is_active === before.is_active,
    `${subject.email}: locked ${before.locked}→${after?.locked}, active ${before.is_active}→${after?.is_active}`,
  );

  /**
   * ⚠⚠ AND A WRITE THAT IS *MEANT* TO LAND, LANDS. Seven refusals above would
   * all pass against a module that refused everything — the counter-case is
   * what makes them mean anything (ruling 12).
   */
  await setName(actor, personId, "Renamed", "Subject");
  const renamed = await prisma.person.findUnique({
    where: { id: personId },
    select: { first_name: true, user: { select: { first_name: true } } },
  });
  check(
    "5h — a legitimate write DOES land, on both rows",
    renamed?.first_name === "Renamed" && renamed?.user?.first_name === "Renamed",
    `person ${renamed?.first_name}, user ${renamed?.user?.first_name} — User carries its own copy of the name`,
  );
  await markEmailVerified(actor, personId);
  const verified = await prisma.user.findUnique({
    where: { id: subject.id },
    select: { email_verified: true },
  });
  check(
    "5i — and an admin override is recorded as one",
    verified?.email_verified !== null,
    "marking verified must set the timestamp",
  );
  const audits = await prisma.adminAudit.count({ where: { target_id: { in: [personId, subject.id] } } });
  check(
    "5j — those two writes left two audit rows behind",
    audits >= 2,
    `found ${audits} audit rows for this subject — the audit is why the lane exists`,
  );

  /* ── teardown: remove exactly what was created, and prove the counts ──── */
  await prisma.adminAudit.deleteMany({ where: { target_id: { in: [personId, subject.id] } } });
  await prisma.person.delete({ where: { id: personId } });
  /** ⚠⚠⚠ THE `is_test: true` FILTER IS KEPT EVEN HERE, ON A ROW THIS SCRIPT
   *  CREATED ITSELF — `deleteMany` with both conditions cannot widen by one
   *  typo into a row somebody owns. */
  const removed = await prisma.user.deleteMany({ where: { id: subject.id, is_test: true } });
  check(
    "5k — and it took its own row back out",
    removed.count === 1,
    `deleted ${removed.count} rows; expected exactly the one this check created`,
  );
  const usersAfter = await prisma.user.count();
  const peopleAfter = await prisma.person.count();
  /**
   * ⚠⚠ COUNTS, AND THEY ARE ENOUGH HERE *ONLY* BECAUSE THE SUBJECT'S IDENTITY IS
   * ALSO ASSERTED ABOVE (§5k deleted it BY ID). ⚠ A bare count comparison is
   * what let a real signup hide a teardown bug earlier today.
   */
  check(
    "5l — the database is back to the size it was",
    usersAfter === usersBefore && peopleAfter === peopleBefore,
    `users ${usersBefore}→${usersAfter}, people ${peopleBefore}→${peopleAfter}`,
  );
}

main()
  .catch((e) => {
    failures.push(`FATAL — ${(e as Error).message}`);
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (failures.length) {
      console.error(`\ncheck:user-edit — ${failures.length} FAILED, ${pass} passed`);
      for (const f of failures) console.error(`  ✗ ${f}`);
      process.exit(1);
    }
    console.log(`\ncheck:user-edit — ${pass}/${pass} passed`);
  });
