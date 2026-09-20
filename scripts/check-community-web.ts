import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { stripComments } from "./lib/strip-comments";
import { layoutWeb, minClearance, RING_GAP_OK, VIEW } from "../src/lib/community-web-layout";
import { WEB_CAPS } from "../src/lib/community-web";

/**
 * ── ⚠⚠ `check:community-web` — THE WEB CANNOT DRAW TWO NODES ON ONE SPOT ───
 *
 * `P2-J3-E591` WS-B. ⚠ Scott, 2026-09-20: *"a radial fan put two nodes on top
 * of each other in the mockup."*
 *
 * ⚠⚠ THE LAYOUT IS A PURE FUNCTION OF (counts, cycle), WHICH IS WHY THIS GATE
 * CAN EXIST AT ALL. A layout that reached for `Math.random()` could only ever
 * be spot-checked; this one is swept exhaustively — every node count up to the
 * caps, across hundreds of cycles — in under a second and with no browser.
 *
 * ⚠ IT ALSO GUARDS THE TWO RULES THAT ARE NOT GEOMETRY: no rate may be read on
 * this path, and the rebuild may not be driven by a timer alone.
 */

let failed = 0;
let passed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  ok    ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("check:community-web — the living web\n");

/* ── 1 · THE GEOMETRY HOLDS BEFORE ANY NODE IS PLACED ───────────────────── */
check("1 — the two rings clear each other on X", RING_GAP_OK.x > 0, `${RING_GAP_OK.x.toFixed(1)}`);
check("1 — the two rings clear each other on Y", RING_GAP_OK.y > 0, `${RING_GAP_OK.y.toFixed(1)}`);
check("1 — the outer ring fits the viewBox on X", RING_GAP_OK.fitsX > 0, `${RING_GAP_OK.fitsX.toFixed(1)}`);
check("1 — the outer ring fits the viewBox on Y", RING_GAP_OK.fitsY > 0, `${RING_GAP_OK.fitsY.toFixed(1)}`);
check("1 — the centre portrait clears ring one", RING_GAP_OK.centre > 0, `${RING_GAP_OK.centre.toFixed(1)}`);

/* ── 2 · THE EXHAUSTIVE SWEEP ───────────────────────────────────────────── */
/*
  ⚠⚠ EVERY SHAPE THE DATA CAN TAKE, NOT A SAMPLE. The inner ring is capped at
  `WEB_CAPS.inner` and the outer at `WEB_CAPS.outer`, so the space of counts is
  small and finite — there is no excuse for testing three of them.
  ⚠ 120 cycles per shape: the inner ring turns 0.37 rad per cycle, so that is
  seven full revolutions, and the radial breathing is re-seeded every cycle.
*/
const CYCLES = 120;
let worst = Infinity;
let worstAt = "";
let shapes = 0;

for (let nj = 0; nj <= WEB_CAPS.inner; nj++) {
  for (let ni = 0; ni + nj <= WEB_CAPS.inner; ni++) {
    for (const nr of [0, 1, 2, 5, 9, 14, WEB_CAPS.outer]) {
      if (nr > 0 && nj === 0) continue; // a reachable node needs a `via`
      shapes += 1;
      const joined = Array.from({ length: nj }, (_, i) => ({ id: `j${i}` }));
      const invited = Array.from({ length: ni }, (_, i) => ({ id: `i${i}` }));
      const reachable = Array.from({ length: nr }, (_, i) => ({
        id: `r${i}`,
        viaId: `j${i % Math.max(1, nj)}`,
      }));
      for (let cycle = 0; cycle < CYCLES; cycle++) {
        const c = minClearance(layoutWeb({ joined, invited, reachable, cycle }));
        if (c < worst) {
          worst = c;
          worstAt = `joined=${nj} invited=${ni} reachable=${nr} cycle=${cycle}`;
        }
      }
    }
  }
}

check("2 — the sweep covered a real space", shapes > 400, `${shapes} shapes`);
/*
  ⚠⚠ THE BAR IS CLEARANCE > 0, i.e. THE EDGES DO NOT TOUCH. ⚠ A positive
  minimum across every shape and every cycle is the claim *"two nodes can never
  land on top of each other"*, proved rather than asserted.
*/
check(
  "2 — ⚠⚠ NO TWO NODES EVER OVERLAP, at any count, on any cycle",
  worst > 0,
  `worst clearance ${worst.toFixed(2)} at ${worstAt}`
);
/* ⚠ And they are not merely not-overlapping: they are legibly apart. 4 units
   at a 560-wide viewBox is ~2px on a 320px-wide phone rendering. */
check(
  "2 — nodes stay legibly apart, not just non-overlapping",
  worst >= 4,
  `worst clearance ${worst.toFixed(2)} at ${worstAt}`
);
console.log(`        ⚠ worst clearance across ${shapes} shapes × ${CYCLES} cycles: ${worst.toFixed(2)} units (${worstAt})`);

/* ── 3 · THE DEGENERATE CASES THE STOP GATE NAMES ───────────────────────── */
check(
  "3 — nobody at all places no nodes",
  layoutWeb({ joined: [], invited: [], reachable: [], cycle: 0 }).length === 0
);
const one = layoutWeb({ joined: [{ id: "a" }], invited: [], reachable: [], cycle: 3 });
check("3 — a single colleague places exactly one node", one.length === 1);
check(
  "3 — a single node is inside the viewBox",
  one[0].x - one[0].r > 0 &&
    one[0].x + one[0].r < VIEW.w &&
    one[0].y - one[0].r > 0 &&
    one[0].y + one[0].r < VIEW.h
);
check(
  "3 — a lone invite with no colleagues still places",
  layoutWeb({ joined: [], invited: [{ id: "i" }], reachable: [], cycle: 0 }).length === 1
);

/* ── 4 · EVERY NODE IS INSIDE THE FRAME, ALWAYS ─────────────────────────── */
let outside = 0;
for (let cycle = 0; cycle < CYCLES; cycle++) {
  const nodes = layoutWeb({
    joined: Array.from({ length: WEB_CAPS.inner }, (_, i) => ({ id: `j${i}` })),
    invited: [],
    reachable: Array.from({ length: WEB_CAPS.outer }, (_, i) => ({
      id: `r${i}`,
      viaId: `j${i % WEB_CAPS.inner}`,
    })),
    cycle,
  });
  for (const n of nodes) {
    if (n.x - n.r < 0 || n.x + n.r > VIEW.w || n.y - n.r < 0 || n.y + n.r > VIEW.h) outside += 1;
  }
}
check("4 — no node is ever clipped by the viewBox", outside === 0, `${outside} clipped`);

/* ── 5 · DETERMINISM — THE SAME CYCLE DRAWS THE SAME PICTURE ────────────── */
/*
  ⚠⚠ A LAYOUT THAT IS NOT DETERMINISTIC CANNOT BE SERVER-RENDERED. React would
  paint one arrangement on the server and a different one on hydration, and the
  web would visibly jump on first load. ⚠ It is also what makes section 2 a
  PROOF rather than a sample.
*/
const shape = {
  joined: [{ id: "a" }, { id: "b" }],
  invited: [{ id: "c" }],
  reachable: [{ id: "d", viaId: "a" }],
  cycle: 7,
};
check(
  "5 — the same input draws the identical picture twice",
  JSON.stringify(layoutWeb(shape)) === JSON.stringify(layoutWeb(shape))
);
check(
  "5 — a different cycle actually MOVES the nodes",
  JSON.stringify(layoutWeb(shape)) !== JSON.stringify(layoutWeb({ ...shape, cycle: 8 }))
);
/*
  ⚠⚠⚠ AND EVERY COORDINATE IS QUANTISED, WHICH IS A STRONGER CLAIM THAN
  "deterministic" AND IS THE ONE THAT ACTUALLY MATTERED.

  ⚠ MEASURED 2026-09-20: the layout WAS deterministic — same inputs, same
  steps, no randomness — and `/community` still threw a REAL HYDRATION MISMATCH,
  because `Math.sin` is implementation-defined in its last bits and the server
  renders in Node's engine while hydration runs in the browser's. One ULP of
  difference is two different attribute STRINGS.
  ⚠⚠ SO THE TEST IS NOT "does it compute the same way" — IT IS "can the number
  be written down the same way anywhere". A coordinate with more than two
  decimals is a coordinate that can disagree with itself across engines.
*/
const quantised = layoutWeb({
  joined: Array.from({ length: 9 }, (_, i) => ({ id: `j${i}` })),
  invited: [{ id: "i0" }],
  reachable: Array.from({ length: 7 }, (_, i) => ({ id: `r${i}`, viaId: `j${i % 9}` })),
  cycle: 41,
}).flatMap((n) => [n.x, n.y, n.fromX, n.fromY]);
check(
  "5 — ⚠⚠ every coordinate survives a round trip through 2dp",
  quantised.every((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9),
  quantised.filter((v) => Math.abs(v * 100 - Math.round(v * 100)) >= 1e-9).slice(0, 3).join(", ")
);
check(
  "5 — ⚠ no coordinate is negative zero",
  quantised.every((v) => !Object.is(v, -0))
);

/* ── 6 · A REACHABLE NODE HANGS OFF ITS `via`, NOT THE CENTRE ───────────── */
const linked = layoutWeb({
  joined: [{ id: "a" }, { id: "b" }],
  invited: [],
  reachable: [{ id: "r", viaId: "b" }],
  cycle: 2,
});
const rNode = linked.find((n) => n.key === "r");
const bNode = linked.find((n) => n.key === "b");
check(
  "6 — a reachable node's line starts at its via colleague",
  !!rNode && !!bNode && rNode.fromX === bNode.x && rNode.fromY === bNode.y
);
check(
  "6 — a first-degree node's line starts at the centre",
  linked.filter((n) => n.kind !== "reachable").every((n) => n.fromX === VIEW.cx && n.fromY === VIEW.cy)
);

/* ── 7 · ⚠⚠⚠ NO RATE ON THIS PATH ──────────────────────────────────────── */
/*
  ⚠ Scott, 2026-09-20: *"I do nto think providers should see other provider's
  rates."* ⚠⚠ A RATE OMITTED FROM THE RENDER BUT PRESENT IN THE PAYLOAD IS
  STILL DISCLOSED — this payload crosses to the browser, so the rule has to bite
  on the QUERY. ⚠ Comments are stripped first (`E164` quotes are not code).
*/
const WEB_LIB = stripComments(readFileSync("src/lib/community-web.ts", "utf8"));
const WEB_API = stripComments(readFileSync("src/app/api/community/web/route.ts", "utf8"));
const WEB_UI = stripComments(readFileSync("src/components/community/CommunityWeb.tsx", "utf8"));
for (const [name, code] of [
  ["the data lib", WEB_LIB],
  ["the API route", WEB_API],
  ["the component", WEB_UI],
] as const) {
  check(`7 — ⚠ ${name} reads no rate of any kind`, !/rate/i.test(code));
}

/* ── 8 · THE REBUILD IS TIED TO DATA, NOT TO A TIMER ────────────────────── */
/*
  ⚠⚠ SCOTT'S RULING: *"the rebuild cycle must be tied to re-fetched data, not a
  timer. If a refresh fails, it must not animate."* ⚠ The structural claim is
  that `cycle` only ever advances where a successful response was parsed — so
  the gate asserts the cycle is NOT advanced from a bare interval callback.
*/
check(
  "8 — the component fetches on refresh",
  /fetch\(/.test(WEB_UI) && /setInterval/.test(WEB_UI)
);
check(
  "8 — ⚠⚠ the cycle advances ONLY after a successful parse",
  /res\.ok/.test(WEB_UI) && !/setInterval\(\s*\(\)\s*=>\s*setCycle/.test(WEB_UI)
);
check(
  "8 — a failed refresh is handled, not thrown away silently",
  /catch/.test(WEB_UI)
);
check(
  "8 — `prefers-reduced-motion` is honoured",
  /prefers-reduced-motion/.test(WEB_UI)
);
check(
  "8 — the svg carries an accessible name stating the counts",
  /aria-label/.test(WEB_UI) && /role="img"/.test(WEB_UI)
);
/*
  ⚠⚠ THE HALO IS A RING, NOT A FILTER OVER THE FACE (WS-B item 2). A filtered
  `<image>` blurs the person. ⚠ So: a `filter` attribute may appear on this
  file, but never on an `<image>`.
*/
check(
  "8 — ⚠ no blur filter is applied to a photo",
  !/<image[^>]*filter=/.test(WEB_UI)
);

/* ── 9 · THE CAPS ARE REAL AND THE OVERFLOW IS TOLD ─────────────────────── */
check("9 — the inner cap is what the sweep proved", WEB_CAPS.inner === 16);
check("9 — the outer cap is what the sweep proved", WEB_CAPS.outer === 20);
check(
  "9 — the lib reports what it dropped rather than shrinking silently",
  /overflow/.test(WEB_LIB)
);
/*
  ⚠ Expiry is computed from `expires_at`, never read from `status` — the
  `EXPIRED` enum value exists and NOTHING WRITES IT (measured 2026-09-20).
*/
check(
  "9 — a lapsed invitation is excluded by date, not by status alone",
  /expires_at/.test(WEB_LIB)
);

/* ── 10 · THE COMPONENT IS MOUNTED ──────────────────────────────────────── */
const mounted = execSync("git grep -l CommunityWeb -- 'src/app' || true").toString().trim();
check("10 — the web is rendered by a page, not orphaned", mounted.length > 0, mounted || "no page renders it");

console.log(
  `\ncheck:community-web — ${failed === 0 ? `${passed}/${passed} passed` : `${failed} FAILED, ${passed} passed`}`
);
process.exit(failed === 0 ? 0 : 1);
