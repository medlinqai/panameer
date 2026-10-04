import { readFileSync, readdirSync } from "fs";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import {
  MILESTONE_MARK,
  buildTree,
  countableRows,
  firstReleasedAt,
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
import { releaseProgressByCode, releaseScopeByCode } from "@/lib/plan/public";
import { TEMPLATE_JOURNEYS, applyPanameerTemplate } from "@/lib/plan/template";
import { IMPORT_COLUMNS, parseCsv, readDate, readGrid } from "@/lib/plan/import";

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
  /*
    SUPERSEDED BY SCOTT (`E809`, the 2026-10-03 mockup): the plan uses OUTLINE
    NUMBERS and every row takes a position, milestones included — `1.5 Deploy`
    is a milestone and still holds 1.5. `number` is the position; `mark` is what
    a number column prints.
    Quoted, not deleted:
    //   "1a - a milestone consumes no number"
    //   numbers.join(",") === `1,2,3,4,${MILESTONE_MARK},5,6`
  */
  check(
    "1a — every row takes an outline position, milestones included",
    numbers.join(",") === "1,2,3,4,5,6,7",
    `got ${numbers.join(",")} — the milestone holds 5 and Launch is 6`,
  );
  check(
    "1b — and a milestone PRINTS the mark rather than its number",
    tree.map((n) => n.mark).join(",") === `1,2,3,4,${MILESTONE_MARK},6,7`,
    `got ${tree.map((n) => n.mark).join(",")} — position 5 must print ${MILESTONE_MARK}`,
  );
  check(
    "1b2 — the numbering fixture actually contains a milestone",
    outline.some((r) => r.type === "milestone") && tree.some((n) => n.mark === MILESTONE_MARK),
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
  /*
    SUPERSEDED BY SCOTT (`E809`). Quoted, not deleted:
    //   "1d - a child milestone shows the mark, not a number"
    //   children numbers === `1.1,${MILESTONE_MARK},1.2`
  */
  {
    const kids = buildTree([
      row({ id: "p", type: "phase", sort: 0 }),
      row({ id: "a", parent_id: "p", sort: 0 }),
      row({ id: "m", parent_id: "p", sort: 1, type: "milestone" }),
      row({ id: "b", parent_id: "p", sort: 2 }),
    ])[0].children;
    check(
      "1d — a child milestone holds its position and prints the mark",
      kids.map((c) => c.number).join(",") === "1.1,1.2,1.3" &&
        kids.map((c) => c.mark).join(",") === `1.1,${MILESTONE_MARK},1.3`,
      `numbers ${kids.map((c) => c.number).join(",")} / marks ${kids.map((c) => c.mark).join(",")}`,
    );
  }
  check(
    "1e — a THIRD level numbers from its stage",
    buildTree([
      row({ id: "rel", type: "release", sort: 0 }),
      row({ id: "st", parent_id: "rel", type: "phase", sort: 2 }),
      row({ id: "t1", parent_id: "st", sort: 0 }),
      row({ id: "t2", parent_id: "st", sort: 1 }),
    ])[0].children[0].children.map((c) => c.number).join(",") === "1.1.1,1.1.2",
    "the mockup's 1.3.1 … shape",
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

  /* ── §3 (cont.) HALF CREDIT FOR IN PROGRESS — `E797` ───────────────────── */
  /*
    ⚠⚠⚠ THE §3a FIXTURE HAS NO `In progress` ROW, SO IT CANNOT TEST THIS RULE
    AT ALL — it passed before the change and after it, unaltered. ⚠ That is
    ruling 12 in miniature: an assertion the mutation cannot fail. These checks
    exist because the rule needed a fixture that can tell the versions apart.
  */
  const weighted = [
    row({ id: "w-d1", sort: 0, status: "Done" }),
    row({ id: "w-d2", sort: 1, status: "Done" }),
    row({ id: "w-i1", sort: 2, status: "In progress" }),
    row({ id: "w-b1", sort: 3, status: "Blocked" }),
    row({ id: "w-pl", sort: 4, status: "Planned" }),
  ];
  const w = readiness(weighted);
  check(
    "3i — (Done + half of In progress) over countable rows",
    w.done === 2 && w.moving === 1 && w.total === 5 && w.percent === 50,
    `got done ${w.done} moving ${w.moving} of ${w.total} = ${w.percent}% — expected 2, 1, 5, 50%`,
  );
  /*
    ⚠⚠ EVERY FIXTURE VALUE IS DIFFERENT — 2, 1, 5, 50 — so no two of them can
    agree by accident (ruling 11, the two-zeros case).
    ⚠⚠⚠ AND THE NUMBER DISCRIMINATES BETWEEN ALL THREE CANDIDATE RULES: full
    credit for In progress would read 60%, no credit 40%, half credit 50%.
  */
  check(
    "3j — Blocked and Planned earn nothing, and In progress earns half",
    readiness([row({ id: "x", status: "In progress" })]).percent === 50 &&
      readiness([row({ id: "x", status: "Blocked" })]).percent === 0 &&
      readiness([row({ id: "x", status: "Planned" })]).percent === 0,
    "one row of each status, alone: 50 / 0 / 0",
  );
  check(
    "3k — the COUNTS stay whole, and only the percentage is halved",
    Number.isInteger(w.done) && Number.isInteger(w.moving),
    `"${w.done} done · ${w.moving} moving" must stay countable back to rows`,
  );
  check(
    "3l — a half rounds like any other figure",
    readiness([
      row({ id: "r1", sort: 0, status: "In progress" }),
      row({ id: "r2", sort: 1, status: "Planned" }),
      row({ id: "r3", sort: 2, status: "Planned" }),
    ]).percent === 17,
    "0.5 of 3 is 16.67, printed as 17",
  );
  const movingRel = [
    row({ id: "mr-a", release_id: rel, status: "Done" }),
    row({ id: "mr-b", release_id: rel, status: "In progress" }),
  ];
  check(
    "3m — a release's readiness uses the same rule",
    releaseReadiness(movingRel, rel).percent === 75,
    "1 done + half of 1 moving, over 2 rows",
  );

  /* ── §3.5 THE LIVE PLAN IS OFF LIMITS TO TESTS (`P2-ALL-E804`) ───────── */
  /*
    Scott, 2026-10-03: "no test may read or write the panameer-build plan, ever
    again." The enforcement is structural — the specs use their own throwaway
    plan and the suite's server points at it — and this is the tripwire that
    fails if the literal comes back.
  */
  {
    const LIVE = ["panameer", "build"].join("-");
    const strip = (src: string) =>
      src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
    const files = readdirSync("e2e-plan").filter((f) => f.endsWith(".spec.ts"));
    check(
      "3.5a — there are plan specs to check",
      files.length >= 5,
      `found ${files.length} spec files in e2e-plan/`,
    );
    const offenders = files.filter((f) =>
      strip(readFileSync(`e2e-plan/${f}`, "utf8")).includes(LIVE),
    );
    check(
      "3.5b — no plan spec names the live plan",
      offenders.length === 0,
      `${JSON.stringify(offenders)} reference the live owner_key — tests must use TEST_OWNER`,
    );
    /* The guard file is allowed to name it, because refusing it is its job. */
    check(
      "3.5c — and the guard that refuses it still exists",
      strip(readFileSync("e2e-plan/_plan-state.ts", "utf8")).includes(LIVE) &&
        /export function refuseLive/.test(readFileSync("e2e-plan/_plan-state.ts", "utf8")),
      "refuseLive() is the backstop; deleting it would make 3.5b pass vacuously",
    );
    /* This gate's own DB sections use scratch keys, and that must stay true. */
    check(
      "3.5d — this gate uses scratch keys, not the live one",
      SCRATCH !== LIVE && SCRATCH_COPY !== LIVE && !SCRATCH.includes(LIVE),
      `SCRATCH=${SCRATCH} SCRATCH_COPY=${SCRATCH_COPY}`,
    );
    /* And the suite's server must point somewhere else, or the specs would read
       the live plan through the page even with their own rows elsewhere. */
    const cfg = readFileSync("playwright.plan.config.ts", "utf8");
    check(
      "3.5e — the plan suite runs its own server with PLAN_OWNER_KEY",
      /PLAN_OWNER_KEY/.test(cfg) && /reuseExistingServer:\s*false/.test(cfg),
      "reusing a shared server would hand these tests the live plan",
    );
  }

  /* ── §3.6 THE RELEASES SECTION IS THE PLAN'S (`P2-ALL-E806`) ─────────── */
  /*
    Scott, 2026-10-03: the Releases section still printed the AIM figures —
    "84% · 16 of 19 done · Register · Profile · Connect" — beside a hero counted
    from the plan. Two definitions of one release's progress, side by side
    (`E585`), which is the defect `E790` already fixed one row higher up.
  */
  {
    const rel = "rel-R1";
    const tagged = [
      row({ id: "s-done", release_id: rel, status: "Done", title: "Register" }),
      row({ id: "s-move", release_id: rel, status: "In progress", title: "Profile" }),
      row({ id: "s-plan", release_id: rel, status: "Planned", title: "Connect" }),
      row({ id: "s-other", release_id: null, status: "Done", title: "Not in R1" }),
      /* A phase whose children are tagged is NOT itself a journey. */
      row({ id: "s-parent", type: "phase", release_id: rel, title: "Build", sort: 9 }),
      row({ id: "s-kid", parent_id: "s-parent", release_id: rel, status: "Done", title: "Shop" }),
    ];
    const pairs = [{ id: rel, code: "R1" }];
    const scope = releaseScopeByCode(tagged, pairs);
    check(
      "3.6a — the journeys listed are the plan rows tagged to that release",
      JSON.stringify(scope.R1) === JSON.stringify(["Register", "Profile", "Connect", "Shop"]),
      `got ${JSON.stringify(scope.R1)} — a container must not be listed, and an untagged row must not appear`,
    );
    const pr = releaseProgressByCode(tagged, pairs).R1;
    check(
      "3.6b — and its percentage is the half-credit one, over the same rows",
      pr.total === 4 && pr.done === 2 && pr.moving === 1 && pr.percent === 63,
      `got done ${pr.done} moving ${pr.moving} of ${pr.total} = ${pr.percent}% — expected 2, 1, 4, 63%`,
    );
    check(
      "3.6c — a release with no tagged rows is uncountable, not 0%",
      releaseProgressByCode(tagged, [{ id: "rel-R2", code: "R2" }]).R2.percent === null &&
        (releaseScopeByCode(tagged, [{ id: "rel-R2", code: "R2" }]).R2 ?? []).length === 0,
      "`Scope being set` is the copy for that, and `0%` would be a lie",
    );
    /* The page reads BOTH from the plan — the figure and the list — or the two
       halves of this section could still disagree. */
    const pageSrc = readFileSync("src/app/status/page.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const gridSrc = readFileSync("src/components/plan/PlanGrid.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    /*
      SUPERSEDED BY SCOTT (`E807`): the separate Releases section is gone, so
      the page no longer renders a per-release row at all. The figure moved to
      the release HEADING in the grid, from the row's own subtree.
      Quoted, not deleted:
      //   /planReleaseScope\[r\.code/.test(pageSrc) && /planReleasePercent\[r\.code\]/.test(pageSrc)
    */
    check(
      "3.6d — no AIM release field renders on the page",
      !/r\.journeys/.test(pageSrc) && !/r\.doneCount/.test(pageSrc) && !/r\.taskCount/.test(pageSrc),
      "`r.journeys`/`r.doneCount`/`r.taskCount` are the AIM tracker's fields and must not render here",
    );
    check(
      "3.6e — the release heading carries its own percentage, from the plan",
      /row\.progress/.test(gridSrc) && /data-plan-release-pct/.test(gridSrc),
      "each release heading shows its own % (Scott, 2026-10-03)",
    );
    check(
      "3.6f — and the hero reads that same release row",
      /releaseRow\?\.progress\?\.percent/.test(pageSrc),
      "the hero and the R1 heading must be the same number, not two computations",
    );
  }

  /* ── §3.7 RELEASED WORK GATES THE SUPPORT BLOCK (`P2-ALL-E810`) ──────── */
  /*
    Scott, 2026-10-03: "until a phase's Deploy ◆ is marked Done, hide the
    section entirely." A plan with no Done milestone must answer `null`, which
    is a different answer from a date and must not collapse into one.
  */
  {
    const planned = [
      row({ id: "r", type: "release", sort: 0 }),
      row({ id: "d", parent_id: "r", type: "milestone", sort: 0, status: "Planned" }),
    ];
    check(
      "3.7a — nothing released yet answers null, not a date",
      firstReleasedAt(planned) === null,
      "a Planned Deploy has not shipped, and `null` is what hides the block",
    );
    const shipped = [
      row({ id: "r1", type: "release", sort: 0 }),
      row({
        id: "d1", parent_id: "r1", type: "milestone", sort: 0, status: "Done",
        start_date: new Date("2026-11-15T00:00:00Z"), end_date: new Date("2026-11-15T00:00:00Z"),
      }),
      row({
        id: "d2", parent_id: "r1", type: "milestone", sort: 1, status: "Done",
        start_date: new Date("2026-12-15T00:00:00Z"), end_date: new Date("2026-12-15T00:00:00Z"),
      }),
      /* A Done PHASE is not a release — only a milestone is. */
      row({ id: "p", parent_id: "r1", type: "phase", sort: 2, status: "Done", start_date: new Date("2026-01-01T00:00:00Z"), end_date: new Date("2026-01-02T00:00:00Z") }),
    ];
    const at = firstReleasedAt(shipped);
    check(
      "3.7b — the EARLIEST Done milestone is the release date",
      at?.toISOString().slice(0, 10) === "2026-11-15",
      `got ${at?.toISOString().slice(0, 10)} — two Done Deploys, the first one wins`,
    );
    check(
      "3.7c — and a Done PHASE does not count as a release",
      at?.toISOString().slice(0, 10) !== "2026-01-01",
      "the January phase is Done and must not be read as a shipped release",
    );
    check(
      "3.7d — a Done milestone with no date is ignored rather than guessed",
      firstReleasedAt([row({ id: "m", type: "milestone", status: "Done" })]) === null,
      "a release with no date cannot date the tickets that follow it",
    );
  }

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

  /* ── §14 the import reader — PURE, fixtures only ───────────────────────── */

  /**
   * ⚠⚠ The parser is the half of the import that can be tested without a
   * server, a file picker or Postgres, and it is the half that carries every
   * per-row message a person will read. ⚠ `exceljs` is exercised by the browser
   * gate; the GRID reader is exercised here, and both go through `readGrid`.
   */

  /* CSV mechanics */
  check(
    "14a — a quoted field keeps its comma",
    parseCsv('a,"b,c",d')[0].join("|") === "a|b,c|d",
    JSON.stringify(parseCsv('a,"b,c",d')),
  );
  check(
    "14b — a quoted field keeps its newline",
    parseCsv('a,"two\nlines",c')[0][1] === "two\nlines",
    JSON.stringify(parseCsv('a,"two\nlines",c')),
  );
  check(
    "14c — a doubled quote is one quote",
    parseCsv('a,"say ""hi""",c')[0][1] === 'say "hi"',
    JSON.stringify(parseCsv('a,"say ""hi""",c')),
  );
  check(
    "14d — CRLF ends a row and leaves no stray carriage return",
    parseCsv("a,b\r\nc,d").length === 2 && parseCsv("a,b\r\nc,d")[0][1] === "b",
    JSON.stringify(parseCsv("a,b\r\nc,d")),
  );
  check(
    "14e — a trailing newline does not invent an empty row",
    parseCsv("a,b\nc,d\n").length === 2,
    `${parseCsv("a,b\nc,d\n").length} rows`,
  );
  check(
    "14f — a BOM does not corrupt the first heading",
    parseCsv("\uFEFFLevel,Title")[0][0] === "Level",
    JSON.stringify(parseCsv("\uFEFFLevel,Title")[0][0]),
  );

  /* dates */
  check("14g — ISO reads", readDate("2026-11-15") === "2026-11-15", String(readDate("2026-11-15")));
  check("14h — M/D/YYYY reads", readDate("11/15/2026") === "2026-11-15", String(readDate("11/15/2026")));
  check("14i — blank is null, not an error", readDate("") === null, String(readDate("")));
  check(
    "14j — 31 February is refused, not rolled over",
    readDate("2026-02-31") === false,
    String(readDate("2026-02-31")),
  );
  check(
    "14k — a two-digit year is refused rather than guessed",
    readDate("11/15/26") === false,
    `got ${String(readDate("11/15/26"))} — "26" could be 1926, and unreadable text is not evidence of a date (E549)`,
  );
  check("14l — prose is refused", readDate("next spring") === false, String(readDate("next spring")));

  /* the grid reader */
  const header = IMPORT_COLUMNS.join(",");
  const good = readGrid(parseCsv(`${header}\n1,Build,phase,2026-09-20,2026-11-01,In progress,Scott,\n2,Public,task,2026-09-20,2026-09-30,Done,Scott,40`));
  check(
    "14m — a clean file imports with no problems",
    good.rows.length === 2 && good.problems.length === 0,
    `${good.rows.length} rows, ${good.problems.length} problems: ${JSON.stringify(good.problems)}`,
  );
  check(
    "14n — levels and dates survive",
    good.rows[1].level === 2 && good.rows[0].start === "2026-09-20" && good.rows[1].hours === 40,
    JSON.stringify(good.rows),
  );

  const noTitle = readGrid(parseCsv("Level,Type\n1,phase"));
  check(
    "14o — a file with no Title column is refused at file level",
    noTitle.rows.length === 0 && /Title/.test(noTitle.problems[0]?.message ?? ""),
    JSON.stringify(noTitle.problems),
  );

  /**
   * ⚠⚠⚠ THE ONE THAT MATTERS MOST: a file with SOME bad rows imports the good
   * ones and says why the others did not. An all-or-nothing import of somebody's
   * real plan is what makes people stop using the feature.
   */
  const mixedFile = readGrid(
    parseCsv(
      `${header}\n` +
        `1,Build,phase,2026-09-20,2026-11-01,In progress,,\n` +
        `2,Public,task,,,done,,\n` +
        `2,Bad type,widget,,,,,\n` +
        `1,,phase,,,,,\n` +
        `2,Bad date,task,not-a-date,,,,\n` +
        `2,Bad hours,task,,,,,-5\n` +
        `2,Bad status,task,,,Nearly,,\n` +
        `1,Backwards,phase,2026-12-01,2026-01-01,,,`,
    ),
  );
  check(
    "14p — the good rows import and the bad ones are reported",
    /** ⚠ Six rows in, six reasons out: bad type · no title · bad date · bad
     *  hours · bad status · end-before-start. ⚠⚠ The counts are SPELLED OUT
     *  because my first version said five and the parser was right. */
    mixedFile.rows.length === 6 && mixedFile.problems.length === 6,
    `${mixedFile.rows.length} rows, ${mixedFile.problems.length} problems: ${JSON.stringify(mixedFile.problems)}`,
  );
  check(
    "14q — the fixture has BOTH good and bad rows, so §14p cannot pass vacuously",
    mixedFile.rows.length > 0 && mixedFile.problems.length > 0,
    "ruling 11: an all-good or all-bad fixture would make the split meaningless",
  );
  check(
    "14r — each problem names its spreadsheet line",
    mixedFile.problems.every((p) => p.line >= 2) && new Set(mixedFile.problems.map((p) => p.line)).size > 1,
    JSON.stringify(mixedFile.problems.map((p) => p.line)),
  );
  check(
    "14s — `done` is accepted as Done, so case is not a reason to lose a row",
    mixedFile.rows[1]?.status === "Done",
    `got ${mixedFile.rows[1]?.status}`,
  );
  check(
    "14t — an unreadable date leaves the row in, with the date blank",
    mixedFile.rows.some((r) => r.title === "Bad date" && r.start === null),
    JSON.stringify(mixedFile.rows.find((r) => r.title === "Bad date")),
  );
  check(
    "14u — an end before a start is reported and BOTH dates are kept",
    (() => {
      const row = mixedFile.rows.find((r) => r.title === "Backwards");
      return !!row && row.start === "2026-12-01" && row.end === "2026-01-01";
    })(),
    "discarding one of two dates the person typed is worse than reporting the pair",
  );
  check(
    "14v — a bad TYPE drops the row (there is nothing to import it AS)",
    !mixedFile.rows.some((r) => r.title === "Bad type"),
    "unlike a bad date, a bad type has no safe default",
  );

  /* ── the Release column (`E795`) ──────────────────────────────────────── */

  /**
   * ⚠⚠⚠ THE COLUMN EXISTS BECAUSE ITS ABSENCE COST THE LIVE PLAN ITS R1 SCOPE
   * on 2026-10-03 — an edit-in-Excel-and-replace round trip through a template
   * that could not carry the release, so the import silently dropped it.
   */
  check(
    "14z — Release is one of the template's columns",
    (IMPORT_COLUMNS as readonly string[]).includes("Release"),
    IMPORT_COLUMNS.join(","),
  );
  const withRel = readGrid(parseCsv(`${header}\n1,Build,phase,,,,,,R1\n2,Learn,task,,,,,,`));
  check(
    "14aa — a release code is read, and a blank one is null",
    withRel.rows[0]?.release === "R1" && withRel.rows[1]?.release === null,
    JSON.stringify(withRel.rows.map((r) => ({ t: r.title, rel: r.release }))),
  );
  check(
    "14ab — the code is upper-cased, so `r1` and `R1` are one answer",
    readGrid(parseCsv(`${header}\n1,A,phase,,,,,, r1 `)).rows[0]?.release === "R1",
    JSON.stringify(readGrid(parseCsv(`${header}\n1,A,phase,,,,,, r1 `)).rows[0]),
  );
  /**
   * ⚠⚠ A FILE WITHOUT THE COLUMN STILL IMPORTS — the column is additive, and an
   * older spreadsheet must not start failing. ⚠ Its rows arrive untagged, which
   * is honest: the file does not say.
   */
  const oldHeader = IMPORT_COLUMNS.filter((c) => c !== "Release").join(",");
  const noRelCol = readGrid(parseCsv(`${oldHeader}\n1,Build,phase,,,,,`));
  check(
    "14ac — a file with no Release column still imports, untagged",
    noRelCol.rows.length === 1 && noRelCol.rows[0].release === null && noRelCol.problems.length === 0,
    JSON.stringify(noRelCol),
  );

  const orphan = readGrid(parseCsv(`${header}\n2,Orphan,task,,,,,`));
  check(
    "14w — a level-2 row with nothing above it is promoted, and said",
    orphan.rows.length === 1 &&
      orphan.rows[0].level === 1 &&
      /top level/i.test(orphan.problems[0]?.message ?? ""),
    JSON.stringify(orphan),
  );

  const underStone = readGrid(
    parseCsv(`${header}\n1,R1,milestone,2026-11-15,2026-11-15,,,\n2,Under,task,,,,,`),
  );
  check(
    "14x — nothing sits under a milestone, so the next row is promoted",
    underStone.rows[1]?.level === 1,
    JSON.stringify(underStone.rows),
  );

  check(
    "14y — an empty file says so rather than importing nothing silently",
    readGrid([]).problems.length === 1,
    JSON.stringify(readGrid([]).problems),
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
    /*
      SUPERSEDED BY SCOTT (`E807`): the plan is THREE levels now — release →
      phase → task — so a row at depth 1 CAN indent once more. What must still
      be refused is a fourth level.
      Quoted, not deleted:
      //   "7b - a row already at depth 1 cannot indent further, and says so"
      //   refusesBecause(() => indentRow(mid.id, viewer), "two levels deep")
    */
    check(
      "7b — a row at depth 1 may indent once more, and a row at depth 2 may not",
      await (async () => {
        /* `mid` is at depth 1 under `a`. Give it a sibling above it to go under,
           then prove the third level is reached and the fourth refused. */
        const inner = await addRow({ planId: plan.id, parentId: a.id, title: "Inner" }, viewer);
        const deep = await indentRow(inner.id, viewer);
        const atTwo = deep.parent_id === mid.id;
        const refused = await refusesBecause(() => indentRow(inner.id, viewer), "three levels deep");
        await deleteRow(inner.id, viewer);
        return atTwo && refused;
      })(),
      "depth 2 must be reachable and depth 3 refused, naming the three-level rule",
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
    /* One level out (`E807`): from depth 1 that is still the top level. */
    check("7e — outdent from depth 1 returns to the top level", out.parent_id === null, "parent must be null");
    const topOrder = (await topRows()).map((x) => x.title);
    check(
      "7f — outdent lands directly after its old parent",
      topOrder[topOrder.indexOf("A") + 1] === "Mid",
      `got ${topOrder.join(",")} — Mid must sit immediately after A`,
    );
    /*
      SUPERSEDED BY SCOTT (`E807`). A top-level phase WITH tasks may now indent
      — that is exactly the move his restructure needs: Build, with its
      journeys, goes under a release. What is refused is a move that would push
      the tasks to a fourth level.
      Quoted, not deleted:
      //   "7g - a parent with children cannot be indented"
      //   refusesBecause(() => indentRow(b.id, viewer), "two levels deep")
    */
    check(
      "7g — a phase WITH tasks can indent, but not when its tasks would land too deep",
      await (async () => {
        const kid = await addRow({ planId: plan.id, parentId: b.id, title: "kid" }, viewer);
        /* b is at depth 0 with a child: indenting puts b at 1 and kid at 2 — fine. */
        const moved = await indentRow(b.id, viewer);
        const allowed = moved.parent_id !== null;
        /* Now b is at depth 1 and kid at 2, so another indent would put kid at 3. */
        const refused = await refusesBecause(() => indentRow(b.id, viewer), "three levels deep");
        await outdentRow(b.id, viewer);
        await deleteRow(kid.id, viewer);
        return allowed && refused;
      })(),
      "the subtree has to fit inside three levels, not just the row being moved",
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
    /*
      SUPERSEDED BY SCOTT (`E809`): outline numbers, so the milestone before
      Launch holds position 5 and Launch is 6.
      Quoted, not deleted:
      //   "12b - Launch is numbered 5 in the stored template"
    */
    check(
      "12b — Launch is 6 in the stored template, after the milestone's 5",
      tTree.find((n) => n.title === "Launch")?.number === "6" &&
        tTree.find((n) => n.type === "milestone")?.mark === MILESTONE_MARK,
      `got ${tTree.find((n) => n.title === "Launch")?.number}`,
    );
    check(
      "12c — the ten journeys sit under Build",
      tTree.find((n) => n.title === "Build")?.children.length === 10,
      "3.1 … 3.10",
    );
    /* ── §13 MOVING ACROSS PARENTS (`P2-ALL-E813`) ────────────────────── */
    /*
      Scott, 2026-10-03: a drop between rows of another stage moves the row into
      that stage at that spot; a drop onto a stage or phase makes it that row's
      last child; levels are kept.
    */
    {
      const mv = await ensurePlan("check-plan-move", "move scratch", viewer);
      await prisma.planRow.deleteMany({ where: { plan_id: mv.id } });
      const mk = (title: string, parentId: string | null, sort: number, type = "phase") =>
        prisma.planRow.create({
          data: { plan_id: mv.id, parent_id: parentId, sort, type, title },
          select: { id: true },
        });
      const P1 = await mk("P1", null, 0, "release");
      const S1 = await mk("S1", P1.id, 0);
      const S2 = await mk("S2", P1.id, 1);
      const T1 = await mk("T1", S1.id, 0, "task");
      const T2 = await mk("T2", S1.id, 1, "task");
      const T3 = await mk("T3", S2.id, 0, "task");
      const kidsOf = async (id: string | null) =>
        (
          await prisma.planRow.findMany({
            where: { plan_id: mv.id, parent_id: id },
            orderBy: { sort: "asc" },
            select: { title: true, type: true },
          })
        );

      await moveRow(T1.id, { parentId: S2.id, index: 99 }, viewer);
      const intoS2 = await kidsOf(S2.id);
      check(
        "13a — dropped ONTO a stage, a task becomes its LAST child",
        intoS2.map((k) => k.title).join(",") === "T3,T1",
        `S2 holds ${intoS2.map((k) => k.title).join(",")}`,
      );
      check(
        "13b — and it is still a task: the level is kept, not rewritten",
        intoS2.every((k) => k.type === "task"),
        `types ${intoS2.map((k) => k.type).join(",")}`,
      );
      check(
        "13c — its old list closed the gap behind it",
        (await kidsOf(S1.id)).map((k) => k.title).join(",") === "T2",
        "T2 must be sort 0 now, not sort 1 with a hole in front of it",
      );

      await moveRow(T3.id, { parentId: S1.id, index: 0 }, viewer);
      check(
        "13d — dropped BETWEEN rows of another stage, it lands at that spot",
        (await kidsOf(S1.id)).map((k) => k.title).join(",") === "T3,T2",
        "index 0 means above T2, not appended",
      );

      await moveRow(S2.id, { parentId: null, index: 1 }, viewer);
      check(
        "13e — a stage can move to the top level and takes its tasks with it",
        (await kidsOf(null)).map((k) => k.title).join(",") === "P1,S2" &&
          (await kidsOf(S2.id)).map((k) => k.title).join(",") === "T1",
        "the subtree travels with the row",
      );

      /*
        THE TWO REFUSALS, and the first is the one that would corrupt the tree:
        a row inside its own subtree leaves that branch attached to nothing and
        rendered nowhere, while the rows still exist.
      */
      check(
        "13f — a row cannot move inside its own subtree",
        await refusesBecause(() => moveRow(P1.id, { parentId: S1.id, index: 0 }, viewer), "inside itself"),
        "dropping a phase onto its own stage would detach the branch",
      );
      check(
        "13g — and a move that would make a fourth level is refused",
        await refusesBecause(
          () => moveRow(S2.id, { parentId: S1.id, index: 0 }, viewer),
          "three levels deep",
        ),
        "S2 carries T1, so landing at depth 2 would put T1 at depth 3",
      );
      /*
        THE COUNTER-CASE. Six refusals prove nothing without a move that LANDS —
        and an off-by-one in the depth check refused every legal cross-parent
        move until this caught it.
      */
      check(
        "13h — a legal cross-parent move still lands",
        await (async () => {
          await moveRow(T2.id, { parentId: S2.id, index: 0 }, viewer);
          return (await kidsOf(S2.id)).map((k) => k.title).join(",") === "T2,T1";
        })(),
        "depthOf({parent_id}) already counts the child, so the check must not add one again",
      );

      await prisma.planRow.deleteMany({ where: { plan_id: mv.id } });
      await prisma.plan.delete({ where: { id: mv.id } });
    }

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
