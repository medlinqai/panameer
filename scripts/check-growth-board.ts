/**
 * `check:growth-board` — the board's ORDER is `growthScore` sorted, and it has
 * inputs (`P2-A3-E599` WS-B 4). `npm run check:growth-board`.
 *
 * ── ⚠⚠⚠ GATED BY SHAPE, NOT BY A FIXTURE'S EXPECTED NUMBERS (`E587`) ──────
 *
 * ⚠ The brief: *"the board's order equals `growthScore` sorted, for every row,
 * and the count is > 0 (`E586`). A seeded month with known invites, joins and
 * recommendations proves the totals."*
 * ⚠⚠ SO THIS ASSERTS A RELATIONSHIP, NOT A TABLE OF ANSWERS: for every row the
 * board returns, `growthScore` is re-asked independently and must agree, and
 * the sequence must be non-increasing. ⚠⚠⚠ A HARDCODED EXPECTED BOARD WOULD
 * BREAK EVERY TIME THE SEED CHANGED and would prove nothing about the ordering
 * rule itself.
 *
 * ── ⚠⚠ IT SEEDS ITS OWN MONTH AND REMOVES EXACTLY WHAT IT MADE ───────────
 *
 * ⚠ On real data the board is EMPTY — measured: `colleague_invites` holds 7
 * rows, 1 with an inviter, 0 accepted — so an unseeded run would assert nothing
 * and pass, which is `E586` exactly.
 * ⚠⚠⚠ THE TEARDOWN IS SCOPED TO THE ROW IDS IT CREATED, never `deleteMany` by
 * inviter: a blanket delete would erase invitations somebody really sent, which
 * is *"a save deletes data it did not create"* (`E517`/`E552`/`E553`) applied to
 * a fixture. ⚠ It runs in a `finally`, so a failed assertion still cleans up.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash, randomUUID } from "node:crypto";
import {
  BOARD_MIN_SCORERS,
  GROWTH_WEIGHTS,
  boardIsShown,
  growthBoard,
  growthScore,
  rankFor,
  windowRange,
} from "@/lib/growth-score";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** ⚠ Reserved addresses only (`UNDELIVERABLE_DOMAINS`) — nothing here can mail. */
const TAG = "e599.gate";

async function main() {
  const made: string[] = [];
  try {
    /* ── seed a known month ──────────────────────────────────────────── */
    const people = await prisma.person.findMany({
      where: { is_support: false },
      select: { id: true },
      take: 3,
      orderBy: { id: "asc" },
    });
    check("0 — ⚠⚠ the fixture found three people to score (E586)", people.length === 3, `${people.length}`);
    if (people.length < 3) return;

    const now = new Date();
    const when = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 2, 12));
    /* ⚠ Deliberately NOT in score order — the seed must not hand the board its
       answer. Person 0 gets the fewest points and must end up last. */
    const plan: [string, number, number][] = [
      [people[0].id, 1, 0],
      [people[1].id, 3, 1],
      [people[2].id, 2, 2],
    ];
    for (const [personId, sent, accepted] of plan) {
      for (let i = 0; i < sent; i++) {
        const row = await prisma.colleagueInvite.create({
          data: {
            inviter_person_id: personId,
            invitee_email: `${TAG}.${personId.slice(0, 8)}.${i}@example.seed`,
            token_hash: createHash("sha256").update(randomUUID()).digest("hex"),
            expires_at: new Date(Date.now() + 7 * 86_400_000),
            created_at: when,
            ...(i < accepted ? { accepted_at: when, status: "ACCEPTED" as const } : {}),
          },
          select: { id: true },
        });
        made.push(row.id);
      }
    }

    /* ── 1 · IT HAS INPUTS (`E586`) ──────────────────────────────────── */
    const board = await growthBoard("month", now);
    check(
      "1 — ⚠⚠⚠ the board has rows — a board with none proves nothing (E586)",
      board.length > 0,
      `${board.length} rows`
    );
    check(
      "1 — every seeded inviter reached the board",
      plan.every(([id]) => board.some((r) => r.personId === id)),
      board.map((r) => r.personId.slice(0, 8)).join(", ")
    );

    /* ── 2 · ⚠⚠⚠ THE ORDER **IS** `growthScore` SORTED ───────────────── */
    for (const row of board) {
      /* ⚠ RE-ASKED INDEPENDENTLY. The board computes its own totals; this
         asks the single scorer again and requires agreement, which is what
         makes "one function" an assertion rather than a comment. */
      const direct = await growthScore(row.personId, "month", now);
      check(
        `2 — row #${row.rank} agrees with growthScore (${row.points})`,
        direct.points === row.points &&
          direct.invited === row.invited &&
          direct.joined === row.joined,
        `board ${row.points}/${row.invited}/${row.joined} vs direct ${direct.points}/${direct.invited}/${direct.joined}`
      );
    }
    const points = board.map((r) => r.points);
    check(
      "2 — ⚠⚠ the sequence is non-increasing, for EVERY row",
      points.every((p, i) => i === 0 || points[i - 1] >= p),
      points.join(" ")
    );
    check(
      "2 — ranks are 1..n with no gaps",
      board.every((r, i) => r.rank === i + 1),
      board.map((r) => r.rank).join(",")
    );
    /* ⚠⚠ AND THE SEED'S OWN SHAPE IS THE COUNTER-CASE: person 0 was given the
       FEWEST points and must be LAST among the three. If the board ever
       returned insertion order, this is what would catch it. */
    const seeded = board.filter((r) => plan.some(([id]) => id === r.personId));
    check(
      "2 — ⚠⚠⚠ COUNTER-CASE: the lowest-scoring seeded inviter ranks last of the three",
      seeded.length === 3 && seeded[2].personId === people[0].id,
      seeded.map((r) => `${r.personId.slice(0, 8)}:${r.points}`).join(" ")
    );

    /* ── 3 · THE WEIGHTS ARE THE CONSTANT'S, NOT THE BOARD'S ─────────── */
    const one = board.find((r) => r.personId === people[1].id);
    check(
      "3 — points are invited×INVITED + joined×JOINED",
      !!one &&
        one.points ===
          one.invited * GROWTH_WEIGHTS.INVITED + one.joined * GROWTH_WEIGHTS.JOINED,
      one ? `${one.invited}×${GROWTH_WEIGHTS.INVITED} + ${one.joined}×${GROWTH_WEIGHTS.JOINED} ≠ ${one.points}` : "row missing"
    );
    /* ⚠ `null` MEANS NOT MEASURABLE, NEVER 0 — the rule the page renders. */
    check("3 — ⚠⚠ active is null, not 0", one?.active === null, String(one?.active));
    /* ⚠⚠⚠ INVITED MUST STAY THE SMALLEST WEIGHT (ruling 1). A tuning pass that
       lifts it above JOINED re-opens the farming hole Scott named. */
    check(
      "3 — ⚠⚠⚠ INVITED is worth less than JOINED — sends must never out-earn joins",
      GROWTH_WEIGHTS.INVITED < GROWTH_WEIGHTS.JOINED,
      `${GROWTH_WEIGHTS.INVITED} vs ${GROWTH_WEIGHTS.JOINED}`
    );

    /* ── 4 · THE WINDOW IS A REAL BOUNDARY ───────────────────────────── */
    const thisM = windowRange("month", now);
    const lastM = windowRange("last-month", now);
    check(
      "4 — ⚠⚠ last month ends exactly where this month begins",
      !!lastM.to && !!thisM.from && lastM.to.getTime() === thisM.from.getTime(),
      `${lastM.to?.toISOString()} vs ${thisM.from?.toISOString()}`
    );
    check("4 — all-time is unbounded", windowRange("all", now).from === null);
    /* ⚠ The seeded rows are all in THIS month, so last month must be empty of
       them — proof the range filters rather than being decorative. */
    const prev = await growthBoard("last-month", now);
    check(
      "4 — ⚠⚠⚠ the seeded month does not leak into last month's board",
      plan.every(([id]) => !prev.some((r) => r.personId === id)),
      prev.map((r) => r.personId.slice(0, 8)).join(", ")
    );
    /* ═══ 5 · ⚠⚠⚠ A RANK EXISTS ONLY WHEN THE BOARD DOES (ruling 6) ═══════
       ⚠ SCOTT, AT THE WS-C GATE: *"When the board is hidden (fewer than 3
       people with a score), the Grow card one-liner and the Grow page show no
       rank… Assert both cases."*
       ⚠⚠ BOTH CASES ARE ASSERTED AGAINST THE SAME BOARD, by slicing it — a
       fixture that could only produce one of them would prove half the rule. */
    {
      const top = board[0];
      check(
        "5 — the seeded board is shown (3 or more scorers)",
        boardIsShown(board) && board.length >= BOARD_MIN_SCORERS,
        `${board.length} scorers`
      );
      /* ⚠ CASE A — BOARD SHOWN: the leader has a rank, and it is 1. */
      check(
        "5 — ⚠⚠ SHOWN: the top scorer has a rank",
        rankFor(board, top.personId) === 1,
        String(rankFor(board, top.personId))
      );
      /* ⚠⚠⚠ CASE B — BOARD HIDDEN: the SAME person, on a board of two, has
         NO rank. `#1 of 2` on a board nobody is shown is a standing earned
         against nobody, which is the whole point of the ruling. */
      const tooFew = board.slice(0, BOARD_MIN_SCORERS - 1);
      check(
        "5 — ⚠⚠⚠ HIDDEN: the same top scorer has NO rank on a short board",
        !boardIsShown(tooFew) && rankFor(tooFew, top.personId) === null,
        `shown=${boardIsShown(tooFew)} rank=${rankFor(tooFew, top.personId)}`
      );
      /* ⚠ AND AN EMPTY BOARD IS HIDDEN TOO — the live case on real data. */
      check(
        "5 — HIDDEN: an empty board shows nothing and ranks nobody",
        !boardIsShown([]) && rankFor([], top.personId) === null
      );
      /* ⚠⚠ THE THRESHOLD IS THE LIB'S, NOT THE GATE'S — a page that restated
         `>= 3` could drift from the rule without failing here. */
      check("5 — the threshold is three", BOARD_MIN_SCORERS === 3, String(BOARD_MIN_SCORERS));
    }

  } finally {
    /* ⚠⚠⚠ SCOPED TO THE IDS THIS RUN CREATED, and in a `finally` so a failed
       assertion still leaves the database as it found it. */
    if (made.length) {
      const removed = await prisma.colleagueInvite.deleteMany({ where: { id: { in: made } } });
      console.log(`check:growth-board — teardown removed ${removed.count} of ${made.length} seeded rows`);
    }
    await prisma.$disconnect();
  }
}

function report() {
  if (failures.length) {
    console.error(`\ncheck:growth-board — ${failures.length} FAILED, ${pass} passed\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`check:growth-board — ${pass}/${pass} passed`);
}

main().then(report).catch((e) => {
  console.error(e);
  process.exit(1);
});
