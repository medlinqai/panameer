/**
 * ── `check:plan` — THE PLAN TOOL'S GATE (`P2-ALL-E783`) ─────────────────────
 *
 * Two halves, deliberately:
 *
 *  §1–§6  **PURE.** Numbering, lateness, readiness and placement are proven
 *         against fixtures with no database and no server. ⚠ Every assertion
 *         here is called with real inputs — `E586` is the lesson that a gate
 *         reporting success with nothing to read is worse than a red one.
 *
 *  §7–§13 **STRUCTURAL, against the real database**, because the two-level rule,
 *         the cascade and the dense `sort` invariant live in SQL and in one
 *         module, and a fixture cannot prove either.
 *
 * ⚠⚠ IT LEAVES NO DATA. Everything is created under a scratch owner key and
 * removed in a `finally`; §13 then re-counts the nine live tables and fails if
 * any of them moved. ⚠ That check exists because a teardown that silently
 * skipped a column is exactly how `check:work-tracker` moved `/status`'s
 * current phase twice (`E765`).
 */
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import {
  MILESTONE_MARK,
  buildTree,
  countableRows,
  flattenTree,
  isLate,
  planSpan,
  readiness,
  releaseReadiness,
  type PlanRowLike,
} from "@/lib/plan/model";
import {
  PlanError,
  addRow,
  copyPlan,
  deleteRow,
  ensurePlan,
  getPlan,
  indentRow,
  insertAfter,
  moveRow,
  outdentRow,
  restoreRows,
  updateRow,
} from "@/lib/plan/store";
import { TEMPLATE_JOURNEYS, applyPanameerTemplate } from "@/lib/plan/template";

const failures: string[] = [];
let pass = 0;
function check(name: string, cond: boolean, msg: string) {
  if (cond) pass++;
  else failures.push(`${name} — ${msg}`);
}

/** The scratch keys. ⚠ Prefixed so a leftover is identifiable at a glance. */
const SCRATCH = "check-plan-scratch";
const SCRATCH_COPY = "check-plan-scratch-copy";

const viewer = { userId: "00000000-0000-4000-8000-00000000e783" } as Viewer;

const LIVE_TABLES = [
  "workTrackerTaskState",
  "workTrackerGateState",
  "workTrackerPhaseDate",
  "workTrackerRelease",
  "workTrackerShipped",
  "workTrackerFollower",
  "workTrackerCustomTask",
  "ticketEvent",
  "ticketMessage",
] as const;

async function liveCounts() {
  const out: Record<string, number> = {};
  for (const t of LIVE_TABLES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    out[t] = await (prisma as any)[t].count();
  }
  return out;
}

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function row(p: Partial<PlanRowLike> & { id: string }): PlanRowLike {
  return {
    parent_id: null,
    sort: 0,
    type: "task",
    title: p.id,
    start_date: null,
    end_date: null,
    status: "Planned",
    ...p,
  };
}

async function main() {
  const before = await liveCounts();

  /* ── §1 numbering ─────────────────────────────────────────────────────── */

  /**
   * ⚠⚠ THIS IS SCOTT'S OWN OUTLINE AND IT IS THE CASE THAT MATTERS: the
   * milestone sits between `Prove` and `Launch`, and `Launch` must be **5**.
   */
  const outline = [
    row({ id: "define", type: "phase", sort: 0 }),
    row({ id: "design", type: "phase", sort: 1 }),
    row({ id: "build", type: "phase", sort: 2 }),
    row({ id: "prove", type: "phase", sort: 3 }),
    row({ id: "r1", type: "milestone", sort: 4 }),
    row({ id: "launch", type: "phase", sort: 5 }),
    row({ id: "operate", type: "phase", sort: 6 }),
  ];
  const tree = buildTree(outline);
  const numbers = tree.map((n) => n.number);
  check(
    "1a — a milestone consumes no number",
    numbers.join(",") === `1,2,3,4,${MILESTONE_MARK},5,6`,
    `got ${numbers.join(",")} — Launch must be 5, not 6`,
  );
  check(
    "1b — the numbering fixture actually contains a milestone",
    outline.some((r) => r.type === "milestone") && numbers.includes(MILESTONE_MARK),
    "the §1a fixture has no milestone, so it cannot fail — ruling 11",
  );

  const withKids = [
    row({ id: "build", type: "phase", sort: 0 }),
    ...TEMPLATE_JOURNEYS.map((j, i) =>
      row({ id: `j${i}`, parent_id: "build", sort: i, title: j }),
    ),
  ];
  const kidNumbers = buildTree(withKids)[0].children.map((c) => c.number);
  check(
    "1c — children number from their parent",
    kidNumbers[0] === "1.1" && kidNumbers[9] === "1.10",
    `got ${kidNumbers.join(",")}`,
  );
  check(
    "1d — a child milestone shows the mark, not a number",
    buildTree([
      row({ id: "p", type: "phase", sort: 0 }),
      row({ id: "a", parent_id: "p", sort: 0 }),
      row({ id: "m", parent_id: "p", sort: 1, type: "milestone" }),
      row({ id: "b", parent_id: "p", sort: 2 }),
    ])[0].children.map((c) => c.number).join(",") === `1.1,${MILESTONE_MARK},1.2`,
    "a milestone under a phase must not take 1.2",
  );
  check(
    "1e — `sort` orders, not insertion order",
    buildTree([row({ id: "b", sort: 5 }), row({ id: "a", sort: 1 })]).map((n) => n.id).join(",") === "a,b",
    "rows must render in `sort` order",
  );
  check(
    "1f — flatten puts a parent before its children",
    flattenTree(buildTree(withKids)).map((n) => n.id).slice(0, 2).join(",") === "build,j0",
    "depth-first, parents first",
  );

  /* ── §2 lateness ──────────────────────────────────────────────────────── */

  const today = d("2026-10-03");
  check("2a — past end, not Done = late", isLate(row({ id: "x", end_date: d("2026-10-01") }), today), "should be late");
  check(
    "2b — past end but Done = not late",
    !isLate(row({ id: "x", end_date: d("2026-10-01"), status: "Done" }), today),
    "Done is never late",
  );
  check("2c — no end date = not late", !isLate(row({ id: "x" }), today), "an unscheduled row cannot be late");
  check(
    "2d — ending today is not late",
    !isLate(row({ id: "x", end_date: d("2026-10-03") }), today),
    "the last day is still the day",
  );
  check(
    "2e — a future end is not late",
    !isLate(row({ id: "x", end_date: d("2026-12-01") }), today),
    "a future date cannot be late",
  );

  /* ── §3 readiness ─────────────────────────────────────────────────────── */

  const mixed = [
    row({ id: "p1", type: "phase", sort: 0, status: "Done" }),
    row({ id: "t1", parent_id: "p1", sort: 0, status: "Done" }),
    row({ id: "t2", parent_id: "p1", sort: 1, status: "Planned" }),
    row({ id: "p2", type: "phase", sort: 1, status: "Planned" }),
    row({ id: "m", type: "milestone", sort: 2, status: "Planned" }),
  ];
  const r = readiness(mixed);
  check(
    "3a — a phase with children is not counted, nor is a milestone",
    r.total === 3 && r.done === 1 && r.percent === 33,
    `got done ${r.done} of ${r.total} = ${r.percent}% — expected 1 of 3 = 33%`,
  );
  check(
    "3b — a Done container would have changed the answer",
    mixed.some((x) => x.type === "phase" && x.status === "Done" && mixed.some((y) => y.parent_id === x.id)),
    "the §3a fixture has no Done parent, so counting parents would pass too — ruling 11",
  );
  check(
    "3c — an empty plan is uncountable, not 0%",
    readiness([]).percent === null && readiness([]).total === 0,
    "percent must be null so a dash and a real zero cannot look the same",
  );
  check(
    "3d — a real zero is zero, in ink",
    readiness([row({ id: "t", status: "Planned" })]).percent === 0,
    "one planned row is 0%, not null",
  );
  check(
    "3e — an empty phase counts as work",
    readiness([row({ id: "p", type: "phase" })]).total === 1,
    "a phase with no children yet is still a row of work",
  );
  check(
    "3f — countableRows and readiness agree",
    countableRows(mixed).length === r.total,
    "one definition, one place",
  );

  const rel = "rel-1";
  const tagged = [
    row({ id: "a", release_id: rel, status: "Done" }),
    row({ id: "b", release_id: rel, status: "Planned" }),
    row({ id: "c", release_id: null, status: "Planned" }),
  ];
  const rr = releaseReadiness(tagged, rel);
  check(
    "3g — release readiness counts only its own rows",
    rr.total === 2 && rr.done === 1 && rr.percent === 50,
    `got ${rr.done}/${rr.total} = ${rr.percent}%`,
  );
  check(
    "3h — an untagged release is uncountable",
    releaseReadiness(tagged, "nobody").percent === null,
    "a release with no rows must not read 0%",
  );

  /* ── §4 span ──────────────────────────────────────────────────────────── */

  check("4a — no dates means nothing to draw", planSpan([row({ id: "x" })]) === null, "must be null, not epoch→now");
  const span = planSpan([
    row({ id: "a", start_date: d("2026-08-15"), end_date: d("2026-09-01") }),
    row({ id: "b", start_date: d("2026-09-20"), end_date: d("2026-11-01") }),
  ])!;
  check(
    "4b — the span is the outer edges",
    span.start.getTime() === d("2026-08-15").getTime() && span.end.getTime() === d("2026-11-01").getTime(),
    "min start to max end",
  );

  /* ── §5 placement ─────────────────────────────────────────────────────── */

  const sibs = [{ id: "a" }, { id: "b" }, { id: "c" }];
  check(
    "5a — insertAfter places directly after the named row",
    insertAfter(sibs, { id: "new" }, "a").map((s) => s.id).join(",") === "a,new,b,c",
    "must land immediately after `a`",
  );
  check(
    "5b — no afterId appends",
    insertAfter(sibs, { id: "new" }, null).map((s) => s.id).join(",") === "a,b,c,new",
    "append to the end",
  );
  check(
    "5c — an unknown afterId appends rather than throwing",
    insertAfter(sibs, { id: "new" }, "gone").map((s) => s.id).join(",") === "a,b,c,new",
    "a stale id must not lose the row",
  );
  check(
    "5d — a row already in the list is moved, not duplicated",
    insertAfter(sibs, { id: "c" }, "a").map((s) => s.id).join(",") === "a,c,b",
    "re-placing must not duplicate",
  );

  /* ── §6–§12 the database half ─────────────────────────────────────────── */

  try {
    await cleanup();
    const plan = await ensurePlan(SCRATCH, "scratch", viewer);

    /* §6 add + dense sort */
    const a = await addRow({ planId: plan.id, type: "phase", title: "A" }, viewer);
    const b = await addRow({ planId: plan.id, type: "phase", title: "B" }, viewer);
    const mid = await addRow({ planId: plan.id, type: "phase", title: "Mid", afterId: a.id }, viewer);
    const rows = (await getPlan(SCRATCH))!.rows;
    check(
      "6a — afterId inserts in the middle",
      rows.map((x) => x.title).join(",") === "A,Mid,B",
      `got ${rows.map((x) => x.title).join(",")}`,
    );
    check(
      "6b — sorts are dense 0..n-1 after an insert",
      rows.map((x) => x.sort).join(",") === "0,1,2",
      `got ${rows.map((x) => x.sort).join(",")} — a gap or a duplicate makes order arbitrary`,
    );

    /* §7 indent / outdent */
    const indented = await indentRow(mid.id, viewer);
    check("7a — indent goes under the row above", indented.parent_id === a.id, "Mid must become a child of A");
    check(
      "7b — a row already at depth 1 cannot indent further, and says so",
      await refusesBecause(() => indentRow(mid.id, viewer), "two levels deep"),
      "the message must name the two-level rule, not `no row above`, which is false for a child row",
    );
    const first = await addRow({ planId: plan.id, type: "phase", title: "First", afterId: null }, viewer);
    await moveRow(first.id, { index: 0 }, viewer);
    check(
      "7c — the top row has nothing above it to indent under",
      await refusesBecause(async () => indentRow((await topRows())[0].id, viewer), "no row above"),
      "there is no row above the first one",
    );
    const stone = await addRow({ planId: plan.id, type: "milestone", title: "◆" }, viewer);
    const afterStone = await addRow({ planId: plan.id, type: "task", title: "After" }, viewer);
    check(
      "7d — nothing indents under a milestone",
      await refusesBecause(() => indentRow(afterStone.id, viewer), "milestone marks a date"),
      "a milestone marks a date",
    );
    const out = await outdentRow(mid.id, viewer);
    check("7e — outdent returns to the top level", out.parent_id === null, "parent must be null");
    const topOrder = (await topRows()).map((x) => x.title);
    check(
      "7f — outdent lands directly after its old parent",
      topOrder[topOrder.indexOf("A") + 1] === "Mid",
      `got ${topOrder.join(",")} — Mid must sit immediately after A`,
    );
    check(
      "7g — a parent with children cannot be indented",
      await (async () => {
        const kid = await addRow({ planId: plan.id, parentId: b.id, title: "kid" }, viewer);
        const refused = await refusesBecause(() => indentRow(b.id, viewer), "two levels deep");
        await deleteRow(kid.id, viewer);
        return refused;
      })(),
      "indenting a phase that has tasks would make three levels",
    );

    /* §8 move */
    const beforeMove = (await topRows()).map((x) => x.title);
    await moveRow(stone.id, { delta: -1 }, viewer);
    const afterMove = (await topRows()).map((x) => x.title);
    check(
      "8a — delta -1 moves a row up one slot",
      afterMove.indexOf("◆") === beforeMove.indexOf("◆") - 1,
      `${beforeMove.join(",")} → ${afterMove.join(",")}`,
    );
    const firstId = (await topRows())[0].id;
    await moveRow(firstId, { delta: -1 }, viewer);
    check(
      "8b — up on the first row is a no-op, not an error",
      (await topRows())[0].id === firstId,
      "clamped, not refused",
    );
    await moveRow(firstId, { index: 999 }, viewer);
    const last = await topRows();
    check("8c — an index past the end means last", last[last.length - 1].id === firstId, "clamped to the end");
    check(
      "8d — sorts stay dense after moves",
      last.every((x, i) => x.sort === i),
      `got ${last.map((x) => x.sort).join(",")}`,
    );

    /* §9 update validation */
    check(
      "9a — an end before a start is refused",
      await refuses(() =>
        updateRow(a.id, { start_date: d("2026-10-10"), end_date: d("2026-10-01") }, viewer),
      ),
      "the range must make sense when both halves are known",
    );
    const halfOpen = await updateRow(a.id, { start_date: d("2026-10-10") }, viewer);
    check(
      "9b — half a range is allowed",
      halfOpen.start_date !== null && halfOpen.end_date === null,
      "typing the start before the end is normal",
    );
    check(
      "9c — an unknown status is refused",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await refuses(() => updateRow(a.id, { status: "Late" as any }, viewer)),
      "`Late` is computed, never stored",
    );
    check(
      "9d — a row with children cannot become a milestone",
      await (async () => {
        const kid = await addRow({ planId: plan.id, parentId: a.id, title: "k" }, viewer);
        const refused = await refuses(() => updateRow(a.id, { type: "milestone" }, viewer));
        await deleteRow(kid.id, viewer);
        return refused;
      })(),
      "a milestone is a date, not a container",
    );
    check(
      "9e — a blank owner stores null, not an empty string",
      (await updateRow(a.id, { owner: "   " }, viewer)).owner === null,
      "two spellings of absent is one too many",
    );
    check(
      "9f — negative hours are refused",
      await refuses(() => updateRow(a.id, { hours: -1 }, viewer)),
      "hours must be zero or more",
    );
    check(
      "9g — a row cannot be grafted onto another plan",
      await (async () => {
        const other = await ensurePlan(SCRATCH_COPY, "other", viewer);
        return refuses(() => addRow({ planId: other.id, parentId: a.id, title: "x" }, viewer));
      })(),
      "a parent from another plan must be refused",
    );

    /* §10 delete + undo */
    const phase = await addRow({ planId: plan.id, type: "phase", title: "Doomed" }, viewer);
    const k1 = await addRow({ planId: plan.id, parentId: phase.id, title: "k1" }, viewer);
    const k2 = await addRow({ planId: plan.id, parentId: phase.id, title: "k2" }, viewer);
    const removed = await deleteRow(phase.id, viewer);
    check(
      "10a — deleting a phase returns it and its children",
      removed.length === 3 && removed.some((x) => x.id === k1.id) && removed.some((x) => x.id === k2.id),
      `got ${removed.length} rows — an undo that loses the children is not an undo`,
    );
    check(
      "10b — the children are gone from the database",
      (await prisma.planRow.count({ where: { id: { in: [phase.id, k1.id, k2.id] } } })) === 0,
      "the cascade must take them",
    );
    const restored = await restoreRows(removed, viewer);
    check(
      "10c — undo restores every row with its original id",
      restored === 3 &&
        (await prisma.planRow.count({ where: { id: { in: [phase.id, k1.id, k2.id] } } })) === 3,
      "same rows, same ids",
    );
    const restoredTree = buildTree((await getPlan(SCRATCH))!.rows).find((n) => n.id === phase.id)!;
    check(
      "10d — undo restores the parent/child shape, not a flat list",
      restoredTree.children.length === 2,
      `got ${restoredTree.children.length} children`,
    );

    /* §11 copy */
    await prisma.planRow.deleteMany({ where: { plan: { owner_key: SCRATCH_COPY } } });
    const copied = await copyPlan(SCRATCH, SCRATCH_COPY, "copy", viewer);
    const srcRows = (await getPlan(SCRATCH))!.rows;
    const dstRows = (await getPlan(SCRATCH_COPY))!.rows;
    check(
      "11a — a copy carries every row",
      dstRows.length === srcRows.length,
      `source ${srcRows.length}, copy ${dstRows.length} (top-level copied: ${copied.copied})`,
    );
    check(
      "11b — the copy keeps the tree shape",
      dstRows.filter((x) => x.parent_id).length === srcRows.filter((x) => x.parent_id).length,
      "children must still be children",
    );
    check(
      "11c — the copy has its own row ids",
      !dstRows.some((x) => srcRows.some((y) => y.id === x.id)),
      "a copy that shares ids is not a copy",
    );
    check(
      "11d — copying onto a plan that has rows is refused",
      await refuses(() => copyPlan(SCRATCH, SCRATCH_COPY, "copy", viewer)),
      "a merge nobody asked for is unrecoverable by hand",
    );

    /* §12 template */
    await prisma.planRow.deleteMany({ where: { plan: { owner_key: SCRATCH_COPY } } });
    const target = await ensurePlan(SCRATCH_COPY, "template target", viewer);
    const applied = await applyPanameerTemplate(target.id, viewer);
    const tRows = (await getPlan(SCRATCH_COPY))!.rows;
    const tTree = buildTree(tRows);
    check(
      "12a — the template makes 7 top-level rows and 10 journeys",
      tTree.length === 7 && applied.rows === 17,
      `got ${tTree.length} top-level, ${applied.rows} rows total`,
    );
    check(
      "12b — Launch is numbered 5 in the stored template",
      tTree.find((n) => n.title === "Launch")?.number === "5",
      `got ${tTree.find((n) => n.title === "Launch")?.number} — the milestone must not take a number`,
    );
    check(
      "12c — the ten journeys sit under Build",
      tTree.find((n) => n.title === "Build")?.children.length === 10,
      "3.1 … 3.10",
    );
    const journeys = tTree.find((n) => n.title === "Build")!.children;
    check(
      "12d — Learn and Optimize are not tagged to R1",
      journeys.filter((c) => c.release_id === null).map((c) => c.title).sort().join(",") === "Learn,Optimize",
      `untagged: ${journeys.filter((c) => c.release_id === null).map((c) => c.title).join(",")}`,
    );
    check(
      "12e — the other eight ARE tagged, so §12d is a real discriminator",
      journeys.filter((c) => c.release_id !== null).length === 8,
      "if nothing were tagged, §12d would pass vacuously — ruling 11",
    );
    check(
      "12f — Launch and Operate are created unscheduled",
      tTree.filter((n) => ["Launch", "Operate"].includes(n.title)).every((n) => !n.start_date && !n.end_date),
      "no date in the database means no date on the row, never a guess",
    );
    check(
      "12g — the four dated phases ARE prefilled",
      tTree.filter((n) => ["Define", "Design", "Build", "Prove"].includes(n.title)).every((n) => !!n.start_date),
      "a prefill that prefills nothing would make §12f pass for the wrong reason",
    );
    check(
      "12h — every template row starts Planned",
      tRows.every((x) => x.status === "Planned"),
      "a status nobody set is a figure nobody measured",
    );
    check(
      "12i — the template refuses a plan that already has rows",
      await refuses(() => applyPanameerTemplate(target.id, viewer)),
      "a silent merge is unrecoverable",
    );
    check(
      "12j — no template row carries an admin note",
      tRows.every((x) => x.admin_note === null),
      "nothing private is invented by a button",
    );
  } finally {
    await cleanup();
  }

  /* ── §13 the live tables did not move ─────────────────────────────────── */

  const after = await liveCounts();
  const moved = LIVE_TABLES.filter((t) => before[t] !== after[t]);
  check(
    "13a — the nine live tracker/ticket tables are untouched",
    moved.length === 0,
    `changed: ${moved.map((t) => `${t} ${before[t]}→${after[t]}`).join(", ")}`,
  );
  check(
    "13b — the scratch plans are gone",
    (await prisma.plan.count({ where: { owner_key: { in: [SCRATCH, SCRATCH_COPY] } } })) === 0,
    "this gate must leave no data",
  );
  check(
    "13c — §13a had something to count",
    Object.values(before).some((n) => n > 0),
    "all nine tables empty would make §13a pass without proving anything — ruling 11",
  );

  if (failures.length > 0) {
    console.error(`check:plan — ${failures.length} FAILED, ${pass} passed\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`check:plan — ${pass}/${pass} passed`);
  await prisma.$disconnect();
}

/** True when the call was refused with a `PlanError`. ⚠ A call that SUCCEEDS or
 *  throws something else both fail the assertion — a bare try/catch would read
 *  an unrelated crash as the refusal we were testing for. */
async function refuses(fn: () => Promise<unknown>): Promise<boolean> {
  return (await refusal(fn)) !== null;
}

/**
 * ⚠⚠⚠ REFUSED *FOR THE STATED REASON*, AND THIS HELPER EXISTS BECAUSE THE
 * WEAKER ONE PASSED A MUTATION IT SHOULD HAVE CAUGHT.
 *
 * Deleting `indentRow`'s two-level guard left the gate at 66/66: a depth-1 row
 * is not in the top-level sibling list, so the *next* guard refused it with
 * "there is no row above this one" and the assertion was satisfied by a branch
 * it was not testing. ⚠ That is ruling 12 — it is not enough that the mutation
 * lands, the assertion under test must be the thing that catches it.
 *
 * ⚠ It is also the better product check: Tab on a task must say the plan is
 * two levels deep, not claim there is no row above it, which is false.
 */
async function refusesBecause(fn: () => Promise<unknown>, needle: string): Promise<boolean> {
  const message = await refusal(fn);
  return message !== null && message.toLowerCase().includes(needle.toLowerCase());
}

async function refusal(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    return e instanceof PlanError ? e.message : null;
  }
}

async function topRows() {
  const plan = await getPlan(SCRATCH);
  return (plan?.rows ?? []).filter((r) => !r.parent_id).sort((x, y) => x.sort - y.sort);
}

async function cleanup() {
  await prisma.plan.deleteMany({ where: { owner_key: { in: [SCRATCH, SCRATCH_COPY] } } });
}

main();
