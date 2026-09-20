import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { stripComments, blankComments } from "./lib/strip-comments";

/**
 * ── ⚠⚠⚠ RULE 12, AS A TEST (`P2-J3-E590` WS-A) ────────────────────────────
 *
 * ⚠⚠ SCOTT, 2026-09-20: *"a convention that fails three times needs a test, not
 * a fourth reminder."*
 *
 * ── WHAT IT CATCHES ────────────────────────────────────────────────────────
 *
 * `E164` says superseded code is QUOTED, never deleted. `CLAUDE.md` rule 12 says
 * a quote must use `//` line comments, because **quoted code containing `*​/`
 * closes the enclosing block comment early and breaks the parse.**
 *
 * ⚠ IT HAS NOW FAILED THREE TIMES, EACH TIME AS A BUILD FAILURE:
 *   1. `scripts/check-community.ts` — `E558` WS-B, quoting a superseded assertion
 *   2. `e2e-shell/_auth.ts`         — `E567` WS-A, quoting a moved `signIn`
 *   3. `src/lib/completeness.ts`    — `E590` WS-A0, quoting a removed function
 *      whose doc comment carried the terminator
 *
 * ⚠⚠ `E164` GUARANTEES RECURRENCE, because quoting code IS the rule. This is
 * not a one-off; it is the shape the rule produces. So it gets a gate.
 *
 * ── ⚠⚠ WHAT IT DOES **NOT** DO ────────────────────────────────────────────
 *
 * ⚠ It does not ban `*​/` inside a block comment in general — a block comment
 * ENDS with one, and that is not a defect. It flags a terminator that appears
 * where the comment CONTINUES afterwards, which is the only shape that can
 * break a parse or silently truncate a quote.
 *
 * ⚠⚠ AND IT IS NOT A SUBSTITUTE FOR THE COMPILER. TypeScript already fails on
 * the broken-parse case. What the compiler CANNOT see is the second, quieter
 * failure: a block comment that stays syntactically valid while the QUOTE
 * inside it has been cut in half — which is exactly what happened on
 * `completeness.ts`, where the orphaned remainder sat in the file as live code
 * until it was noticed by hand.
 */

const files = execSync("git ls-files src scripts e2e e2e-shell prisma")
  .toString()
  .trim()
  .split("\n")
  .filter((f) => /\.(ts|tsx)$/.test(f));

/**
 * ⚠⚠ THE DETECTOR, NARROWED TO THE ACTUAL DEFECT SHAPE — AND THE FIRST DRAFT
 * IS QUOTED BECAUSE IT WAS WRONG IN AN INSTRUCTIVE WAY.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`): the first version flagged ANY
 * block-comment terminator with content after it on the same line. It fired 40+
 * times, almost all on JSX comments — `{/* … *​/}` legitimately ends with `}`
 * after the terminator. ⚠⚠ A GATE THAT CRIES WOLF FORTY TIMES IS A GATE
 * SOMEBODY DELETES.
 *
 * ⚠⚠⚠ THE REAL SHAPE IS NARROWER: a line that is QUOTING CODE (it starts with
 * `//`, which is what rule 12 tells you to quote with) and ALSO carries `*​/`,
 * while sitting inside an enclosing `/* … *​/` block. That terminator ends the
 * enclosing comment where the author meant it to continue — and everything
 * after it becomes live code.
 *
 * ⚠ That is exactly what happened on `completeness.ts` in `WS-A0`: a quoted doc
 * comment carried the terminator, the block closed early, and the remainder sat
 * in the file as syntax errors.
 */
export function scanSource(src: string): number[] {
  const lines = src.split("\n");
  const hits: number[] = [];
  let inBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (inBlock) {
      if (line.includes("*/")) {
        /*
          ⚠⚠⚠ THE TEST, AND IT TURNS ON WHAT COMES **NEXT**.

          A quoted line may legitimately carry the block's real terminator —
          a quoted line ending in the terminator is a tidy way to close a block.
          That is not the defect. (The literal is deliberately not written here —
          writing it would close THIS comment, which is the whole point.)

          ⚠ THE DEFECT IS A BLOCK THAT WAS MEANT TO CONTINUE. So: if a QUOTED
          line (`//`, which is what rule 12 says to quote with) closes the
          block, and the NEXT non-blank line is ALSO a quoted line, the author
          was still writing the quote and the comment ended underneath them.
          ⚠⚠ That is precisely the `completeness.ts` shape: a quoted doc comment
          carried `*​/`, and the rest of the quoted function fell out into code.
        */
        if (trimmed.startsWith("//")) {
          let j = i + 1;
          while (j < lines.length && lines[j].trim() === "") j++;
          if (j < lines.length && lines[j].trim().startsWith("//")) {
            hits.push(i + 1);
          }
        }
        inBlock = false;
      }
      continue;
    }

    const open = line.indexOf("/*");
    if (open === -1) continue;
    /*
      ⚠⚠ A `//` EARLIER ON THE LINE NEUTRALISES EVERYTHING AFTER IT. Without
      this the scan "enters" a block that does not exist — and this repo has
      whole modules parked behind `//`, with block comments inside the parked
      text (`credits.ts`, `community.ts`). ⚠ MEASURED: it produced five false
      positives, all of them commented-out code the compiler never sees.
    */
    const slashSlash = line.indexOf("//");
    if (slashSlash !== -1 && slashSlash < open) continue;
    /* ⚠ Opened and closed on one line — never the defect. */
    if (line.indexOf("*/", open + 2) !== -1) continue;
    inBlock = true;
  }
  return hits;
}

type Finding = { file: string; line: number; text: string };
const findings: Finding[] = [];
for (const file of files) {
  const src = readFileSync(file, "utf8");
  for (const line of scanSource(src)) {
    findings.push({
      file,
      line,
      text: src.split("\n")[line - 1].trim().slice(0, 110),
    });
  }
}

/* ── the report ─────────────────────────────────────────────────────────── */
let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ok    ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("check:comment-quotes — rule 12, as a test\n");

check(
  "the scan reads a real file set",
  files.length > 100,
  `only ${files.length} files`
);

/*
  ⚠⚠ MUTATION-TEST THE SCAN ITSELF. A structural scan nobody has seen fire is a
  scan whose logic might match nothing at all — this codebase has shipped exactly
  that before (`check:resume`, `E586`: 0 passed, 0 failed, and a green exit).
*/
const scanText = (t: string) => scanSource(t).length;

check(
  "MUTATION: it fires on a quoted line carrying the terminator",
  scanText(
    ["/*", "  SUPERSEDED, quoted:", "  // /** doc */", "  // more quoted code", "*/"].join("\n")
  ) === 1
);
check(
  "MUTATION: it does NOT fire on an ordinary block comment",
  scanText(["/*", "  just prose", "*/"].join("\n")) === 0
);
check(
  "MUTATION: it does NOT fire on a JSX comment",
  scanText("{/* a jsx comment */}") === 0
);
check(
  "MUTATION: it does NOT fire on a multi-line JSX comment",
  scanText(["{/*", "  prose", "*/}"].join("\n")) === 0
);
check(
  "MUTATION: it does NOT fire when a quoted line carries the REAL close",
  scanText(["/*", "  SUPERSEDED:", "  // const a = 1; */", "const b = 2;"].join("\n")) === 0
);
check(
  "MUTATION: a `//` before a `/*` on the same line opens no block",
  scanText(["// /**", "//  * parked module text", "//  */", "// const x = 1;"].join("\n")) === 0
);
check(
  "MUTATION: it does NOT fire on a QUOTED line with no terminator",
  scanText(["/*", "  // const a = 1;", "*/"].join("\n")) === 0
);

/*
  ── ⚠⚠ THE SHARED STRIPPER, ASSERTED HERE (`P2-J3-E591` WS-B rider) ─────────

  ⚠⚠⚠ FIVE MISCOUNTS OF ONE SHAPE, THE FIFTH BEING A **JSX** COMMENT —
  `AttentionStrip.tsx:224`, a `<Link href="/community">` inside `{​/* … *​/}`,
  reported as a live link in `E591` WS-A's own link inventory. ⚠ Scott:
  *"the stripper is the fix."*

  ⚠ THIS GATE IS THE RIGHT HOME because it is already the COMMENT gate: rule 12
  lives here, and `E164` is why both defects exist. ⚠⚠ THE SCAN ABOVE AND THE
  STRIPPER BELOW ARE DIFFERENT JOBS — the scan finds a comment that ENDS too
  early, the stripper decides whether a grep hit is LIVE. Same rule, two costs.
*/
check(
  "STRIPPER: a JSX comment is removed whole, braces and all",
  stripComments('{/* <Link href="/community" /> */}').trim() === ""
);
check(
  "STRIPPER: the exact E591 miscount — a link inside a JSX comment is not live",
  !stripComments(['{/*', '  <Link href="/community">', "  Community Credits", "*/}"].join("\n"))
    .includes("/community")
);
check(
  "STRIPPER: a multi-line JSX comment leaves no stray brace behind",
  !/[{}]/.test(stripComments(["{/*", "  prose", "*/}"].join("\n")))
);
check(
  "STRIPPER: block and line comments still go",
  stripComments(["/* block */", "// line", "const live = 1;"].join("\n")).includes("const live") &&
    !stripComments(["/* block */", "// line", "const live = 1;"].join("\n")).includes("block")
);
check(
  "STRIPPER: a URL in live code survives — `//` after `:` is not a comment",
  stripComments('const u = "https://panameer.com";').includes("https://panameer.com")
);
check(
  "STRIPPER: MUTATION — it does NOT strip live code that merely looks adjacent",
  stripComments('const o = { a: 1 }; // note').includes("{ a: 1 }")
);
/*
  ⚠⚠ `blankComments` IS THE ONE AN INVENTORY ACTUALLY WANTS, because a report
  that says `file:line` has to have the right line. ⚠ A stripper that DELETES a
  comment renumbers every line after it — which would have turned one wrong
  count into a wrong count AND a wrong citation.
*/
/*
  ⚠⚠⚠ THE REGRESSION TEST FOR THE BUG THE STRIPPER SHIPPED WITH (`E591` WS-C).

  ⚠ The first version let the opening brace match ANY brace — a function's
  included — and its lazy body then ran forward to the next block terminator
  that happened to be followed by a closing brace. (The terminator is described
  rather than written: writing it here would close THIS comment, which is the
  very trap rule 12 is about and the fifth time it has bitten.)
  ⚠⚠ ON A REAL FILE THAT ERASED FORTY LINES OF LIVE CODE, and
  `check:community-page` reported 43/43 while scanning a page with a hole in it.
  ⚠⚠⚠ A GATE GREEN ABOUT NOTHING IS `E586`, reproduced by the helper written to
  stop a measurement error.
*/
check(
  "STRIPPER: ⚠⚠⚠ a function brace + a docblock does NOT swallow the body",
  stripComments(
    [
      "function f() {",
      "  /* a docblock */",
      "  const live = 1;",
      "  return (",
      "    <div className=\"keep-me\">",
      "      {/* a jsx comment */}",
      "    </div>",
      "  );",
      "}",
    ].join("\n")
  ).includes("keep-me") &&
    stripComments(
      ["function f() {", "  /* d */", "  const live = 1;", "  {/* x */}", "}"].join("\n")
    ).includes("const live")
);
check(
  "STRIPPER: blankComments has the same fix, not just the same intent",
  blankComments(
    ["function f() {", "  /* d */", "  const live = 1;", "  {/* x */}", "}"].join("\n")
  ).includes("const live")
);

check(
  "STRIPPER: blankComments preserves the line count exactly",
  blankComments(["const a = 1;", "/*", " x", "*/", "const b = 2;"].join("\n")).split("\n")
    .length === 5
);
check(
  "STRIPPER: blankComments keeps live code on its ORIGINAL line number",
  blankComments(["{/*", '  <Link href="/community">', "*/}", "const live = 1;"].join("\n"))
    .split("\n")[3]
    .includes("const live")
);

check(
  "ABSENCE: no block comment in the repo is closed early by a quote",
  findings.length === 0,
  findings.map((f) => `${f.file}:${f.line}  ${f.text}`).join("\n        ")
);

console.log(
  `\ncheck:comment-quotes — ${failed === 0 ? "all passed" : `${failed} FAILED`}`
);
process.exit(failed === 0 ? 0 : 1);
