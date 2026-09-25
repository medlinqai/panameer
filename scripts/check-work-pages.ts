import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * ── ⚠⚠⚠ `check:work-pages` — RULING 18, MADE ENFORCEABLE (`E621c` WS-C) ──
 *
 * ⚠ SCOTT, 2026-09-24 (ruling 18): *"None….we are in the process of building the
 * application…we just haven't gotten there."* ⚠⚠ **Net effect, in the ruling's
 * own words: the pages are QUIET about what is unbuilt, not DISHONEST about what
 * is countable. No "coming soon", no "we'll get there", and no fake zeros.**
 *
 * ⚠⚠⚠ **THIS GATE EXISTS BECAUSE THE RULING WAS MADE AND THEN VIOLATED
 * TWENTY-FIVE TIMES BY ONE COMPONENT.** `E611` removed four *"Coming soon"*
 * sites by hand; `components/ComingSoon.tsx` rendered the same sentence on
 * twenty-five more and nobody looked at it, because a hand-sweep counts SITES and
 * the shared component is one site that is twenty-five. ⚠ **A ruling with no gate
 * is a ruling that lasts until the next person writes a page.**
 *
 * ── ⚠⚠ WHAT IT DOES **NOT** POLICE, AND WHY EACH IS DELIBERATE ──────────
 *
 * ⚠⚠⚠ **A GATE THAT FAILS ON CORRECT CODE IS A GATE SOMEBODY SWITCHES OFF**, so
 * the population is narrowed on purpose rather than swept app-wide:
 * · **legal content** (`src/content/legal/**`) — *"we do not guarantee the Site
 *   will be available at any given time"* is a DISCLAIMER, and *"please check
 *   back for updates"* is standard cookie-policy language. Neither is a product
 *   promise, and rewriting counsel's words to satisfy a copy rule is worse than
 *   the rule.
 * · **admin surfaces** (`src/app/admin/**`, `components/admin/**`) — these
 *   ACCURATELY DESCRIBE what a learner sees (*"it stays 'coming soon'"*).
 *   ⚠ An admin telling a human what the member's screen says is reporting, not
 *   promising, and banning the phrase there would make the admin unable to name
 *   the thing it exists to fix.
 * · **marketing** (the two `components/marketing` folders) — ⚠⚠ note the glob is
 *   spelled out rather than written with a star-slash: a `*` followed by a `/`
 *   inside a block comment CLOSES IT EARLY, which is `CLAUDE.md` rule 12 and is
 *   the third time it has bitten. ⚠ A roadmap shown to a PROSPECT is
 *   a different speech act from a promise shown to a MEMBER who is trying to
 *   work. ⚠⚠ Ruling 18 is about the product; changing the marketing pitch is
 *   Scott's, not a gate's.
 *
 * ⚠ Everything else under `src/app/(app)`, `src/app/(auth)` and `src/components`
 * is in scope — the signed-in product.
 */
let pass = 0;
const fails: string[] = [];
const notes: string[] = [];
const check = (name: string, ok: boolean, why = "") => {
  if (ok) pass += 1;
  else fails.push(`${name}${why ? ` — ${why}` : ""}`);
};

/** ⚠ Comments are stripped: `E164` quotes the banned strings ON PURPOSE. */
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

function walk(d: string, o: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    if (e === "node_modules" || e === ".next" || e.startsWith(".")) continue;
    const f = join(d, e);
    if (statSync(f).isDirectory()) walk(f, o);
    else if (/\.tsx?$/.test(f)) o.push(relative(".", f));
  }
  return o;
}

const p = (...xs: string[]) => xs.join(sep);
const EXEMPT = [
  p("src", "content", "legal"),
  p("src", "app", "admin"),
  p("src", "components", "admin"),
  p("src", "components", "marketing"),
  p("src", "components", "marketing-home"),
];

function main() {
  const ALL = walk("src");
  const SCOPE = ALL.filter((f) => !EXEMPT.some((e) => f.startsWith(e)));

  /* ── ⚠⚠ POPULATIONS FIRST (`E586`) ─────────────────────────────────────
     ⚠⚠⚠ A gate with no inputs must FAIL, and the exemption list is itself an
     input: if it ever swallowed the whole tree every assertion below would pass
     by asserting nothing. Both halves are counted. */
  check("0 — the source scan found files (E586)", ALL.length > 200, `${ALL.length}`);
  check("0 — the in-scope population is real (E586)", SCOPE.length > 150, `${SCOPE.length} of ${ALL.length}`);
  check(
    "0 — ⚠⚠ the exemptions are a minority of the tree",
    ALL.length - SCOPE.length < ALL.length / 3,
    `${ALL.length - SCOPE.length} exempt — an exemption list that eats the tree is not an exemption`
  );

  /* ═══ 1 · ⚠⚠⚠ RULING 18 — NO PROMISE, NO DATE, NO APOLOGY ═══════════════ */
  const BANNED: [RegExp, string][] = [
    [/\bcoming soon\b/i, "ruling 18 bans it by name"],
    [/\bwe'?ll get there\b/i, "ruling 18 quotes this one"],
    [/\bstay tuned\b/i, "a promise with a date implied"],
    [/\bcheck back (soon|later|often)\b/i, "a promise with a date implied"],
    [/\bnot (yet )?built yet\b/i, "a roadmap confession"],
    [/\bisn'?t (built|finished) yet\b/i, "a roadmap confession"],
    [/\bwhen this opens\b/i, "says the feature is shut when it is not"],
  ];
  const hits: string[] = [];
  for (const f of SCOPE) {
    const code = strip(readFileSync(f, "utf8"));
    for (const [re, why] of BANNED) {
      const m = re.exec(code);
      if (m) hits.push(`${f}: "${m[0]}" — ${why}`);
    }
  }
  check(
    "1 — ⚠⚠⚠ no page in the signed-in product promises, dates or apologises (ruling 18)",
    hits.length === 0,
    hits.join(" · ")
  );
  /* ⚠⚠ AND THE SWEEP CAN CATCH ONE — each pattern proved against a sample, so a
     regex that silently stopped matching cannot pass as a clean sweep (`E607`). */
  for (const [re, why] of BANNED) {
    const sample = {
      "coming soon": "This area is coming soon.",
      "get there": "We'll get there soon.",
      "stay tuned": "Stay tuned for updates.",
      "check back": "Please check back later.",
      "built yet": "This is not built yet.",
      "finished yet": "Settlement isn't finished yet.",
      "opens": "you'll be near the top when this opens",
    };
    const s = Object.entries(sample).find(([k]) => re.test(sample[k as keyof typeof sample]));
    check(`1 — MUTATION: the sweep catches ${re.source.slice(0, 26)}`, s != null, why);
  }

  /* ⚠⚠⚠ AND THE SHARED COMPONENT SPECIFICALLY — it is one site that is 25. */
  const cs = strip(readFileSync(p("src", "components", "ComingSoon.tsx"), "utf8"));
  check(
    "1 — ⚠⚠⚠ the SHARED stub component says nothing about a schedule",
    !/coming soon/i.test(cs),
    "E611 swept four sites by hand and left the component that renders twenty-five"
  );
  const mounts = SCOPE.filter((f) => /\bComingSoon\b/.test(strip(readFileSync(f, "utf8")))).length;
  check("1 — ⚠ and it really is mounted widely (E586)", mounts >= 15, `${mounts} files`);
  notes.push(`ruling 18: the shared stub is mounted in ${mounts} in-scope files — one edit, ${mounts} pages`);

  /* ═══ 2 · ⚠⚠ NO PAGE CLAIMS A MECHANISM IS ABSENT WHEN IT IS NOT ════════
     ⚠⚠⚠ THE MIRROR OF RULING 18, AND THE ONE THAT BIT TWICE THIS WEEK. A page
     saying *"nothing creates one yet"* about a thing that IS created sends a
     member away from a feature that works. ⚠ Derived: for each writer that now
     exists, assert no in-scope file claims its absence. */
  const WRITERS: [string, string, RegExp][] = [
    ["a work order", p("src", "lib", "work-orders.ts"), /nothing creates (one|a work order)|no work order can be (built|created)/i],
    ["a proposal", p("src", "lib", "proposals.ts"), /Proposal model, which doesn'?t exist|nothing creates a (ProviderBid|proposal)/i],
    ["an interview", p("src", "lib", "interviews.ts"), /nothing creates an? (InterviewRequest|interview)/i],
    ["an invitation", p("src", "lib", "work-request-invite.ts"), /work-invitation model, which doesn'?t exist|can'?t invite you to propose/i],
  ];
  for (const [label, writerFile, claim] of WRITERS) {
    let exists = false;
    try {
      exists = /\.(create|createMany|upsert)\b/.test(readFileSync(writerFile, "utf8"));
    } catch {
      exists = false;
    }
    check(`2 — ⚠ the writer for ${label} exists (E586)`, exists, writerFile);
    if (!exists) continue;
    const liars = SCOPE.filter((f) => claim.test(strip(readFileSync(f, "utf8"))));
    check(
      `2 — ⚠⚠⚠ nothing claims ${label} cannot be created, because it can`,
      liars.length === 0,
      `${liars.join(", ")} — a page that under-claims is not conservative, it is wrong`
    );
  }

  /* ═══ 3 · ⚠⚠ A DASH CARRIES ITS REASON, AND THE REASON IS NEUTRAL ═══════
     ⚠ Ruling 18's surviving half: a figure nothing writes shows a dash AND a
     reason, and the reason is *"a short neutral one such as 'not counted yet'.
     Never a date, a promise, or an apology."* */
  const statsSrc = strip(readFileSync(p("src", "lib", "statistics.ts"), "utf8"));
  const reasons = [...statsSrc.matchAll(/uncounted:\s*"([^"]+)"/g)].map((m) => m[1]!);
  check("3 — ⚠ dash reasons were found (E586)", reasons.length >= 1, `${reasons.length}`);
  const blaming = reasons.filter((r) => /\byou\b|\byour\b/i.test(r));
  check("3 — ⚠⚠ no dash reason addresses the member", blaming.length === 0, blaming.join(" · "));
  const promising = reasons.filter((r) => BANNED.some(([re]) => re.test(r)));
  check("3 — ⚠⚠⚠ no dash reason promises, dates or apologises", promising.length === 0, promising.join(" · "));
  notes.push(`dash reasons in use: ${reasons.map((r) => `"${r}"`).join(", ")}`);

  /* ═══ 4 · ⚠⚠ NO FIGURE ON THESE PAGES IS A LITERAL ═════════════════════
     ⚠ WS-C item 4: *"every printed figure matches a direct database count, and
     no figure is a literal in the source."* ⚠⚠ Asserted where it is checkable —
     a hard-coded count rendered as a member's figure. */
  const PAGES = SCOPE.filter(
    (f) =>
      f.startsWith(p("src", "app", "(app)", "orders")) ||
      f.startsWith(p("src", "app", "(app)", "payments")) ||
      f.startsWith(p("src", "app", "(app)", "find-work"))
  );
  check("4 — the three page families were found (E586)", PAGES.length >= 3, `${PAGES.length}`);
  const literals: string[] = [];
  for (const f of PAGES) {
    const code = strip(readFileSync(f, "utf8"));
    /* ⚠ A JSX text node that is a bare number of two or more digits beside a
       figure label. ⚠⚠ Single digits are excluded deliberately — they are almost
       always layout (`grid-cols-2`), and a false red here costs more than the
       case it catches. */
    const m = /<(dd|strong|b)[^>]*>\s*\d{2,}\s*<\//.exec(code);
    if (m) literals.push(`${f}: ${m[0].slice(0, 40)}`);
  }
  check(
    "4 — ⚠⚠ no figure is a literal in these pages' source",
    literals.length === 0,
    literals.join(" · ")
  );
}

try {
  main();
} catch (e) {
  fails.push(`the gate itself threw — ${(e as Error).message}`);
}
for (const n of notes) console.log(`  · ${n}`);
console.log(`check:work-pages — ${fails.length ? `${fails.length} FAILED, ` : ""}${pass} passed`);
for (const f of fails) console.log(`\n  ✗ ${f}`);
/* ⚠⚠ A GATE WITH NO INPUTS FAILS (`E586`). */
if (pass < 20) {
  console.log(`\n  ✗ E586 — only ${pass} assertions ran; this gate has ~28`);
  process.exit(1);
}
if (fails.length) process.exit(1);
