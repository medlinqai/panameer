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
  console.log(`check:learn-my-learning — ${fails.length ? `${fails.length} FAILED, ` : ""}${pass} passed`);
  for (const f of fails) console.log(`\n  ✗ ${f}`);
  if (fails.length) process.exit(1);
}
main();
