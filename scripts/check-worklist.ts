/**
 * ── `check:worklist` (`P2-ALL-E802`) ────────────────────────────────────────
 *
 * ⚠ **SCOTT, 2026-10-03:** *"Waiting on You lists 'A buyer sent you a skills
 * test' 5 times — show each pending test once."*
 *
 * ⚠⚠⚠ **THE MEASUREMENT CAME FIRST AND IT CHANGED THE FIX.** Those rows were
 * NOT duplicates: eighteen `work.test_requested` notifications, each with its
 * own `dedupe_key`, `entity_id` and href. ⚠ Every one was ORPHANED — its
 * `TestRequest` and `WorkRequest` were gone, so no action a member can take
 * could ever clear it. That half is fixed in `check-interviews.ts`, whose
 * teardown had omitted this one event in three separate places.
 * ⚠⚠ This gate holds the other half: identical titles collapse, and the count
 * beside them is the TRUE total rather than a tally of the rows fetched.
 */
import { groupWorklist } from "@/lib/worklist";

const failures: string[] = [];
let pass = 0;
function check(name: string, cond: boolean, msg: string) {
  if (cond) pass++;
  else failures.push(`${name} — ${msg}`);
}

const d = (iso: string) => new Date(iso);
const row = (id: string, title: string, iso: string, href = `/x/${id}`) => ({
  id,
  title,
  body: null as string | null,
  href,
  created_at: d(iso),
});

/** Oldest first, as `getWorklist` orders them. */
const rows = [
  row("a", "A buyer sent you a skills test", "2026-09-27T12:27:46Z"),
  row("b", "A buyer sent you a skills test", "2026-09-27T12:27:49Z"),
  row("c", "New message from Daniel Damasceno", "2026-09-28T09:00:00Z"),
  row("d", "A buyer sent you a skills test", "2026-09-29T20:11:09Z"),
];
/**
 * ⚠⚠⚠ THE MAP SAYS 18 WHILE ONLY 3 OF THOSE ROWS ARE PRESENT, ON PURPOSE. That
 * is the real shape — the caller reads a bounded slice and the `groupBy` knows
 * the total — and it is what makes §2 a real assertion: a version that counted
 * the rows it holds would answer 3, and 3 is a believable number.
 */
const exact = new Map([
  ["A buyer sent you a skills test", 18],
  ["New message from Daniel Damasceno", 1],
]);

const out = groupWorklist(rows, exact, 5);

check(
  "1 — identical titles collapse to one item",
  out.length === 2,
  `got ${out.length} items: ${JSON.stringify(out.map((o) => o.title))}`,
);
check(
  "2 — the count is the TRUE total, not the rows fetched",
  out[0]?.count === 18,
  `got ${out[0]?.count} — a tally of the three rows present would read 3`,
);
check(
  "3 — a singleton still carries a count, and it is 1",
  out[1]?.count === 1,
  `got ${out[1]?.count}; the field is never optional, so no caller can forget it`,
);
/**
 * ⚠⚠ THE OLDEST ROW WINS. The list answers *"what have I failed to do"*, so the
 * thing that has waited longest is the thing that has been failed longest — and
 * its href is the one that clears it.
 */
check(
  "4 — the oldest row supplies the id, href and date",
  out[0]?.id === "a" && out[0]?.href === "/x/a" && out[0]?.at.toISOString().startsWith("2026-09-27T12:27:46"),
  `got id ${out[0]?.id}, href ${out[0]?.href}, at ${out[0]?.at.toISOString()}`,
);
check(
  "5 — different titles are NOT merged",
  out.some((o) => o.title.startsWith("New message")),
  "grouping must be by title, not by anything coarser",
);
/**
 * ⚠⚠⚠ `take` BOUNDS ITEMS, NOT ROWS. If it cut the rows, one repeated title
 * could fill the budget and hide every other kind of work — the failure mode is
 * the opposite of the one being fixed, and just as quiet.
 */
const many = [
  row("r1", "same", "2026-09-01T00:00:00Z"),
  row("r2", "same", "2026-09-01T00:00:01Z"),
  row("r3", "same", "2026-09-01T00:00:02Z"),
  row("r4", "other", "2026-09-01T00:00:03Z"),
];
const two = groupWorklist(many, new Map([["same", 3], ["other", 1]]), 2);
check(
  "6 — a repeated title cannot crowd out another kind of work",
  two.length === 2 && two[1]?.title === "other",
  `got ${JSON.stringify(two.map((t) => `${t.title}×${t.count}`))}`,
);
check(
  "7 — and `take` still caps the items",
  groupWorklist(many, new Map([["same", 3], ["other", 1]]), 1).length === 1,
  "one item requested, one item returned",
);
check(
  "8 — an empty list is empty, not a crash",
  groupWorklist([], new Map(), 5).length === 0,
  "nothing waiting is a legitimate state; the panel renders nothing for it",
);
/**
 * ⚠ A title missing from the map falls back to 1 rather than to 0 or NaN. A
 * figure of 0 beside a row that is plainly there would be the "uncountable vs
 * real zero" confusion the 2026-09-23 counting rules exist to prevent.
 */
check(
  "9 — a title absent from the count map reads 1, never 0",
  groupWorklist([row("z", "unmapped", "2026-09-01T00:00:00Z")], new Map(), 5)[0]?.count === 1,
  "a row that exists must never print as zero of itself",
);

if (failures.length) {
  console.error(`\ncheck:worklist — ${failures.length} FAILED, ${pass} passed`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\ncheck:worklist — ${pass}/${pass} passed`);
