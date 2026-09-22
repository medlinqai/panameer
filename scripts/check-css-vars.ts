/**
 * `check:css-vars` — no CSS rule reads a custom property nothing defines
 * (`P2-A3-E601` WS-D). `npm run check:css-vars`.
 *
 * ── ⚠⚠⚠ THE DEFECT: AN UNDEFINED CSS VARIABLE FAILS **SILENTLY** ──────────
 *
 * ⚠ Found at `E601` WS-B: the new hero's *Invite a Colleague* button rendered
 * **white text on a transparent background — invisible** — because its CSS said
 * `var(--magenta)`, and this is **Tailwind v4**, where the token is
 * `--color-magenta`.
 * ⚠⚠ NOTHING WARNED. Not `tsc`, not `next build`, not `eslint`. The browser
 * drops the declaration and paints nothing. ⚠⚠⚠ AND IT IS INVISIBLE TO A
 * SCREENSHOT TOO: white-on-white is indistinguishable from *"not rendered yet"*.
 * It was caught by reading `getComputedStyle`, which is not something anybody
 * does by habit.
 *
 * ⚠ SCOTT, 2026-09-22: *"A gate that fails on an undefined custom property,
 * asserted by shape across every CSS file."*
 *
 * ── ⚠⚠ BY SHAPE, NOT BY A LIST OF KNOWN-BAD NAMES (`E587`) ────────────────
 *
 * ⚠ It does not know that `--magenta` is wrong. It knows that **every
 * `var(--x)` must have an `--x` defined somewhere**, and it derives BOTH sides
 * from the tree at run time. ⚠⚠ A token renamed tomorrow is caught tomorrow,
 * with no edit here.
 *
 * ── ⚠⚠⚠ THE THREE WAYS A CUSTOM PROPERTY IS DEFINED IN THIS APP ───────────
 *
 * ⚠ Getting this wrong is how a gate like this becomes a nuisance that gets
 * deleted. ⚠⚠ **THE FIRST VERSION OF THIS SWEEP REPORTED 14 AND EIGHT WERE
 * FALSE** — it knew only about CSS declarations:
 *   1. **a CSS declaration** — `--x: value;`
 *   2. ⚠⚠ **`next/font`** — `variable: "--font-geist-sans"` in `layout.tsx`
 *      puts the property on a class; nothing in any `.css` file declares it.
 *   3. ⚠⚠ **an inline style** — `style={{ ["--fnl-h" as string]: … }}`, which
 *      is how `home.css`'s layout variables are set from the component that
 *      knows the number.
 * ⚠⚠⚠ ALL THREE ARE LEGITIMATE. A gate that only understood the first would
 * have failed on eight correct lines, and would have been switched off.
 *
 * ⚠ **COMMENTS ARE STRIPPED FIRST**, the same discipline `check:community` and
 * `check:derived-source` carry: `E164` quotes superseded code, and this file's
 * own subject matter means those quotes contain the exact broken `var()` this
 * gate looks for. ⚠⚠ MEASURED — WITHOUT STRIPPING, THE FIX'S OWN EXPLANATORY
 * COMMENT FAILED THE GATE.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

/**
 * ⚠ `/* … *\/` only — CSS has no line comments.
 * ⚠⚠⚠ IT PRESERVES THE LINE COUNT, AND THAT IS NOT COSMETIC. The first version
 * replaced each comment with a single space, so every reported line number was
 * wrong below the first comment — the mutation proof pointed at **line 224 for
 * a defect on line 324**. ⚠ A gate that names the wrong line costs more time
 * than it saves, and the person reading it has no way to know it is lying.
 */
const stripCss = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
/** ⚠ TS/TSX carries both forms, and `E164` uses the line form by rule 12. */
const stripTs = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

function walk(dir: string, test: RegExp, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) {
      if (!/node_modules|\.next|\.git/.test(full)) walk(full, test, out);
    } else if (test.test(full)) out.push(full);
  }
  return out;
}

const cssFiles = walk("src", /\.css$/);
const tsFiles = walk("src", /\.tsx?$/);

/* ⚠⚠ `E586` — A GATE WITH NO INPUTS MUST FAIL. An empty sweep would report a
   perfect score over nothing, which is the defect `check:resume` embodies. */
check("0 — ⚠⚠ the sweep found CSS files to read (E586)", cssFiles.length > 0, `${cssFiles.length}`);
check("0 — ⚠⚠ the sweep found TS files to read (E586)", tsFiles.length > 0, `${tsFiles.length}`);
if (!cssFiles.length || !tsFiles.length) report();

/* ── the DEFINED set, from all three sources ───────────────────────────── */
const defined = new Set<string>();
for (const f of cssFiles) {
  const src = stripCss(readFileSync(f, "utf8"));
  for (const m of src.matchAll(/(^|[;{\s])(--[A-Za-z0-9_-]+)\s*:/g)) defined.add(m[2]);
}
for (const f of tsFiles) {
  const src = stripTs(readFileSync(f, "utf8"));
  /* ⚠ source 2 — `next/font`'s `variable: "--font-x"`. */
  for (const m of src.matchAll(/variable:\s*["'](--[A-Za-z0-9_-]+)["']/g)) defined.add(m[1]);
  /* ⚠ source 3 — an inline style, in either spelling React accepts. */
  for (const m of src.matchAll(/\[\s*["'](--[A-Za-z0-9_-]+)["']/g)) defined.add(m[1]);
  for (const m of src.matchAll(/["'](--[A-Za-z0-9_-]+)["']\s*:/g)) defined.add(m[1]);
  /* ⚠ and a direct `setProperty("--x", …)`, which nothing uses today but is
     the obvious fourth way somebody will reach for. */
  for (const m of src.matchAll(/setProperty\(\s*["'](--[A-Za-z0-9_-]+)["']/g)) defined.add(m[1]);
}
check("1 — ⚠ the sweep found custom properties defined (E586)", defined.size > 0, `${defined.size}`);

/* ── every READ, checked against it ─────────────────────────────────────── */
const offenders: string[] = [];
let reads = 0;
for (const f of cssFiles) {
  const lines = stripCss(readFileSync(f, "utf8")).split("\n");
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) {
      reads += 1;
      if (defined.has(m[1])) continue;
      /* ⚠⚠ THE FALLBACK IS NOT A DEFENCE. `var(--nope, #fff)` renders the
         fallback, so it LOOKS fine — and the variable it names is still dead,
         so a theme change can never reach it. Both are reported. */
      const hasFallback = /var\(\s*--[A-Za-z0-9_-]+\s*,/.test(line.slice(m.index));
      offenders.push(
        `${relative(".", f)}:${i + 1} reads ${m[1]}${hasFallback ? " (fallback masks it)" : " ⚠ NO FALLBACK — renders as nothing"}`
      );
    }
  });
}
check("2 — ⚠⚠ the sweep actually read some var() calls (E586)", reads > 0, `${reads} reads`);
check(
  "2 — ⚠⚠⚠ every var(--x) names a custom property something defines",
  offenders.length === 0,
  offenders.join("\n      ")
);

console.log(
  `check:css-vars — ${cssFiles.length} css files · ${defined.size} properties defined · ${reads} var() reads`
);

function report(): never {
  if (failures.length) {
    console.error(`\ncheck:css-vars — ${failures.length} FAILED, ${pass} passed\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`check:css-vars — ${pass}/${pass} passed`);
  process.exit(0);
}
report();
