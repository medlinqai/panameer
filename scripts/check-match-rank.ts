/**
 * `check:match-rank` — growth breaks the tie, and match still comes first
 * (`P2-A2-E600` WS-E). `npm run check:match-rank`.
 *
 * ── ⚠⚠⚠ GATED BY SHAPE, ON THE REAL SORT ─────────────────────────────────
 *
 * ⚠ Scott: *"two providers with equal match weight and equal overlap,
 * different growth scores — the higher one ranks first. Count > 0. Tear down
 * scoped to the rows you create."*
 * ⚠⚠ IT ASSERTS THE COMPARATOR `matchProvidersFor` ACTUALLY USES, not a copy of
 * it — the ordering rule is imported, so a change to the sort changes this test
 * rather than leaving it agreeing with a stale duplicate.
 * ⚠⚠⚠ AND IT ASSERTS THE **PRECEDENCE**, WHICH IS THE HALF THAT MATTERS MOST:
 * a better-matched provider must NEVER be pushed below a worse one by growth.
 * Scott's rule is that growth replaces the NAME tie-break and nothing else.
 *
 * ⚠ NO DATABASE. The comparator is pure, so the fixture is three plain objects
 * — which is also what lets it assert the counter-case (a worse match with a
 * huge growth score still loses) without seeding a work request.
 */
import { rankMatchedProviders } from "@/lib/work-request-match";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

type Row = { personId: string; name: string; matchWeight: number; relevantSkills: number };
const rank = (rows: Row[], growth: Record<string, number>) =>
  rankMatchedProviders(rows, new Map(Object.entries(growth))).map((r) => r.personId);

/* ═══ 1 · ⚠⚠ EQUAL MATCH, EQUAL OVERLAP, DIFFERENT GROWTH ═════════════════ */
{
  /* ⚠ `aaa` SORTS FIRST BY NAME AND HAS THE LOWER GROWTH. If growth were
     ignored, or applied below the name, `aaa` would lead — so this fixture
     fails loudly rather than passing by luck. */
  const rows: Row[] = [
    { personId: "p-low", name: "aaa", matchWeight: 50, relevantSkills: 3 },
    { personId: "p-high", name: "zzz", matchWeight: 50, relevantSkills: 3 },
  ];
  const order = rank(rows, { "p-low": 10, "p-high": 200 });
  check(
    "1 — ⚠⚠⚠ equal match and equal overlap: the higher growth ranks first",
    order[0] === "p-high",
    order.join(" → ")
  );
  check("1 — and the count is > 0 (E586)", order.length > 0, `${order.length}`);
  /* ⚠ THE COUNTER-CASE: with growth EQUAL, the name tie-break returns. */
  const tied = rank(rows, { "p-low": 10, "p-high": 10 });
  check(
    "1 — ⚠ with growth equal, name is still the final tie-break",
    tied[0] === "p-low",
    tied.join(" → ")
  );
}

/* ═══ 2 · ⚠⚠⚠ MATCH STAYS STRICTLY FIRST ══════════════════════════════════ */
{
  /* ⚠⚠ THE WHOLE SAFETY PROPERTY IN ONE FIXTURE: a worse match with an absurd
     growth score must still lose. If growth ever moves above `matchWeight`,
     this is what says so. */
  const rows: Row[] = [
    { personId: "p-worse", name: "aaa", matchWeight: 10, relevantSkills: 1 },
    { personId: "p-better", name: "zzz", matchWeight: 90, relevantSkills: 1 },
  ];
  const order = rank(rows, { "p-worse": 100_000, "p-better": 0 });
  check(
    "2 — ⚠⚠⚠ a better match is NEVER pushed below a worse one by growth",
    order[0] === "p-better",
    order.join(" → ")
  );
  /* ⚠ AND OVERLAP STILL OUTRANKS GROWTH — the middle term is untouched. */
  const overlap: Row[] = [
    { personId: "p-thin", name: "aaa", matchWeight: 50, relevantSkills: 1 },
    { personId: "p-broad", name: "zzz", matchWeight: 50, relevantSkills: 4 },
  ];
  check(
    "2 — ⚠⚠ skill overlap still outranks growth",
    rank(overlap, { "p-thin": 100_000, "p-broad": 0 })[0] === "p-broad"
  );
}

/* ═══ 3 · A MISSING SCORE IS ZERO, NOT A CRASH ════════════════════════════ */
{
  const rows: Row[] = [
    { personId: "p-known", name: "zzz", matchWeight: 50, relevantSkills: 2 },
    { personId: "p-unknown", name: "aaa", matchWeight: 50, relevantSkills: 2 },
  ];
  /* ⚠⚠ `p-unknown` IS ABSENT FROM THE MAP. It must score 0 and lose to a
     positive score — not throw, and not win by `undefined` comparison. */
  const order = rank(rows, { "p-known": 5 });
  check(
    "3 — ⚠ a person with no growth row scores 0 and does not win",
    order[0] === "p-known",
    order.join(" → ")
  );
}

/* ═══ 4 · THE ORDER IS STABLE ═════════════════════════════════════════════ */
{
  const rows: Row[] = [
    { personId: "a", name: "aaa", matchWeight: 50, relevantSkills: 2 },
    { personId: "b", name: "bbb", matchWeight: 50, relevantSkills: 2 },
    { personId: "c", name: "ccc", matchWeight: 50, relevantSkills: 2 },
  ];
  const g = { a: 1, b: 1, c: 1 };
  /* ⚠⚠ IDENTICAL INPUT, IDENTICAL OUTPUT, TWICE. A list that reshuffles between
     renders reads as broken even when every row is correct. */
  check(
    "4 — ⚠⚠ the order is stable across repeated calls",
    rank(rows, g).join() === rank(rows, g).join(),
    rank(rows, g).join(" → ")
  );
}

if (failures.length) {
  console.error(`\ncheck:match-rank — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:match-rank — ${pass}/${pass} passed`);
