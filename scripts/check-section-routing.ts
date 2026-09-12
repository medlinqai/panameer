/**
 * `check:section-routing` — every section the inventory finds becomes a row
 * (`P1-A1.4-E410` WS-4). `npm run check:section-routing`.
 *
 * ── ⚠⚠ THE ASSERTION THAT HAD TO EXIST AND DID NOT ────────────────────────
 *
 * `ai-passes.ts` filtered the inventory and handed **44 of 49 sections** to a
 * pass that returned 0 or failed `shape`. Nothing asserted that a section
 * survives to extraction, so 29-found/7-imported shipped and was misdiagnosed
 * for two days as a token-capacity problem. ⚠ `E409` measured it: the employers
 * pass returns 49 of 49 at 31% of budget. **The sections were never asked for.**
 *
 * ⚠ §4 pins `E409`'s own fix — `usage` on the FAILURE branch of `runPass`.
 * Losing it is what made a `shape` failure and a truncation indistinguishable.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE EVERY SCAN, and §0 proves it — this file and
 * the file it guards both quote the forbidden shapes at length.
 * ⚠ NO MODEL CALL. Nothing here costs anything to run.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

const PASSES = join("src", "lib", "resume", "ai-passes.ts");
const RAW = readFileSync(PASSES, "utf8");
const CODE = strip(RAW);

/* ═══ 0 · PROVE THE STRIP ═════════════════════════════════════════════════ */
{
  check("0 — a block comment is stripped", !/ghostToken/.test(strip("/* ghostToken */ real")));
  check("0 — a line comment is stripped", !/ghostToken/.test(strip("// ghostToken\nreal")));
  check("0 — live code survives", /realToken/.test(strip("/* ghostToken */ realToken")));
  /* ⚠ THE SUPERSEDED FILTER IS QUOTED IN THIS VERY FILE — if the strip failed,
     §1 would read that quote as live code and pass while the bug was back. */
  check(
    "0 — ⚠ the superseded filter quote is invisible to the scan",
    !/kind !== "engagement"/.test(CODE) || !/filter\(\(i\) => i\.kind !== "engagement"\)/.test(CODE)
  );
}

/* ═══ 1 · ⚠⚠ NO SECTION IS DROPPED BEFORE EXTRACTION ═════════════════════ */
{
  /*
    ⚠ SUPERSEDED, quoted not deleted (`P1-A1.4-E415` WS-2):

        /employersPass\(text,\s*inv\.value\)/

    ⚠ `E415` ADDED A THIRD ARGUMENT — the containing request's clock — so the
    call is now `employersPass(text, inv.value, startedAt)` and a pattern that
    required the closing paren right after `inv.value` went red on a change
    that has nothing to do with routing.

    ⚠⚠ WHAT THIS ASSERTION PROTECTS IS UNCHANGED AND IS RE-PINNED BELOW: the
    SECOND argument must be the whole `inv.value`, never a filtered subset.
    `E410`'s defect was `inv.value.filter((i) => i.kind !== "engagement")` in
    that position, and §1's next assertion still forbids exactly that.
  */
  check(
    "1 — ⚠⚠ the extraction pass receives the WHOLE inventory",
    /employersPass\(text,\s*inv\.value[,)]/.test(CODE),
    "it must not be handed a filtered subset"
  );
  /* ⚠ THE EXACT SHAPE THAT CAUSED THE DEFECT. A `kind` filter feeding the
     extraction pool is the regression; a filter used only to TYPE a row is not,
     which is why this looks for the filter reaching `employersPass`. */
  check(
    "1 — ⚠⚠ ABSENCE: no kind-filtered subset is passed to employersPass",
    !/employersPass\(text,\s*employers/.test(CODE),
    "44 of 49 sections were filtered out here"
  );
  check(
    "1 — ABSENCE: the old subset-or-everything fallback is gone",
    !/employers\.length \? employers : inv\.value/.test(CODE)
  );
  /* ⚠ AND THE RECALL CONTRACT COUNTS EVERY SECTION, not the employer subset —
     otherwise the app reports a shortfall it just fixed. */
  check("1 — recall is measured against the whole inventory", /headings: inv\.value\.length/.test(CODE));
}

/* ═══ 2 · `kind` TYPES THE ROW ═══════════════════════════════════════════ */
{
  check(
    "2 — an engagement section becomes a PROJECT row",
    /kind === "engagement"/.test(CODE) && /sectionProjects/.test(CODE)
  );
  check(
    "2 — an employer section stays an EMPLOYER row",
    /kind !== "engagement"/.test(CODE) && /sectionEmployers/.test(CODE)
  );
  check("2 — the employer rows come from the section split", /employers: sectionEmployers/.test(CODE));
  check("2 — the project rows include the section split", /projects: \[\.\.\.sectionProjects/.test(CODE));
  /* ⚠⚠ NO PARENT IS INVENTED FROM PROXIMITY — a converted engagement carries a
     null employer and lands `unplaced` for the person to place. */
  check("2 — ⚠ a converted engagement invents no parent", /employer: null,/.test(CODE));
  /* ⚠ INDEX ALIGNMENT IS CHECKED, NOT ASSUMED. */
  check(
    "2 — the split is abandoned when the counts disagree",
    /emp\.value\.length === inv\.value\.length/.test(CODE),
    "a mis-split would file real jobs as projects"
  );
}

/* ═══ 3 · `kind` IS RETAINED IN THE INVENTORY SCHEMA (E164) ══════════════ */
{
  check(
    "3 — `kind` survives on the inventory item",
    /kind: z\.enum\(\["employer", "engagement"\]\)/.test(CODE),
    "it is now a default rather than a route — retained, not deleted"
  );
}

/* ═══ 4 · ⚠⚠ `usage` STAYS ON THE FAILURE BRANCH (E409's fix) ════════════ */
{
  check(
    "4 — the failure variant of PassOutcome carries usage",
    /ok: false;[\s\S]{0,120}usage\?: ModelUsage/.test(CODE)
  );
  check("4 — a shape failure returns its usage", /reason: "shape"[\s\S]{0,240}usage: call\.usage/.test(CODE));
  check(
    "4 — ⚠ a failed pass reports finishReason, outputTokens and reasoningTokens",
    /finishReason: r\.usage\?\.finishReason/.test(CODE) &&
      /outputTokens: r\.usage\?\.outputTokens/.test(CODE) &&
      /reasoningTokens: r\.usage\?\.reasoningTokens/.test(CODE),
    "losing this is what made a shape failure and a truncation indistinguishable"
  );
}

/* ═══ 5 · NOT IN SCOPE — THE FUNNEL AND CHUNKING STAY UNBUILT ════════════
   ⚠ `E409`'s measurement refuted the capacity premise: every pass finishes
   `stop` at under ~31% of budget. A chunk/batch appearing here would be a remedy
   for a squeeze that does not exist, and `E410` forbids it explicitly. */
{
  check(
    "5 — ABSENCE: no pass chunks or batches its input",
    !/\.slice\(\s*\w+\s*,\s*\w+\s*\)[\s\S]{0,60}Pass\(/.test(CODE) &&
      !/for \(const batch of/.test(CODE),
    "the funnel and chunking are out of scope — the capacity premise was refuted"
  );
  check("5 — the detail passes still run together", /await Promise\.all\(\[/.test(CODE));
}

if (failures.length) {
  console.error(`\ncheck:section-routing — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:section-routing — ${pass}/${pass} passed`);
