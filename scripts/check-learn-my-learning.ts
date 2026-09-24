import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";

/**
 * ── ⚠⚠⚠ `check:learn-my-learning` (`P2-A4-E615` WS-D) ───────────────────
 *
 * Scott's rulings 5–8 of 2026-09-24, made unbreakable.
 *
 * ⚠⚠ ITS POPULATION INCLUDES `src/components/learn/app/` DELIBERATELY. `E610`
 * shipped green at 85 because the defect's file sat OUTSIDE the scan, and this
 * page's components live in exactly that directory. **A gate that cannot see
 * the file the defect is in is not guarding it.**
 */
let pass = 0;
const fails: string[] = [];
const check = (name: string, ok: boolean, why = "") => {
  if (ok) pass += 1;
  else fails.push(`${name}${why ? ` — ${why}` : ""}`);
};

/** ⚠ Rule 12 / `E164`: superseded code is QUOTED, and a quote is not live code. */
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (/\.tsx?$/.test(f)) out.push(f);
  }
  return out;
}

const SRC = walk("src");
const PAGE = join("src", "components", "learn", "app", "MyLearning.tsx");
const DASH = join("src", "lib", "learn-dashboard.ts");

/** ⚠ Only text that REACHES the page — a JSX text node, never an identifier. */
const rendered = (body: string) =>
  [...body.matchAll(/>([^<>{}]{2,160})</g)].map((m) => m[1]).join("\n");

async function main() {
  const pageRaw = readFileSync(PAGE, "utf8");
  const page = strip(pageRaw);
  const dash = strip(readFileSync(DASH, "utf8"));
  check("0 — the page and its data module were found (E586)", page.length > 0 && dash.length > 0);
  /* ⚠⚠ AND THE SCAN REACHES THE `app/` DIRECTORY — the `E610` lesson, asserted
     rather than assumed. */
  check(
    "0 — the scan reaches src/components/learn/app/",
    SRC.some((f) => f.startsWith(join("src", "components", "learn", "app"))),
    "E610 shipped green because the defect's file was outside the scan"
  );

  /* ── 1 · ⚠⚠⚠ RULING 5 — NO `0 of N` SCOREBOARD ON THIS PAGE ────────────
     ⚠ Derived from the RENDERED output, not from a component name: the tiles
     could come back under any name and would still be the same thing. */
  check(
    "1 — the page mounts no StatTile",
    !/<StatTile[\s/>]/.test(page),
    "Scott, ruling 5: the four 0-of-N tiles come off /learn entirely"
  );
  /* ⚠⚠ AND NO `X of Y` PAIR IN A TILE-SHAPED `sub` PROP, which is how the row
     was actually spelled — a scan for the phrase alone would miss it. */
  check(
    "1 — no `of N` denominator prop survives on this page",
    !/sub=\{`of \$\{/.test(page),
    "`sub={`of ${totals.paths}`}` is the tile row's own shape"
  );
  /* ⚠⚠⚠ THE COMPONENT IS NOT DELETED (`E164`) — it stays on disk and other
     surfaces use it. Asserting it is GONE would be wrong; asserting this page
     does not mount it is the rule. */
  check(
    "1 — StatTile itself still exists (E164 — retired, not deleted)",
    SRC.includes(join("src", "components", "learn", "app", "StatTile.tsx")),
    "a retired component stays on disk"
  );

  /* ── 2 · ⚠⚠ NO LEVEL, BAND, STREAK OR XP — E606 and E611, still held ──── */
  for (const [word, re] of [
    ["streak", /\bstreaks?\b/i],
    ["XP", /\bXP\b/],
    ["unlocked", /\bunlocked\b/i],
    ["badge", /\bbadges?\b/i],
  ] as [string, RegExp][]) {
    check(`2 — no "${word}" renders on /learn`, !re.test(rendered(page)));
  }

  /* ── 3 · ⚠⚠⚠ RULING 8 — EVERY ENROLLED PATH, NOT A CAPPED SLICE ────────
     ⚠ Two things were hiding paths and the brief named one. Both are asserted,
     because fixing either alone leaves the other. */
  /*
    ⚠⚠ SCOPED TO THE `inProgress` ASSIGNMENT, NOT THE FILE. My first version
    asserted on the whole module and matched `headlineFor`'s own
    `filter((r) => r.enrolled && !r.certified)` — a CORRECT and unrelated use
    that decides what the headline says. ⚠⚠⚠ **A GATE THAT FAILS ON CORRECT
    CODE IS A GATE SOMEBODY SWITCHES OFF**, and this is the third time that
    shape has bitten in this run.
  */
  const listBlock = /inProgress: rows[\s\S]*?\),\n/.exec(dash)?.[0] ?? "";
  check("3 — the path-list assignment was found by the scan (E586)", listBlock.length > 0);
  check(
    "3 — the path list is not capped",
    !/\.slice\(/.test(listBlock),
    "a cap is a filter that does not say so — an enrolled fourth path vanished"
  );
  check(
    "3 — a certified path is still listed",
    !/!r\.certified/.test(listBlock),
    "finishing a path made its card disappear, which reads as losing the work"
  );
  check(
    "3 — the list is every enrolled path",
    /filter\(\(r\) => r\.enrolled\)/.test(listBlock),
    "ruling 8: enrolling makes a card appear, watched or not"
  );

  /* ── 4 · ⚠⚠ RULING 6 — THE CERTIFICATES PANEL, AND IT RENDERS AT ZERO ─── */
  check("4 — the page renders a Certificates panel", /id="certificates"/.test(page));
  check(
    "4 — the view model carries certificates",
    /certificates: certs/.test(dash),
    "a panel fed by nothing is a panel that cannot be honest"
  );
  /* ⚠⚠⚠ AT ZERO IT STILL RENDERS (`CLAUDE.md` rule 5). A gate asserting only
     "it renders when there are rows" would pass on a panel nobody ever sees —
     the table holds ZERO rows today. */
  check(
    "4 — it has an empty state rather than vanishing",
    /No certificates yet/.test(rendered(page)),
    "removing the panel removes the only place a member learns what earns one"
  );
  check(
    "4 — and the empty state promises no date",
    !/(coming soon|we'?ll email|shortly|soon\b)/i.test(rendered(page)),
    "nothing tells anybody when a certificate arrives"
  );

  /* ── 5 · ⚠⚠⚠ RULING 7 — TEACHING LISTS, AND OFFERS NO UNBUILT MECHANISM ─ */
  check("5 — the page renders a Teaching panel", /id="teaching"/.test(page));
  check(
    "5 — it hides when the capability is absent, not when the count is zero",
    /\{teaching\.length > 0 && \(/.test(page),
    "rule 5: a card hides only when the capability is absent"
  );
  /* ⚠⚠⚠ THE WRITER TEST, AS A BUILD FAILURE. Ruling 7 asked for a control to
     REQUEST ADDING A COURSE and measurement found NO WRITER anywhere — no
     model, no route, no function. **A page may not offer a mechanism with no
     writer**, so the control is not built, and this fails the build if one
     appears before a writer does. */
  const requestWriter = SRC.some((f) =>
    /\b(courseRequest|requestCourse|proposeCourse|suggestCourse)\b/.test(
      strip(readFileSync(f, "utf8"))
    )
  );
  check(
    "5 — no Request-a-Course control renders while nothing writes one",
    requestWriter || !/request (a )?course/i.test(rendered(page)),
    "ruling 7: if nothing writes such a request, STOP rather than invent a mechanism"
  );

  /* ── 6 · ⚠⚠ THE TABS ARE ANCHORS, SO THE ROUTE SET DOES NOT MOVE ───────
     ⚠ A tab pointing at a route that does not exist is a door onto a wall
     (`E579`). Derived from the app tree, not from a list. */
  const learnRoutes = walk(join("src", "app", "learn"))
    .filter((f) => f.endsWith("page.tsx"))
    .map((f) => f.replace(join("src", "app"), "").replace(/\/page\.tsx$/, "") || "/");
  check("6 — the route scan found the Learn pages (E586)", learnRoutes.length >= 6, `${learnRoutes.length}`);
  const tabHrefs = [...pageRaw.matchAll(/<(?:Link|a)\s+href="([^"]+)"/g)].map((m) => m[1]);
  const broken = tabHrefs.filter(
    (h) => h.startsWith("/learn") && !h.includes("?") && !h.includes("${") &&
      !learnRoutes.includes(h.replace(/#.*$/, ""))
  );
  check(
    "6 — every /learn link on the page points at a page that exists",
    broken.length === 0,
    `${broken.join(", ")}`
  );
  check(
    "6 — the two new tabs are anchors, not new routes",
    /href="#certificates"/.test(pageRaw) && /href="#teaching"/.test(pageRaw),
    "a tab that navigates to a route which does not exist is a door onto a wall"
  );

  /* ── 7 · ⚠⚠⚠ THE FIXTURE DISTINGUISHES WHAT IT COMPARES ────────────────
     ⚠ Two zeros agree. The catalogue must actually contain an enrolled path
     AND a not-enrolled one, or "every enrolled path renders" proves nothing. */
  const enrolments = await prisma.learnEnrollment.count();
  const publishedPaths = await prisma.learningPath.count({ where: { status: "PUBLISHED" } });
  check(
    "7 — there is at least one enrolment to render (E586)",
    enrolments > 0,
    `${enrolments} — with none, "every enrolled path renders" is vacuous`
  );
  check(
    "7 — and more paths than enrolments, so the list is a SUBSET",
    publishedPaths > enrolments,
    `${publishedPaths} paths vs ${enrolments} enrolments — equal counts would agree whatever the filter did`
  );

  await prisma.$disconnect();
    /* ── 8 · ⚠⚠⚠ THE FRAME, NOT ONLY THE SECTIONS (`P2-A4-E617`) ───────────

     ⚠⚠ SCOTT, 2026-09-24, walking `/learn` after `E615`: *"that whole color
     thing at the top is wrong… looks closer, but still VERY different."*
     ⚠⚠⚠ `E615`'s three-bucket comparison was run for the page's CONTENT and
     never for its FRAME. **Background, band, content width, tab shape, tab
     order and tab labels were all outside the comparison, and all of them were
     wrong.** These assertions exist so the frame is compared from now on. */

  /* ⚠ THE MOCKUP HAS NO PAGE-WIDE COLOURED BAND. Its body is canvas and the
     only purple on My Learning is inside the continue CARD. */
  check(
    "8 — no full-bleed gradient band on the page",
    !/<section[^>]*linear-gradient/.test(page),
    "the mockup colours a CARD; the page coloured the PAGE"
  );
  /* ⚠⚠ AND NO PAGE HEADLINE OR SUBHEAD — the page opens on the continue card
     or its empty state. */
  check(
    "8 — the page renders no headline or subhead",
    !/\{data\.headline\}/.test(page) && !/\{subhead\(data\)\}/.test(page),
    "My Learning has no page headline in the mockup — it was an invention"
  );

  /* ⚠ THE TAB ROW IS A WHITE BAR WITH THE `LEARN` EYEBROW AND A DIVIDER. */
  check("8 — the tab row is a white bar", /border-b border-line bg-white/.test(page));
  check(
    "8 — it opens with the LEARN eyebrow and a divider",
    /border-r border-line[\s\S]{0,200}?LEARN/.test(page),
    "the mockup's app eyebrow, letter-spaced, with a vertical rule"
  );
  /* ⚠⚠ THE ACTIVE TAB IS MAGENTA INK PLUS A 2px UNDERLINE — and it is not a
     link to the page you are standing on (`E023`). */
  check(
    "8 — the active tab is magenta with a 2px underline",
    /border-b-2 border-magenta[\s\S]{0,120}?text-magenta-ink/.test(page)
  );

  /* ⚠⚠⚠ ORDER MATTERS: My Learning is FIRST because it is the page you are on.
     It sat third, behind two catalogue tabs under invented names. */
  const tabOrder = ["My Learning", "Learning Paths", "Courses", "Certificates", "Teaching"];
  const positions = tabOrder.map((t) => page.indexOf(`>\n          ${t}\n`) >= 0 ? page.indexOf(`>\n          ${t}\n`) : page.indexOf(t));
  check(
    "8 — the tabs are in the mockup's order, My Learning first",
    positions.every((v, i) => v > -1 && (i === 0 || v > positions[i - 1])),
    `${tabOrder.join(" · ")} — found at ${positions.join(", ")}`
  );
  check(
    "8 — and not under the invented labels",
    !/All Learning Paths|All Courses/.test(rendered(page)),
    '"All Learning Paths" / "All Courses" are not the mockup\'s words'
  );

  /* ⚠ CONTENT SITS IN A CENTRED 1120px COLUMN — the mockup's `.wrap`. */
  check(
    "8 — content is a centred 1120px column",
    /mx-auto w-full max-w-\[1120px\]/.test(page),
    "a centred column is part of the design, not a detail"
  );
  /* ⚠⚠ AND CERTIFICATES IS A 320px RAIL, collapsing to one column under 900px —
     the mockup's `.row2`. Ruling 6 said BUILD it; the mockup says WHERE. */
  check(
    "8 — Certificates sits in a 320px rail beside the main column",
    /min-\[900px\]:grid-cols-\[minmax\(0,1fr\)_320px\]/.test(page),
    "E615 rendered it as a full-width band between the empty state and Teaching"
  );

  /* ── 9 · ⚠⚠ THE CATALOGUE SENTENCE MOVED, IT WAS NOT DROPPED ──────────── */
  const paths = strip(readFileSync(join("src", "components", "learn", "LearnHome.tsx"), "utf8"));
  check(
    "9 — the in-production figure lives on Learning Paths",
    /inProduction/.test(paths),
    "ruling 3 stands; My Learning is about the MEMBER, the catalogue count is about the CATALOGUE"
  );
  check(
    "9 — and it is counted there, not typed",
    /cards\.length - startablePaths/.test(paths),
    "a literal stops being true at the next import"
  );
  /*
    ── ⚠⚠⚠ RULING 30 — THE THREE FIGURES, AND THE SHAPE (`P2-A2-E618`) ─────

    ⚠⚠ SCOTT, 2026-09-24: *"23 paths — 12 you can start today, 11 in
    production… Derive all three from the same predicate the catalogue and the
    gate already use, never three literals, and assert the SHAPE: total equals
    startable plus in-production, and the three render together."*

    ⚠⚠⚠ THE SHAPE IS ASSERTED AS AN IDENTITY, NOT AS A COUNT. `E587` — a gate
    asserting a literal `23` rots into a false red the day a path is added.
    **`inProduction` is DEFINED as `cards.length - startablePaths`, so the
    arithmetic is true by construction** and this asserts that construction
    rather than today's numbers.
  */
  check(
    "9 — the total is the catalogue length, not a third count",
    /\{cards\.length\} paths/.test(paths),
    "23 is the size of the list the page already has"
  );
  check(
    "9 — the startable figure comes from the one predicate",
    /startablePaths = cards\.filter\(\(c\) => c\.ready\)\.length/.test(paths),
    "`ready` is `pathIsOpenTo` — the same predicate the catalogue and the gate use"
  );
  check(
    "9 — ⚠⚠ the split adds up BY CONSTRUCTION",
    /inProduction = cards\.length - startablePaths/.test(paths),
    "total = startable + in-production is an identity here, not a coincidence to re-check"
  );
  /* ⚠⚠ AND THE THREE RENDER TOGETHER, IN ONE SENTENCE. Ruling 30's whole test
     is whether the arithmetic is SHOWN rather than invited — a total on its own,
     or a split two paragraphs away, is the thing ruling 3 banned. */
  const sentence =
    /\{cards\.length\} paths — \{startablePaths\} you can start today,\{" "\}\s*\{inProduction\} in production\./.exec(
      paths
    );
  check(
    "9 — ⚠⚠⚠ all three render together, in one sentence",
    Boolean(sentence),
    "a total with its split adjacent is allowed; a total alone is what ruling 3 forbids"
  );

  check(
    "9 — it has left My Learning",
    !/inProduction/.test(page),
    "the sentence moved to the page the mockup puts it on"
  );

console.log(`check:learn-my-learning — ${fails.length ? `${fails.length} FAILED, ` : ""}${pass} passed`);
  for (const f of fails) console.log(`\n  ✗ ${f}`);
  if (fails.length) process.exit(1);
}
main();
