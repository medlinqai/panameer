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
import { readFileSync } from "fs";
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

const CARDS = "src/components/console/StatisticsCards.tsx";
const ROW = "src/components/console/StatFigureRow.tsx";
const BACKS = "src/components/console/StatCardBacks.tsx";
const FLIP = "src/components/motion/FlipCard.tsx";
const FLIPCSS = "src/components/motion/flip-card.css";
const LIB = "src/lib/statistics.ts";
const PAGE = "src/app/(app)/stats/page.tsx";

const src = {
  cards: stripTs(read(CARDS)),
  row: stripTs(read(ROW)),
  backs: stripTs(read(BACKS)),
  flip: stripTs(read(FLIP)),
  flipcss: read(FLIPCSS).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")),
  lib: stripTs(read(LIB)),
  page: stripTs(read(PAGE)),
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
      proposalsSent: { uncounted: "x" },
      interviews: 0,
      workOrders: 0,
      earnings: { uncounted: "x" },
      orderSeries: [],
    },
    teaching: {
      teaches: false,
      learners: 0,
      lessonsByThem: 0,
      questions: 0,
      questionsWaiting: { uncounted: "x" },
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
  for (const model of ["bidRequest", "interviewRequest", "workOrder"]) {
    const re = new RegExp(`prisma\\.${model}\\.count\\([^;]*?provider_person_id:\\s*personId`);
    check(
      `16 — ⚠⚠⚠ ${model} counts the PROVIDER's rows, not the buyer's`,
      re.test(src.lib),
      "where: { provider_person_id: personId }"
    );
  }
  check(
    "16 — ⚠⚠ the work order SERIES is scoped too, not just the count",
    /workOrder\.findMany\(\{\s*where:\s*\{\s*provider_person_id:\s*personId/.test(
      src.lib.replace(/\s+/g, " ").replace(/ \{/g, "{").replace(/\{ /g, "{")
    ) || /provider_person_id: personId, created_at/.test(src.lib.replace(/\s+/g, " ")),
    "the series cannot outrun the figure"
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
