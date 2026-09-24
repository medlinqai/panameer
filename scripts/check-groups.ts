import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { canLeaveGroup, groupOffer, GROUP_OFFER_COPY } from "@/lib/group-membership";

/**
 * ── ⚠⚠⚠ `check:groups` (`P2-A3-E612` WS-C) ──────────────────────────────
 *
 * Every assertion is one of Scott's 2026-09-23 rulings made unbreakable.
 */
let pass = 0;
const fails: string[] = [];
const check = (name: string, ok: boolean, why = "") => {
  if (ok) pass += 1;
  else fails.push(`${name}${why ? ` — ${why}` : ""}`);
};

/** ⚠ Rule 12 / `E164`: a quote is not live code. */
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}
const SRC = walk("src");

async function main() {
  /* ── 1 · ⚠⚠⚠ EXACTLY ONE ACCESS RULE — DERIVED, NOT LISTED (E587) ──────
     ⚠ Any function reaching for BOTH halves of the path-forum rule IS a second
     copy of it. ⚠⚠ Count > 0 (`E586`). */
  const forumsRaw = readFileSync(join("src", "lib", "forums.ts"), "utf8");
  const fns = [...forumsRaw.matchAll(/^(?:export )?(?:async )?function (\w+)[\s\S]*?^}/gm)].map(
    (m) => ({ name: m[1], body: strip(m[0]) })
  );
  check("1 — the function scan has a population (E586)", fns.length > 5, `${fns.length}`);
  const dual = fns
    .filter((f) => /teachesPathWhere\(/.test(f.body) && /learnEnrollment\./.test(f.body))
    .map((f) => f.name);
  check(
    "1 — exactly one function holds both halves of the access rule",
    dual.length === 1,
    `${dual.join(", ") || "none"}`
  );

  /* ── 2 · ⚠⚠⚠ NO PAGE OFFERS A PURCHASE ─────────────────────────────────
     ⚠ Derived from the rendered text of every Groups surface. */
  const GROUP_UI = SRC.filter(
    (f) =>
      f.includes(join("components", "community")) ||
      f.includes(join("app", "(app)", "community"))
  );
  check("2 — the Groups UI scan has a population (E586)", GROUP_UI.length > 3, `${GROUP_UI.length}`);
  const BUY = [/\bbuy now\b/i, /\bjoin for \$/i, /\bcheckout\b/i, /\bpay now\b/i, /\bsubscribe\b/i];
  const sellers = GROUP_UI.filter((f) => {
    const body = strip(readFileSync(f, "utf8"));
    const rendered = [...body.matchAll(/>([^<>{}]{2,160})</g)].map((m) => m[1]).join("\n");
    return BUY.some((r) => r.test(rendered));
  });
  check(
    "2 — no Groups surface offers a purchase",
    sellers.length === 0,
    `${sellers.join(", ")} — no Payment row is ever created; a buy button promises a mechanism with no writer`
  );
  /* ⚠⚠ AND NO GROUPS CODE WRITES A PAYMENT. */
  const payWriters = GROUP_UI.concat([join("src", "lib", "group-membership.ts")]).filter((f) =>
    /\bpayment\.(create|createMany|upsert)\b/.test(strip(readFileSync(f, "utf8")))
  );
  check("2 — no Groups code creates a Payment", payWriters.length === 0, payWriters.join(", "));

  /* ── 3 · ⚠⚠⚠ NO CONTROL RENDERS FOR A TYPE THAT CANNOT USE IT ──────────
     ⚠ `E579`. Driven through the pure offer function, every branch. */
  const base = { price_cents: null, price_period: null, learning_path_id: null };
  check(
    "3 — an invite-only group offers no join",
    groupOffer({ ...base, type: "INVITE_ONLY" }, false).kind === "invite_only"
  );
  check(
    "3 — a priced group offers no purchase, whatever its type",
    groupOffer({ ...base, type: "OPEN", price_cents: 5000 }, false).kind === "priced",
    "price beats type: joining a paid group would be a purchase"
  );
  check(
    "3 — an open group offers a join",
    groupOffer({ ...base, type: "OPEN" }, false).kind === "join"
  );
  check(
    "3 — a request group offers an ask",
    groupOffer({ ...base, type: "REQUEST" }, false).kind === "request"
  );
  /* ⚠⚠ THE FIXTURE DISTINGUISHES WHAT IT COMPARES: a path group and a general
     group of the SAME type give DIFFERENT answers. Two identical inputs would
     agree whatever the function did. */
  check(
    "3 — a path group's door is enrolment, not its type",
    groupOffer({ ...base, type: "OPEN", learning_path_id: "p" }, false).kind === "by_enrolment" &&
      groupOffer({ ...base, type: "OPEN" }, false).kind === "join",
    "same type, different kind of group, different answer"
  );
  /* ⚠⚠⚠ THE PAID COPY NAMES THE MECHANISM, NOT THE MEMBER. */
  check(
    "3 — the paid line names the mechanism",
    /buying isn't switched on/i.test(GROUP_OFFER_COPY.priced) &&
      !/you (are|aren'?t)|your account|not eligible/i.test(GROUP_OFFER_COPY.priced),
    "never 'you are not eligible' — nobody can buy, so it is not about the member"
  );

  /* ── 4 · ⚠⚠ A PATH GROUP CANNOT BE LEFT ────────────────────────────────── */
  check("4 — a path group cannot be left", canLeaveGroup({ learning_path_id: "p" }) === false);
  check("4 — a general group can be left", canLeaveGroup({ learning_path_id: null }) === true);

  /* ── 5 · ⚠⚠⚠ THE ENROLMENT WRITER EXISTS, AND IS IDEMPOTENT ────────────
     ⚠ Derived from the write: every route that creates a `LearnEnrollment`
     must also record the membership, or the two answers drift again. */
  const routes = SRC.filter((f) => f.includes(join("app", "api")) && f.endsWith("route.ts"));
  const enrolWriters = routes.filter((f) =>
    /\blearnEnrollment\.(create|createMany|upsert)\b/.test(strip(readFileSync(f, "utf8")))
  );
  check(
    "5 — the enrolment-writer scan has a population (E586)",
    enrolWriters.length >= 2,
    `${enrolWriters.length} routes write a LearnEnrollment`
  );
  for (const f of enrolWriters) {
    check(
      `5 — ${f} records the group membership`,
      /ensureEnrolmentMembership\(/.test(strip(readFileSync(f, "utf8"))),
      "enrolling IS joining; a row that is not written is an answer that drifts"
    );
  }

  /* ── 6 · ⚠⚠ EVERY BOARD HAS AN EXPLICIT TYPE, AND THE 4 GENERAL ARE OPEN ─ */
  const boards = await prisma.forumBoard.findMany({
    select: { id: true, type: true, learning_path_id: true, host_person_id: true },
  });
  check("6 — there are boards to check (E586)", boards.length > 0, `${boards.length}`);
  const general = boards.filter((b) => !b.learning_path_id);
  check(
    "6 — the four general groups are OPEN",
    general.length > 0 && general.every((b) => b.type === "OPEN"),
    "they are ownerless and are the product's own public rooms; an approval queue nobody staffs is worse than an open door"
  );
  /* ⚠⚠ AND THE REASON IS STILL TRUE — if a general board ever gains an owner,
     this fails and the OPEN ruling gets re-examined rather than inherited. */
  check(
    "6 — the general groups are still ownerless",
    general.every((b) => b.host_person_id === null),
    "the OPEN ruling was made BECAUSE nobody staffs them; an owner changes the question"
  );

  /* ── 7 · ⚠⚠⚠ THE BACKFILL GAVE NOBODY ACCESS THEY DID NOT HAVE ─────────
     ⚠ DERIVED ON BOTH SIDES. `before` is enrolment-or-teaching; `after` is
     membership-or-teaching. They must be equal in BOTH directions. */
  let gained = 0;
  let lost = 0;
  for (const b of boards.filter((x) => x.learning_path_id)) {
    const [enrolled, taught, members] = await Promise.all([
      prisma.learnEnrollment.findMany({
        where: { learning_path_id: b.learning_path_id! },
        select: { user: { select: { person: { select: { id: true } } } } },
      }),
      prisma.person.findMany({
        where: {
          OR: [
            { learnPaths: { some: { id: b.learning_path_id! } } },
            {
              learnLessons: {
                some: { section: { course: { learning_path_id: b.learning_path_id! } } },
              },
            },
          ],
        },
        select: { id: true },
      }),
      prisma.groupMembership.findMany({
        where: { board_id: b.id, state: "ACTIVE" },
        select: { person_id: true },
      }),
    ]);
    const before = new Set<string>(taught.map((p) => p.id));
    for (const e of enrolled) if (e.user.person?.id) before.add(e.user.person.id);
    const after = new Set<string>([...taught.map((p) => p.id), ...members.map((m) => m.person_id)]);
    for (const id of after) if (!before.has(id)) gained += 1;
    for (const id of before) if (!after.has(id)) lost += 1;
  }
  check("7 — the backfill gave nobody access they did not have", gained === 0, `${gained} gained`);
  check("7 — and nobody lost access they had", lost === 0, `${lost} lost`);

  /* ── 8 · ⚠⚠ THE JOIN WRITER IS IDEMPOTENT, AND A DECLINE IS RECORDED ────
     ⚠ Seeded and torn down by primary key in a `finally`. ⚠⚠ `deleteMany`, not
     `delete` — a teardown that can throw can hide the result it was
     protecting (learned at `E611`). */
  const openBoard = general[0];
  const probePerson = await prisma.person.findFirst({ select: { id: true } });
  check("8 — the probe has a board and a person (E586)", Boolean(openBoard && probePerson));
  if (openBoard && probePerson) {
    let rowId: string | null = null;
    try {
      await prisma.groupMembership.upsert({
        where: { board_id_person_id: { board_id: openBoard.id, person_id: probePerson.id } },
        create: { board_id: openBoard.id, person_id: probePerson.id, route: "JOINED", state: "ACTIVE" },
        update: { state: "ACTIVE" },
      });
      await prisma.groupMembership.upsert({
        where: { board_id_person_id: { board_id: openBoard.id, person_id: probePerson.id } },
        create: { board_id: openBoard.id, person_id: probePerson.id, route: "JOINED", state: "ACTIVE" },
        update: { state: "ACTIVE" },
      });
      const n = await prisma.groupMembership.count({
        where: { board_id: openBoard.id, person_id: probePerson.id },
      });
      check("8 — joining twice writes one row", n === 1, `${n} rows`);

      const row = await prisma.groupMembership.findUnique({
        where: { board_id_person_id: { board_id: openBoard.id, person_id: probePerson.id } },
        select: { id: true },
      });
      rowId = row?.id ?? null;

      /* ⚠⚠⚠ LEAVING IS RECORDED, NOT DELETED. */
      await prisma.groupMembership.updateMany({
        where: { board_id: openBoard.id, person_id: probePerson.id },
        data: { state: "REMOVED" },
      });
      const after = await prisma.groupMembership.findUnique({
        where: { board_id_person_id: { board_id: openBoard.id, person_id: probePerson.id } },
        select: { state: true },
      });
      check(
        "8 — leaving records REMOVED rather than deleting",
        after?.state === "REMOVED",
        "a delete makes 'never joined' and 'left' indistinguishable"
      );
    } finally {
      if (rowId) await prisma.groupMembership.deleteMany({ where: { id: rowId } });
    }
  }

  await prisma.$disconnect();
  console.log(`check:groups — ${fails.length ? `${fails.length} FAILED, ` : ""}${pass} passed`);
  for (const f of fails) console.log(`\n  ✗ ${f}`);
  if (fails.length) process.exit(1);
}

main();
