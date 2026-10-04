import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const stripCss = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
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
