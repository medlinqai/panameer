/**
 * `check:statistics` — the Statistics page's figures are counted or they do not
 * render (`P2-A2-E603` WS-A). `npm run check:statistics`.
 *
 * ── ⚠⚠⚠ THE RULE THIS GATE EXISTS TO HOLD ────────────────────────────────
 *
 * ⚠ SCOTT, 2026-09-23: *"Every figure is counted or it does not render. A figure
 * that can't be counted shows a dash and says why — never a 0. A real zero and
 * an unknown must not look the same."*
 *
 * ⚠⚠ MOST OF THAT RULE IS CARRIED BY THE **TYPE** — `Figure = number |
 * { uncounted: string }`, with no `null` a renderer could turn into `0`. ⚠⚠⚠ SO
 * THIS GATE DELIBERATELY DOES NOT RE-ASSERT WHAT THE COMPILER ALREADY REFUSES.
 * It holds the four things TypeScript cannot see:
 *   1. that the figures reach the screen through the row that knows the rule,
 *      rather than being formatted by hand at a call site;
 *   2. that the four corrections Scott made are not quietly re-added;
 *   3. that the flip card's height guarantee survives, which is **one CSS
 *      keyword** and fails silently when it is wrong;
 *   4. the pure functions whose branches **no seeded persona can reach**.
 *
 * ── ⚠⚠ (4) IS THE ONE WORTH READING TWICE ────────────────────────────────
 *
 * ⚠ `creditLine()`'s non-empty branch was UNREACHABLE BY RENDER on 2026-09-23:
 * all 14 sampled sellers are either all-zero (empty branch) or have invite
 * history (so the card shows a trend back and `creditLine` never runs).
 * ⚠⚠ THE HONEST OPTIONS WERE **SEED A PERSONA** OR **ASSERT THE FUNCTION**, and
 * seeding is forbidden during the test window. ⚠⚠⚠ REPORTING IT AS "PROVEN BY
 * RENDER" WAS NOT AN OPTION — that is the false-measurement class this brief has
 * already produced three of.
 *
 * ── ⚠ BY SHAPE, NOT BY A NAMED LIST (`E587`) ─────────────────────────────
 *
 * ⚠ The card sweep derives its inputs from the tree at run time. ⚠⚠ It STRIPS
 * COMMENTS FIRST (rule 12) — this brief's files carry superseded code as `//`
 * quotes, including the exact strings assertions 4–7 forbid, and scanning raw
 * text would fail on the QUOTE rather than on live code.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { trendBuckets, type Figure } from "../src/lib/statistics";
import { allZero } from "../src/components/console/StatCardBacks";
import { creditLine, workCreditLine } from "../src/components/console/StatisticsCards";
import type { Statistics } from "../src/lib/statistics";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  }
};

/** ⚠ TS/TSX carries both comment forms, and `E164` uses the line form by rule 12. */
const stripTs = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/** ⚠ Derives its inputs from the tree at run time (`E587`) — nothing here
 *  knows which files exist. */
function walkSrc(test: RegExp, dir = "src", out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = `${dir}/${e}`;
    if (statSync(full).isDirectory()) {
      if (!/node_modules|\.next/.test(full)) walkSrc(test, full, out);
    } else if (test.test(full)) out.push(full);
  }
  return out;
}

const CARDS = "src/components/console/StatisticsCards.tsx";
const ROW = "src/components/console/StatFigureRow.tsx";
const BACKS = "src/components/console/StatCardBacks.tsx";
const FLIP = "src/components/motion/FlipCard.tsx";
const FLIPCSS = "src/components/motion/flip-card.css";
const LIB = "src/lib/statistics.ts";
const PAGE = "src/app/(app)/stats/page.tsx";
const HIVE = "src/components/console/Honeycomb.tsx";
const HIVECSS = "src/components/console/honeycomb.css";

const src = {
  cards: stripTs(read(CARDS)),
  row: stripTs(read(ROW)),
  backs: stripTs(read(BACKS)),
  flip: stripTs(read(FLIP)),
  flipcss: read(FLIPCSS).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")),
  lib: stripTs(read(LIB)),
  page: stripTs(read(PAGE)),
  hive: stripTs(read(HIVE)),
  hivecss: read(HIVECSS).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")),
};

/* ⚠⚠ `E586` — A GATE WITH NO INPUTS MUST FAIL. Every assertion below reads one
   of these six files; if a rename emptied one, the whole suite would pass over
   nothing and report a perfect score. */
check(
  "0 — ⚠⚠ every source file this gate reads has content (E586)",
  Object.values(src).every((s) => s.trim().length > 200),
  Object.entries(src)
    .map(([k, v]) => `${k}:${v.length}`)
    .join(" ")
);

/* ── 1 · THE FIGURES REACH THE SCREEN THROUGH THE ROW THAT KNOWS THE RULE ── */

/**
 * ⚠⚠⚠ EVERY `s.<group>.<figure>` IN THE CARDS IS EITHER HANDED TO A COMPONENT
 * OR TESTED — it is never interpolated into JSX text. ⚠ `{s.profile.views}`
 * printed directly would render `[object Object]` for an uncounted figure, or a
 * bare number with no dash rule, and **nothing else would notice**.
 */
{
  const bad = [...src.cards.matchAll(/\{\s*(s\.[a-z]+\.[A-Za-z]+)\s*\}/g)]
    .map((m) => m[1])
    /* ⚠ `figure={…}` / `series={…}` are PROPS, and the matcher above cannot see
       the `name=` before the brace — re-check each hit in context. */
    .filter((expr) => {
      const re = new RegExp(`[A-Za-z]+=\\{\\s*${expr.replace(/\./g, "\\.")}\\s*\\}`);
      return !re.test(src.cards);
    });
  check(
    "1 — ⚠⚠⚠ no figure is interpolated straight into JSX text",
    bad.length === 0,
    bad.length ? bad.join(", ") : "all figures passed as props"
  );
}

/**
 * ⚠⚠ THE ROW CANNOT PRINT A DASH WITHOUT A REASON. The uncounted branch must
 * render `figure.uncounted`; without that read the dash becomes a silent
 * "we don't know" and the whole distinction collapses.
 */
check(
  "2 — ⚠⚠⚠ the uncounted branch renders the figure's own reason",
  /\{\s*figure\.uncounted\s*\}/.test(src.row),
  "StatFigureRow reads figure.uncounted"
);
check(
  "2 — ⚠ a counted figure renders as a number, including a real 0",
  /format\s*\?\s*format\(figure\)\s*:\s*figure\.toLocaleString/.test(src.row),
  "no zero is softened into a dash"
);

/* ── 2 · SCOTT'S FOUR CORRECTIONS STAY MADE ──────────────────────────────── */

/**
 * ⚠⚠ CORRECTION 2 — *"Profile completion and application usage are different
 * things. Completion belongs to the score page."* ⚠ The Statistics cards carry
 * NO completion figure and no score row.
 */
check(
  "3 — ⚠⚠ correction 2: no profile score / completion on the Statistics cards",
  !/Profile Score|completeness|profile\.score/i.test(src.cards),
  "usage only"
);

/**
 * ⚠⚠ CORRECTION 4 — the front-face period switch is gone. ⚠ The two period
 * links that remain live on the **trend back** and nowhere else, so the strings
 * must not appear in the cards file at all.
 */
check(
  "4 — ⚠⚠ correction 4: no period switch on a front face",
  !/This Month|All Time|all-time/i.test(src.cards),
  "no front-face window control"
);

/** ⚠ CORRECTION 5 — no per-row all-time tag beside a figure. */
check(
  "5 — ⚠ correction 5: no per-row all-time tag",
  !/\(all time\)/i.test(src.cards) && !/\(all time\)/i.test(src.row),
  "no row-level window tags"
);

/**
 * ⚠⚠ CORRECTION 6 — the zero-state sentence is gone. ⚠ A card with nothing on
 * it now turns to the ACTION back, which says what the card measures and offers
 * the links that move it; a sentence apologising for the emptiness is what that
 * replaced.
 */
check(
  "6 — ⚠⚠ correction 6: no zero-state apology sentence",
  !/nothing here yet|no activity yet|you have not/i.test(src.cards),
  "the action back replaced it"
);

/* ── 3 · THE FLIP CARD'S TWO GUARANTEES ──────────────────────────────────── */

/**
 * ⚠⚠⚠ THE HEIGHT GUARANTEE IS ONE CSS KEYWORD AND IT FAILED ONCE ALREADY.
 * ⚠ The hidden face must be `visibility: hidden` — which keeps the box AND
 * leaves the accessibility tree — never `display: none`, which removes the face
 * from the grid so the card collapses to whichever side is up. ⚠⚠ MEASURED AT
 * **303px → 192px on flip** before it was corrected; `tsc`, `next build` and
 * `eslint` were all green across that defect.
 */
check(
  "7 — ⚠⚠⚠ the hidden face keeps its box: visibility, not display",
  /\.pm-flip-hidden\s*\{[^}]*visibility:\s*hidden/.test(src.flipcss) &&
    !/\.pm-flip-hidden\s*\{[^}]*display:\s*none/.test(src.flipcss),
  "pm-flip-hidden is visibility: hidden"
);
check(
  "7 — ⚠⚠ neither face is given Tailwind's `hidden` (display:none) class",
  !/className=\{[^}]*"hidden"/.test(src.flip),
  "no display:none on a face"
);
check(
  "7 — ⚠ both faces sit in one grid cell, so the box is the taller face",
  /grid-area:\s*1\s*\/\s*1/.test(src.flipcss),
  "pm-flip-faces stacks its children"
);

/**
 * ⚠⚠⚠ IT NEVER FLIPS ITSELF. Scott: *"a card flipping itself means things
 * moving with nobody touching anything."* ⚠ A timer here would also fight the
 * honeycomb's own 15-second rebuild.
 */
check(
  "8 — ⚠⚠⚠ the flip card holds no timer",
  !/setInterval|setTimeout|requestAnimationFrame/.test(src.flip),
  "member-initiated only"
);

/** ⚠⚠ NO BACK, NO CONTROL (`E579`) — a flip onto a thin back is a door onto a
 *  wall, so a null back returns the front with no corner affordance. */
check(
  "9 — ⚠⚠ a null back renders no flip control (E579)",
  /if\s*\(!back\)\s*return\s*<>\{front\}<\/>/.test(src.flip),
  "back={null} ⇒ no door"
);

/**
 * ⚠⚠ ONE FIXTURE, AT MODULE SCOPE, FOR EVERY PURE-FUNCTION ASSERTION BELOW.
 * ⚠ A second copy would drift from this one the first time the type changed,
 * and the two suites would then be testing two different shapes while both
 * reported green — `E585` in a test file.
 * ⚠⚠⚠ EVERY COUNTED FIGURE IS 0 AND EVERY UNCOUNTABLE ONE IS A REASON, so each
 * assertion states its own deviation from zero and nothing is inherited
 * silently.
 */
const baseStats: Statistics = {
    window: "all",
    profile: { views: 0, shownInSearch: { uncounted: "x" }, rateSeen: { uncounted: "x" } },
    network: { colleagues: 0, invitesSent: 0, joined: 0, growthScore: 0, inviteSeries: [] },
    learning: {
      lessonsCompleted: 0,
      pathsEnrolled: 0,
      certifications: 0,
      pathsTaught: 0,
      lessonSeries: [],
    },
    work: {
      requestsReceived: 0,
      proposalsSent: 0,
      invitationsToPropose: 0,
      interviews: 0,
      interviewsTaken: 0,
      interviewsDeclined: 0,
      workOrders: 0,
      earnings: { uncounted: "x" },
    },
    teaching: {
      teaches: false,
      learners: 0,
      lessonsByThem: 0,
      questions: 0,
      questionsWaiting: 0,
    },
  };

/* ── 4 · THE PURE FUNCTIONS, INCLUDING THE BRANCHES NO RENDER REACHES ───── */

/**
 * ⚠⚠⚠ THE PERIOD CONTROL CHANGES THE DATA, NOT JUST THE PILL.
 * ⚠ This is the defect that was live until 2026-09-23: the series was eight
 * fixed weeks whatever the period, so `90 Days` and `YTD` drew the identical
 * line. ⚠⚠ A CONTROL THAT REPORTS A CHANGE IT DID NOT MAKE is worse than no
 * control, because the member believes the second reading.
 */
{
  const now = new Date(2026, 8, 23); // ⚠ fixed, or the assertion drifts by month
  const d90 = trendBuckets("90d", now);
  const ytd = trendBuckets("ytd", now);
  check("10 — ⚠ 90d is 13 weekly buckets", d90.length === 13, `${d90.length}`);
  check(
    "10 — ⚠ ytd is one bucket per calendar month, January through this one",
    ytd.length === 9 && ytd[0].lo.getMonth() === 0,
    `${ytd.length} buckets, first starts ${ytd[0].lo.toISOString().slice(0, 10)}`
  );
  check(
    "10 — ⚠⚠⚠ the two periods CANNOT produce the same series",
    d90.length !== ytd.length,
    `${d90.length} vs ${ytd.length} buckets`
  );
  /* ⚠⚠ HALF-OPEN `[lo, hi)`, OR A ROW ON A BOUNDARY IS COUNTED TWICE and the
     line stops matching its own total. */
  const contiguous = (bs: { lo: Date; hi: Date }[]) =>
    bs.every((b, i) => i === 0 || b.lo.getTime() === bs[i - 1].hi.getTime());
  check(
    "10 — ⚠⚠ buckets are contiguous and half-open, so nothing is double-counted",
    contiguous(d90) && contiguous(ytd),
    "no gaps, no overlaps"
  );
  check(
    "10 — ⚠ the last bucket runs past now, so a row created today lands in it",
    d90[d90.length - 1].hi > now && ytd[ytd.length - 1].hi > now,
    "today is inside the final bucket"
  );
}

/**
 * ⚠⚠⚠ AN UNCOUNTED FIGURE IS NOT A ZERO AND MUST NOT VOTE. ⚠ A card whose only
 * figures are dashes has nothing to credit and no history to show; treating a
 * dash as a zero would turn it face-down onto an action back on the strength of
 * something nobody measured.
 */
{
  const un = (s: string): Figure => ({ uncounted: s });
  check("11 — ⚠ allZero is true when every counted figure is 0", allZero([0, 0]), "");
  check("11 — ⚠ allZero is false when any counted figure is non-zero", !allZero([0, 3]), "");
  check(
    "11 — ⚠⚠⚠ an uncounted figure does not vote…",
    !allZero([un("no log"), 2]),
    "a dash beside a 2 is not an empty card"
  );
  check(
    "11 — ⚠⚠ …and a card of nothing BUT dashes is not 'all zero'",
    !allZero([un("no log"), un("no model")]),
    "nothing was measured, so nothing is empty"
  );
}

/**
 * ⚠⚠⚠ THE CREDIT LINE IS A COUNT, NOT A COMPLIMENT — and this is the branch no
 * seeded persona reaches. Scott: *"no fabricated encouragement, no promises, no
 * absolutes."*
 */
{
  const base = baseStats;
  const withNet = (n: Partial<Statistics["network"]>): Statistics => ({
    ...base,
    network: { ...base.network, ...n },
  });

  check(
    "12 — ⚠ nothing counted says so, and credits nothing",
    creditLine(base) === "Nothing counted on this card yet.",
    creditLine(base)
  );
  /* ⚠⚠ THE UNREACHABLE BRANCH — see this file's header. */
  check(
    "12 — ⚠⚠⚠ a single invitation reads in the singular",
    creditLine(withNet({ invitesSent: 1 })) === "1 invitation sent.",
    creditLine(withNet({ invitesSent: 1 }))
  );
  check(
    "12 — ⚠ several facts join into one sentence, in counting order",
    creditLine(withNet({ invitesSent: 3, colleagues: 8, joined: 2 })) ===
      "3 invitations sent, 8 colleagues connected, 2 joined from your invitations.",
    creditLine(withNet({ invitesSent: 3, colleagues: 8, joined: 2 }))
  );
  check(
    "12 — ⚠⚠ a zero is omitted rather than credited",
    creditLine(withNet({ colleagues: 8 })) === "8 colleagues connected.",
    creditLine(withNet({ colleagues: 8 }))
  );
  /* ⚠⚠⚠ NO FABRICATED ENCOURAGEMENT, ASSERTED ACROSS EVERY BRANCH ABOVE. */
  const lines = [
    creditLine(base),
    creditLine(withNet({ invitesSent: 1 })),
    creditLine(withNet({ invitesSent: 3, colleagues: 8, joined: 2 })),
  ];
  check(
    "12 — ⚠⚠⚠ no compliment, no promise, no absolute, in any branch",
    !lines.some((l) =>
      /great|well done|nice work|keep it up|always|never|fastest|best way|will help|you'll/i.test(l)
    ),
    "counts only"
  );
}

/**
 * ⚠⚠⚠ A MEMBER'S FIGURE IS SCOPED TO THAT MEMBER. ⚠ `workOrders` was written
 * `prisma.workOrder.count()` with **no `where` at all** — the platform total,
 * presented as one person's statistic. ⚠⚠ IT READ AS CORRECT BECAUSE THE TABLE
 * HOLDS ZERO ROWS, so it rendered `0` and would have started lying on the first
 * order anybody wrote. **A zero that is right by accident is not a passing
 * figure.**
 */
{
  /*
    ⚠⚠⚠ THE WHERE CLAUSE IS PRINTED, NOT INFERRED FROM AN EMPTY RESULT.
    ⚠ SCOTT, 2026-09-23: *"Scope is asserted, never inferred from an empty
    result."* ⚠⚠ `workOrders` read as correct for exactly as long as the table
    held zero rows — an empty result is evidence of nothing.
  */
  console.log("\n  ── every count in statistics.ts, with its where clause ──");
  for (const m of src.lib.matchAll(/prisma\.(\w+)\.count\(\s*\{?\s*(where:[^;]*?)?\}?\s*\)/g)) {
    const where = (m[2] ?? "").replace(/\s+/g, " ").trim();
    console.log(`     ${m[1].padEnd(18)} ${where || "⚠⚠ NO WHERE CLAUSE"}`);
  }
  for (const m of src.lib.matchAll(/prisma\.(\w+)\.findMany\(\s*\{\s*(where:[^;]*?),\s*select/g)) {
    console.log(`     ${(m[1] + " (findMany)").padEnd(18)} ${m[2].replace(/\s+/g, " ").trim()}`);
  }
  console.log("");

  const counts = [...src.lib.matchAll(/prisma\.(\w+)\.count\(([^;]*?)\)/g)];
  const unscoped = counts.filter((m) => !/where/.test(m[2])).map((m) => m[1]);
  check(
    "13 — ⚠⚠⚠ no figure is counted across the whole platform",
    unscoped.length === 0,
    unscoped.length ? `unscoped: ${unscoped.join(", ")}` : `${counts.length} counts, all scoped`
  );
  check(
    "13 — ⚠ the sweep actually found counts to check (E586)",
    counts.length > 0,
    `${counts.length}`
  );
}

/**
 * ⚠⚠ THE TREND CAPTION'S GRAIN FOLLOWS THE PERIOD. ⚠ Under `ytd` the buckets
 * are calendar months, so a caller writing *"each week"* by hand would state a
 * grain the chart stopped using the moment the member pressed `YTD` — the
 * period defect again, moved into the copy.
 */
check(
  "14 — ⚠⚠ the caption's grain is derived from the period, not written by a caller",
  /period === "ytd" \? "month" : "week"/.test(src.backs) && !/each week\./.test(src.cards),
  "one place decides the word"
);

/**
 * ⚠⚠⚠ AN EMPTY SERIES SAYS SO RATHER THAN DRAWING A ZERO LINE. ⚠ A flat line
 * along the bottom is a CLAIM — *"nothing happened, week after week"* — and it
 * is indistinguishable from a broken chart. Same rule as the figures: a
 * measured zero and an absence must not look alike.
 */
check(
  "15 — ⚠⚠⚠ a genuinely empty series is stated, not drawn",
  /total === 0 \?/.test(src.backs) && /no line to draw/.test(src.backs),
  "no zero line"
);

/**
 * ⚠⚠⚠ THE WORK CARD'S THREE COUNTED FIGURES SCOPE ON THE **PROVIDER** COLUMN.
 * ⚠ `BidRequest` and `InterviewRequest` each carry TWO person columns — the
 * provider and the buyer who invited them (`invited_by_person_id` /
 * `requested_by_person_id`). ⚠⚠ SCOPING ON THE WRONG ONE WOULD COUNT THE
 * MEMBER'S OWN OUTGOING INVITATIONS AS WORK THEY WERE OFFERED, and on today's
 * data both are zero, so no render could tell the two apart.
 */
{
  /*
    ⚠⚠⚠ DERIVED FROM THE SCHEMA, NOT FROM A LIST OF THREE MODELS (`E587`).
    ⚠ SUPERSEDED, quoted not deleted (`E164`) — it named the three models it
    knew about, and went red the moment two of those counts were correctly
    DELETED for having no writer:
    //   for (const model of ["bidRequest", "interviewRequest", "workOrder"]) { … }
    ⚠⚠ THE RULE IT CARRIED IS REAL AND SURVIVES: a model with BOTH a provider
    and a buyer person column must be counted on the PROVIDER one. Scoping on
    the wrong column would count the member's own outgoing invitations as work
    they were offered, and on today's empty tables no render could tell them
    apart.
  */
  const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
  const countedModels = [...src.lib.matchAll(/prisma\.([a-zA-Z]+)\.count\(([^;]*?)\)/g)];
  let twoSided = 0;
  for (const [, model, body] of countedModels) {
    /* ⚠ the model's block, found by its PascalCase name */
    const M = model[0].toUpperCase() + model.slice(1);
    const block = new RegExp(`^model ${M} \\{[\\s\\S]*?^\\}`, "m").exec(schema)?.[0];
    if (!block) continue;
    const hasProvider = /provider_person_id\s/.test(block);
    const hasOtherPerson = /(invited_by_person_id|requested_by_person_id|buyer_person_id)\s/.test(block);
    if (!hasProvider || !hasOtherPerson) continue;
    twoSided++;
    check(
      `16 — ⚠⚠⚠ ${model} counts the PROVIDER's rows, not the buyer's`,
      /provider_person_id/.test(body),
      body.replace(/\s+/g, " ").trim().slice(0, 70)
    );
  }
  check(
    "16 — ⚠⚠ the schema sweep found two-sided models to check (E586)",
    countedModels.length > 0,
    twoSided > 0
      ? `${twoSided} of ${countedModels.length} counted models carry both a provider and a buyer column`
      : `${countedModels.length} counted models, none two-sided today`
  );

}
/**
 * ⚠⚠ THE WORK CARD RENDERS ALL FIVE FIGURES. ⚠⚠⚠ THIS IS THE ASSERTION THAT
 * STOPS `s.work` GOING BACK TO BEING COMPUTED AND UNDRAWN — which is how the
 * unscoped count survived review in the first place. **Unrendered code is
 * unreviewed code** (Scott, 2026-09-23).
 */
{
  const drawn = ["requestsReceived", "proposalsSent", "interviews", "workOrders", "earnings"].filter(
    (f) => new RegExp(`figure=\\{s\\.work\\.${f}\\}`).test(src.cards)
  );
  check(
    "17 — ⚠⚠⚠ every work figure reaches the screen",
    drawn.length === 5,
    `${drawn.length}/5 drawn${drawn.length < 5 ? ` — missing ${["requestsReceived", "proposalsSent", "interviews", "workOrders", "earnings"].filter((f) => !drawn.includes(f)).join(", ")}` : ""}`
  );
}

/**
 * ⚠⚠ THE WORK CREDIT LINE CANNOT CREDIT A DASH. ⚠ Proposals and Earnings are
 * uncountable, so they are absent from the sentence entirely — *"0 proposals
 * sent"* would report a result where there is no mechanism.
 */
{
  const w = (over: Partial<Statistics["work"]>): Statistics => ({
    ...baseStats,
    work: { ...baseStats.work, ...over },
  });
  check(
    "18 — ⚠⚠ at genuine zero it names the first move, not the emptiness",
    workCreditLine(baseStats).startsWith("No work has reached you yet."),
    workCreditLine(baseStats)
  );
  check(
    "18 — ⚠ counts read in the singular where they are one",
    workCreditLine(w({ requestsReceived: 1, interviews: 1, workOrders: 1 })) ===
      "1 work request received, 1 interview, 1 work order.",
    workCreditLine(w({ requestsReceived: 1, interviews: 1, workOrders: 1 }))
  );
  check(
    "18 — ⚠⚠⚠ an uncountable figure is never credited",
    !/proposal|earn/i.test(workCreditLine(w({ requestsReceived: 4, workOrders: 2 }))),
    workCreditLine(w({ requestsReceived: 4, workOrders: 2 }))
  );
}

/**
 * ⚠⚠⚠ THE COMPLETION FIGURE IS OFF `/stats` ENTIRELY (correction 2, 2 of 2).
 * ⚠ WS-A took it off the NEW cards and left the old tile rendering
 * `{profile.completeness}% of required details` above them, so the ruling was
 * half-applied. ⚠⚠ THE CARD IS NOT DELETED — the link that replaced the figure
 * is the only entrance to the score page from this screen, and removing a card
 * can remove a capability's only entrance.
 */
check(
  "19 — ⚠⚠⚠ no completion percentage renders on /stats",
  !/\{profile\.completeness\}%/.test(src.page),
  "the figure is gone"
);
check(
  "19 — ⚠⚠ …and the score page is still reachable from here",
  /href="\/community\/score"/.test(src.page),
  "the door survived the figure"
);


/* ── 5 · THE HONEYCOMB (WS-B) ───────────────────────────────────────────── */

/**
 * ⚠⚠⚠ THE REBUILD CANNOT CHANGE A NUMBER, RATHER THAN MERELY HAPPENING NOT TO.
 * ⚠ The cells arrive as a PROP and the component holds no fetch, no refresh and
 * no state carrying a figure. ⚠⚠ `useRebuild` RETURNS A COUNTER, AND A COUNTER
 * CANNOT CARRY DATA — that is the structural guarantee, and this assertion is
 * what stops somebody adding a refresh to "keep it live".
 */
check(
  "20 — ⚠⚠⚠ the honeycomb fetches nothing, so a rebuild cannot change a figure",
  !/\bfetch\(|router\.refresh|useSWR|revalidate/.test(src.hive),
  "no data path in the component"
);
check(
  "20 — ⚠⚠ it uses the SHARED rebuild clock, not a second timer",
  /useRebuild\(/.test(src.hive) && !/setInterval|setTimeout/.test(src.hive),
  "E600 WS-D's clock, inherited"
);

/**
 * ⚠⚠ THE ORDER IS DETERMINISTIC AT CYCLE 0. ⚠⚠⚠ A `Math.random()` SHUFFLE WOULD
 * RENDER ONE ORDER ON THE SERVER AND ANOTHER IN THE BROWSER — a hydration
 * error, which a reader sees as the page flickering before it settles.
 */
check(
  "21 — ⚠⚠⚠ the rearrange is deterministic, never random",
  !/Math\.random/.test(src.hive) && /rotate\(cells, cycle\)/.test(src.hive),
  "rotation by cycle; cycle 0 is the identity"
);

/**
 * ⚠⚠⚠ REDUCED MOTION FREEZES THE **ORDER**, NOT ONLY THE FADE. ⚠ Cells silently
 * swapping places with no transition is the WORST version of motion for a
 * reader who asked for none — it happens with nothing to explain it.
 */
check(
  "22 — ⚠⚠⚠ reduced motion freezes the order itself",
  /still \? cells : rotate\(/.test(src.hive),
  "a still picture, not a silent swap"
);
check(
  "22 — ⚠⚠ …and there is no countdown for that reader",
  /RebuildBadge/.test(src.hive) && /secondsLeft === null/.test(stripTs(read("src/components/motion/Rebuild.tsx"))),
  "the badge renders nothing when the picture is still"
);

/**
 * ⚠⚠⚠ THE TWO DASHES DIFFER IN THREE WAYS AT ONCE — glyph, outline and reason.
 * ⚠ SCOTT: *"A dashed cell meaning 'nothing here' and one meaning 'we can't
 * count this' must not look identical."* ⚠⚠ ONE CUE IS NOT ENOUGH: colour alone
 * fails for a colour-blind reader, a border alone fails in a low-contrast
 * screenshot. **The distinction survives with the colour removed.**
 */
check(
  "23 — ⚠ cue 1 — the glyph: a measured zero is never softened into a dash",
  /counted \? fig\.toLocaleString/.test(src.hive),
  "0 prints as 0"
);
/*
  ⚠⚠⚠ CUE 2 IS THE **FILL**, AND THE BORDER IS ONLY THE SECOND HALF OF IT.
  ⚠ `clip-path` clips the border with the box, so on a hexagon a dashed border
  survives ONLY on the two straight sides — it rendered as two faint ticks.
  ⚠⚠ A FILL IS CLIPPED **TO** THE SHAPE RATHER THAN AWAY, so the hatch is what
  actually carries the distinction on screen. ⚠⚠⚠ THIS ASSERTION EXISTS
  BECAUSE THE BORDER-ONLY VERSION PASSED ITS GATE AND STILL FAILED THE
  SCREENSHOT.
*/
check(
  "23 — ⚠⚠⚠ cue 2a — the FILL: an uncountable cell is hatched, a counted one solid",
  /\[data-counted="no"\]::before\s*\{[^}]*repeating-linear-gradient/.test(src.hivecss),
  "a fill survives clip-path; a border does not"
);
check(
  "23 — ⚠⚠ cue 2b — the outline is dashed as well, where clipping lets it show",
  /\[data-counted="no"\]::before\s*\{[^}]*border-style:\s*dashed/.test(src.hivecss),
  "border-style differs"
);
check(
  "23 — ⚠⚠⚠ cue 3 — the reason, and it cannot be omitted",
  /\{fig\.uncounted\}/.test(src.hive),
  "the cell reads the reason off the figure itself"
);
check(
  "23 — ⚠⚠ a screen reader gets the distinction in WORDS, not in a border",
  /not counted/.test(src.hive) && /aria-label=/.test(src.hive),
  "the dashed outline is invisible to assistive tech"
);

/**
 * ⚠⚠⚠ THE DERIVED LINE MUST NOT MERGE "EMPTY" WITH "UNCOUNTABLE" — the exact
 * distinction the cells above are careful about. ⚠ Found in the WS-B render,
 * not in review: a buyer has three measured zeros AND an uncountable Profile
 * cell, and the first version reported all four as empty.
 */
check(
  "24 — ⚠⚠⚠ the all-zero sentence still names the areas nobody could count",
  /could not be counted at all/.test(src.hive),
  "empty and unmeasured stay apart"
);
check(
  "24 — ⚠⚠ an uncountable area never votes for busiest or quietest",
  /cells\.filter\(\s*\(c\): c is HoneyCell & \{ figure: number \} => isCounted/.test(
    src.hive.replace(/\s+/g, " ")
  ) || /isCounted\(c\.figure\)/.test(src.hive),
  "only counted figures are compared"
);
check(
  "24 — ⚠ the line states what it compared, rather than implying more",
  /Compared by count only/.test(src.hive),
  "areas count different things"
);

/**
 * ⚠⚠ THE HONEYCOMB'S FIGURES COME FROM THE SAME `s` THE CARDS DRAW. ⚠⚠⚠ A
 * SECOND QUERY WOULD BE A SECOND DEFINITION OF EVERY FIGURE ON THE PAGE, and
 * the two would disagree the first time one of them changed (`E585`).
 */
check(
  "25 — ⚠⚠⚠ the cells are derived from the cards' own figures",
  /export function honeyCells\(s: Statistics\)/.test(src.cards) &&
    !/prisma\./.test(src.hive),
  "one source for both"
);


/* ── 6 · NO FIGURE IS COMPUTED TWICE (WS-C) ─────────────────────────────── */

/**
 * ── ⚠⚠⚠ THE RULE, IN SCOTT'S CORRECTED WORDING (2026-09-23) ──────────────
 *
 * ⚠ *"THE RULE IS **NO FIGURE IS COMPUTED TWICE**, NOT RENDERED TWICE. Two
 * renders of one computation cannot drift; two computations of one concept are
 * free to disagree, and will."*
 *
 * ⚠⚠ ASSERTED BY SHAPE, NOT BY A NAMED LIST (`E587`): the two sets are derived
 * from the source at run time and INTERSECTED. Nothing here knows that
 * `certification` was the offender — it knows that a model counted in
 * `getStatistics` must not be counted again on the page.
 * ⚠⚠⚠ IT IS WHAT CAUGHT ALL FOUR: `certification` (two different scoping
 * columns), `interviewRequest` (×3), `bidRequest` and `providerBid` were each
 * computed on BOTH sides. Every one of them rendered, and every one was free to
 * disagree with its twin.
 * ⚠ `package` is expected to remain page-only — `Service Products` is genuinely
 * uncovered by the cards, so it is counted once, on the page. The assertion
 * does not name it; it simply is not in the library's set.
 */
{
  const modelsIn = (src: string) =>
    new Set([...src.matchAll(/prisma\.([a-zA-Z]+)\.(?:count|aggregate|groupBy)\(/g)].map((m) => m[1]));
  const lib = modelsIn(src.lib);
  const page = modelsIn(src.page);
  const both = [...page].filter((m) => lib.has(m));
  check(
    "26 — ⚠⚠⚠ no model is counted in BOTH getStatistics and the page",
    both.length === 0,
    both.length
      ? `computed twice: ${both.join(", ")}`
      : `lib counts ${[...lib].sort().join(", ")} · page counts ${[...page].sort().join(", ")}`
  );
  check(
    "26 — ⚠ the sweep found counts on both sides to compare (E586)",
    lib.size > 0 && page.size > 0,
    `${lib.size} lib · ${page.size} page`
  );
}

/**
 * ⚠⚠⚠ THE HONEYCOMB'S EXEMPTION IS NARROW AND **ASSERTED**, NOT ASSUMED.
 * ⚠ SCOTT: *"The honeycomb is exempt — it reads the same object, so it can't
 * drift. But the exemption is narrow and asserted, not assumed: the gate proves
 * the cell and the card read the same value, rather than skipping them."*
 * ⚠⚠ STATICALLY: every cell's figure is an `s.<group>.<field>` expression, so
 * it is READ from the same object the cards are handed, never recomputed.
 * ⚠ The RUNTIME half — cell value equals card value on a rendered page — is in
 * `check:stats-live`, because only a render can compare two drawn numbers.
 */
{
  const cellFigures = [...src.cards.matchAll(/figure:\s*(s\.[a-z]+\.[A-Za-z]+)/g)].map((m) => m[1]);
  check(
    "27 — ⚠⚠⚠ every honeycomb cell READS a card figure rather than computing one",
    cellFigures.length >= 4 && cellFigures.every((f) => /^s\.[a-z]+\.[A-Za-z]+$/.test(f)),
    cellFigures.join(", ")
  );
  check(
    "27 — ⚠⚠ the honeycomb component itself touches no database",
    !/prisma\./.test(src.hive),
    "it is handed its cells"
  );
}

/**
 * ⚠⚠ THE BREAKDOWN RECONCILES OR REFUSES. ⚠ `Offered` is the TOTAL and the two
 * subsets are drawn from it; `REQUESTED`, `SLOTS_OFFERED` and `SCHEDULED` sit
 * in neither, so the remainder must be NAMED or the column does not add up.
 * ⚠⚠⚠ AND A NEGATIVE REMAINDER — a subset larger than its own total, which can
 * only mean the queries drifted — PRINTS NOTHING AND SAYS SO.
 */
check(
  "28 — ⚠⚠ the breakdown names its remainder, so the column adds up",
  /remainderLabel/.test(src.backs) && /remainderLabel="Still in progress"/.test(src.cards),
  "the in-flight states are a row, not an omission"
);
check(
  "28 — ⚠⚠⚠ a breakdown that cannot reconcile refuses to print the split",
  /remainder < 0/.test(src.backs) && /These figures disagree/.test(src.backs),
  "say it, do not print it"
);
check(
  "28 — ⚠ the label never says a state the schema does not have",
  !/expired/i.test(src.cards),
  "InterviewStatus has no EXPIRED"
);

/**
 * ⚠⚠⚠ THE THREE FIGURES THAT WERE WRONG, PINNED SO THEY CANNOT SILENTLY RETURN.
 * ⚠ Each was found by searching for the BEHAVIOUR rather than the noun, after
 * `proposalsSent` was declared uncountable because no model was named
 * `Proposal` while `ProviderBid` had been counting it all along.
 */
/*
  ⚠⚠⚠ SUPERSEDED BY THE WRITER TEST, quoted not deleted (`E164`):
  //   "29 — proposals are COUNTED, from ProviderBid, and only when submitted",
  //   /providerBid\.count\(\{[^}]*submitted_at:\s*\{\s*not:\s*null/.test(…)
  ⚠ IT WAS RIGHT ABOUT THE FILTER AND WRONG ABOUT THE FIGURE. `submitted_at`
  IS the correct predicate for "sent" — a draft is not a proposal — but the
  question never got that far: **nothing creates a `ProviderBid` at all**, so
  the count could only ever be a confident zero about a mechanism that does not
  exist. ⚠⚠ ASSERTION 31 NOW OWNS THIS, from the writer side, and it will keep
  owning it if somebody builds the creator tomorrow.
  ⚠ What survives here is the half that is still true regardless: the FALSE
  REASON must not come back.
*/
check(
  "29 — ⚠⚠ the false 'no Proposal model exists' claim stays retired",
  !/No Proposal model exists/.test(src.lib),
  "the model is ProviderBid — an absent name is not an absent thing"
);
check(
  "29 — ⚠⚠ work requests count only those actually ISSUED",
  /bidRequest\.count\(\{ where: \{ provider_person_id: personId, issued_at: \{ not: null \}/.test(
    src.lib.replace(/\s+/g, " ")
  ),
  "an unissued request was never sent to anybody"
);
check(
  "29 — ⚠⚠⚠ certifications are counted on the NOT-NULL column",
  /certification\.count\(\{ where: \{ user_id: userId \} \}\)/.test(src.lib.replace(/\s+/g, " ")),
  "provider_profile_id is nullable and undercounts"
);
check(
  "29 — ⚠⚠ earnings name the truncation, not the member's action",
  /no order can reach paid/.test(src.lib) && !/complete your first paid work order/.test(src.page),
  "no promise about a mechanism that does not exist"
);


/* ── 7 · THE FABRICATED RATING (pre-merge guard) ────────────────────────── */

/**
 * ── ⚠⚠⚠ NO COMPONENT RENDERS `ProviderProfile.rating` WHILE NOTHING WRITES IT ──
 *
 * ⚠ SCOTT, 2026-09-23: *"'No component reads it' is true today and nothing keeps
 * it true — it is one JSX expression from being a fabricated rating on a
 * member-facing page."*
 *
 * ⚠⚠ THE COLUMN HOLDS `4.90` ON ONE PROFILE, HARDCODED AT `prisma/seed.ts:260`,
 * AND NOTHING COMPUTES IT. There is no `Review`, `Rating` or `Feedback` model
 * and no rating relation on `WorkOrder`, so a buyer cannot produce one.
 *
 * ── ⚠⚠ BY SHAPE, NOT BY A LIST OF THE FOUR VIEW MODELS (`E587`) ──────────
 *
 * ⚠⚠⚠ A LIST WOULD MISS THE FIFTH. All three sets below are DERIVED from the
 * tree at run time:
 *   · **writers** — any `providerProfile` create/update/upsert whose data sets
 *     `rating`. ⚠ **THE GUARD IS ARMED ONLY WHILE THIS IS EMPTY.** The day a
 *     real writer lands, the figure becomes a measurement and this assertion
 *     must stop forbidding it — so the gate reads that fact rather than being
 *     told it.
 *   · **carriers** — every file that maps `rating:` from something's `.rating`.
 *     Reported, not forbidden: carrying it is how it reaches a component, and
 *     seeing the list grow is the early warning.
 *   · **renderers** — any `.tsx` under `components/` or `app/` that reads
 *     `.rating`, EXCLUDING files that define their own numeric rating literal.
 *     ⚠ That exclusion is by SHAPE too: `TestimonialCarousel` holds a local
 *     array with `rating: 3.0`, which is marketing copy it owns, not this
 *     column. A file that supplies its own value is not reading the database's.
 */
{
  const tsxFiles = walkSrc(/\.tsx$/).filter((f) => /\/(components|app)\//.test(f));
  const tsFiles = walkSrc(/\.ts$/);
  check(
    "30 — ⚠ the sweep found component files to read (E586)",
    tsxFiles.length > 0 && tsFiles.length > 0,
    `${tsxFiles.length} tsx · ${tsFiles.length} ts`
  );

  /* ⚠ WRITERS — derived, so the guard disarms itself when one appears. */
  const writers: string[] = [];
  for (const f of tsFiles.concat(tsxFiles)) {
    const code = stripTs(readFileSync(f, "utf8")).replace(/\s+/g, " ");
    for (const m of code.matchAll(/providerProfile\.(create|update|upsert|updateMany|createMany)\(([^;]{0,400})/g)) {
      if (/\brating\s*:/.test(m[2])) writers.push(`${f.replace(/^src\//, "")}:${m[1]}`);
    }
  }
  check(
    "30 — ⚠⚠ the guard is ARMED because nothing writes the column",
    writers.length === 0,
    writers.length
      ? `a writer now exists (${writers.join(", ")}) — the rating may be real; REVIEW THIS ASSERTION`
      : "no runtime writer; the only value is seeded"
  );

  /* ⚠ CARRIERS — reported, so the list growing is visible. */
  const carriers = tsFiles.filter((f) =>
    /rating:\s*[^,;]*\.rating/.test(stripTs(readFileSync(f, "utf8")).replace(/\s+/g, " "))
  );
  check(
    "30 — ⚠ the carriers are derived, not listed — a fifth cannot slip past",
    carriers.length > 0,
    carriers.map((f) => f.replace(/^src\//, "")).join(", ")
  );

  /* ⚠⚠⚠ RENDERERS — the assertion itself. */
  const renderers: string[] = [];
  for (const f of tsxFiles) {
    const code = stripTs(readFileSync(f, "utf8"));
    if (!/\.rating\b/.test(code)) continue;
    /* ⚠ A file holding its own numeric rating literal supplies its own value
       and is not reading this column. */
    if (/rating:\s*[0-9]/.test(code)) continue;
    renderers.push(f.replace(/^src\//, ""));
  }
  check(
    "30 — ⚠⚠⚠ no component reads a rating while nothing computes one",
    writers.length > 0 || renderers.length === 0,
    renderers.length ? `FABRICATED RATING RENDERED BY: ${renderers.join(", ")}` : "zero renderers"
  );

  /* ⚠⚠ AND THE UNUSED SELECT STAYS GONE — a selected-but-unused field puts the
     value in scope, which is how the expression gets written by accident. */
  check(
    "30 — ⚠⚠ no page selects the column without using it",
    !/rating:\s*true/.test(src.page),
    "nothing puts it in scope for free"
  );
}


/* ── 8 · THE WRITER TEST (Scott's correction of his own ruling, 2026-09-23) ── */

/**
 * ── ⚠⚠⚠ NO FIGURE RENDERS AS A COUNT IF ITS MODEL HAS NO WRITER ──────────
 *
 * ⚠ SCOTT, 2026-09-23, CORRECTING HIS OWN RULING: *"The writer test — a figure
 * is countable when the state it counts has a writer, not when something
 * upstream does — was not applied to the three figures I flipped to counted."*
 *
 * ⚠⚠ THE THREE: `ProviderBid`, `InterviewRequest` and `WorkOrder`. **None of
 * them has a `create` anywhere in the repository.** Each rendered a confident
 * `0`, and ⚠⚠⚠ **A ZERO THERE CLAIMS THE MECHANISM WORKS AND NOBODY HAS USED
 * IT.** None of those mechanisms exist.
 *
 * ⚠ **THIS IS THE ASSERTION THAT WOULD HAVE CAUGHT IT**, and the one that stops
 * the next three — because the next three will arrive the same way: a table in
 * the schema, a plausible `count()`, and no code that ever puts a row in it.
 *
 * ── ⚠⚠ BOTH SETS ARE DERIVED AT RUN TIME (`E587`) ────────────────────────
 *
 * ⚠⚠⚠ A LIST WOULD ROT THE DAY SOMEBODY BUILDS ONE OF THESE. Nothing here
 * names a model:
 *   · **counted** — every `prisma.X.count(` inside `getStatistics`. Those are
 *     the figures.
 *   · **creatable** — every model with a `create`, `createMany` or `upsert`
 *     ANYWHERE under `src/`. ⚠⚠ `update` AND `updateMany` DO NOT COUNT, and
 *     that distinction is the whole test: `orders.ts` updates a `WorkOrder`
 *     twice, but nothing ever builds one, so those updates can never run. **A
 *     model you can only update is a model with no rows.**
 * ⚠ The gate then intersects them and fails on the difference.
 */
{
  const libSrc = src.lib;
  const counted = new Set(
    [...libSrc.matchAll(/prisma\.([a-zA-Z]+)\.count\(/g)].map((m) => m[1])
  );
  const allTs = walkSrc(/\.tsx?$/);
  const creatable = new Set<string>();
  for (const f of allTs) {
    const code = stripTs(readFileSync(f, "utf8"));
    /*
      ⚠⚠⚠ ANY CLIENT IDENTIFIER, NOT JUST `prisma.` — A TRANSACTION CLIENT IS
      STILL A WRITER. ⚠ FOUND WHILE MEASURING LEARN (`E606`): `lib/forums.ts`
      creates a `ForumPost` as `tx.forumPost.create` inside a `$transaction`,
      and the `prisma.`-only pattern reported that model as having NO WRITER.
      ⚠⚠ THAT IS A FALSE POSITIVE IN THE DANGEROUS DIRECTION FOR THIS GATE — it
      would push somebody to DASH a figure that is genuinely countable, the
      mirror image of the bug this assertion exists to catch.
      ⚠ RE-VERIFIED WITH THE WIDER PATTERN: `providerBid`, `interviewRequest`
      and `workOrder` still have **no creator under any identifier**, so the
      three dashes this commit-set made stand.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   for (const m of code.matchAll(/prisma\.([a-zA-Z]+)\.(create|createMany|upsert)\b/g))
    */
    for (const m of code.matchAll(/\b[a-zA-Z_$]+\.([a-zA-Z]+)\.(create|createMany|upsert)\b/g)) {
      creatable.add(m[1]);
    }
  }
  check(
    "31 — ⚠ the sweep found counted models and creatable models (E586)",
    counted.size > 0 && creatable.size > 0,
    `${counted.size} counted · ${creatable.size} creatable`
  );

  const noWriter = [...counted].filter((m) => !creatable.has(m)).sort();
  check(
    "31 — ⚠⚠⚠ every counted model has something that can create a row in it",
    noWriter.length === 0,
    noWriter.length
      ? `COUNTED BUT NOTHING CREATES ONE: ${noWriter.join(", ")} — a zero there claims the mechanism works and nobody used it`
      : `counted: ${[...counted].sort().join(", ")}`
  );

  /* ⚠⚠ AND THE THREE THAT WERE WRONG ARE PINNED AS DASHES, so a later edit
     cannot quietly re-count them while their models stay unwritable. */
  for (const [field, model] of [
    ["proposalsSent", "providerBid"],
    ["interviews", "interviewRequest"],
    ["workOrders", "workOrder"],
  ] as const) {
    const isDash = new RegExp(`${field}:\\s*\\{\\s*uncounted:`).test(libSrc);
    check(
      `31 — ⚠⚠ ${field} is a dash while nothing creates a ${model}`,
      creatable.has(model) || isDash,
      creatable.has(model) ? `${model} is now creatable — re-examine this figure` : "dashed, with its reason"
    );
  }

  /* ⚠ THE REASON NAMES THE TRUNCATION, NOT THE MEMBER (Scott). "Once you…"
     blames the reader for the absence of a mechanism. */
  const reasons = [...libSrc.matchAll(/uncounted:\s*"([^"]+)"/g)].map((m) => m[1]);
  check(
    "31 — ⚠ the sweep found reasons to read (E586)",
    reasons.length > 0,
    `${reasons.length} reasons`
  );
  const blaming = reasons.filter((r) => /^once you|when you |after you |complete your/i.test(r));
  check(
    "31 — ⚠⚠⚠ no reason blames the member for a missing mechanism",
    blaming.length === 0,
    blaming.length ? blaming.join(" · ") : "every reason names the truncation"
  );
}

console.log(
  `check:statistics — ${Object.keys(src).length} files read · ` +
    `${trendBuckets("90d", new Date(2026, 8, 23)).length} 90d buckets · ` +
    `${trendBuckets("ytd", new Date(2026, 8, 23)).length} ytd buckets`
);

if (failures.length) {
  console.error(`\ncheck:statistics — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:statistics — ${pass}/${pass} passed`);
process.exit(0);
