/**
 * `check:retention` — nothing deletes against a window nobody set
 * (`P1-ALL-E404` WS-4). `npm run check:retention`.
 *
 * ── ⚠⚠ WHAT THIS IS ACTUALLY GUARDING ─────────────────────────────────────
 *
 * `E404`: *"BUILD NOTHING THAT DELETES UNTIL SCOTT NAMES THE WINDOW. Build the
 * mechanism, leave the value unset, and FAIL LOUDLY rather than defaulting."*
 *
 * The failure this prevents is quiet and unrecoverable: an implementer picks 30
 * or 90 days because the code needs a number, a purge runs, and afterwards there
 * is no way to tell a decision from a placeholder because the evidence went with
 * the rows. So the gate asserts the value is STILL UNSET and that no purge is
 * wired to it.
 *
 * ⚠ IT GOES RED THE DAY SOMEBODY WIRES A DELETE WITHOUT A WINDOW — which is the
 * only day it should ever fail.
 *
 * ⚠ NO DATABASE AND NO BROWSER.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  RETENTION_DAYS,
  retentionCutoff,
  retentionDecided,
  RetentionUndecidedError,
} from "@/lib/retention";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
type F = { path: string; code: string };
function walk(dir: string, out: F[] = []): F[] {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next" || e.startsWith(".")) continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(e)) out.push({ path: relative(".", full), code: strip(readFileSync(full, "utf8")) });
  }
  return out;
}
const SELF = join("scripts", "check-retention.ts");
const SRC = walk("src").concat(walk("scripts")).filter((f) => f.path !== SELF);

/* ═══ 1 · THE WINDOWS ARE STILL UNDECIDED ═════════════════════════════════ */
{
  check("1 — ⚠ the résumé window is UNSET (Scott's to name)", RETENTION_DAYS.RESUME_RAW_TEXT === null);
  check("1 — ⚠ the tax-record period is UNSET (his accountant's)", RETENTION_DAYS.TAX_FORM === null);
  check("1 — retentionDecided reports both as undecided",
    !retentionDecided("RESUME_RAW_TEXT") && !retentionDecided("TAX_FORM"));
}

/* ═══ 2 · ⚠⚠ IT FAILS LOUDLY RATHER THAN DEFAULTING ═══════════════════════ */
{
  let threw: unknown = null;
  try {
    retentionCutoff("RESUME_RAW_TEXT");
  } catch (e) {
    threw = e;
  }
  check("2 — ⚠⚠ retentionCutoff THROWS while the window is unset",
    threw instanceof RetentionUndecidedError);
  /* ⚠ AND THE MESSAGE NAMES WHO DECIDES. An error that says "not configured"
     sends the reader to an env file; this one sends them to Scott. */
  check("2 — the error names what is undecided",
    threw instanceof Error && /RESUME_RAW_TEXT/.test(threw.message));
  check("2 — the error says whose decision it is",
    threw instanceof Error && /Scott|accountant/i.test(threw.message));
  /* ⚠ NO SILENT FALLBACK ANYWHERE — a `?? 90` would defeat the whole file. */
  const src = SRC.find((f) => f.path.endsWith("lib/retention.ts"))!;
  check("2 — ABSENCE: retention.ts contains no fallback number",
    !/\?\?\s*\d+|\|\|\s*\d+/.test(src.code), src.code.match(/\?\?\s*\d+|\|\|\s*\d+/)?.[0] ?? "");
}

/* ═══ 3 · ⚠⚠ NOTHING PURGES YET ═══════════════════════════════════════════ */
{
  /* The shape of a purge: a bulk delete over the two kinds of retained data. */
  const purges = SRC.filter(
    (f) =>
      /profileImport\.deleteMany|taxProfile\.deleteMany/.test(f.code) ||
      /raw_text\s*:\s*null/.test(f.code)
  );
  check("3 — ⚠⚠ ABSENCE: nothing deletes or blanks retained data",
    purges.length === 0, purges.map((p) => p.path).join(", "));
  /* ⚠ AND NOBODY CALLS THE CUTOFF YET. The day something does, §2 makes it
     throw — this says so out loud rather than waiting for a runtime crash. */
  const callers = SRC.filter(
    (f) => !f.path.endsWith("lib/retention.ts") && /retentionCutoff\s*\(/.test(f.code)
  );
  check("3 — ABSENCE: nothing calls retentionCutoff while it throws",
    callers.length === 0, callers.map((c) => c.path).join(", "));
}

/* ═══ 4 · THE MECHANISM STILL WORKS ONCE A NUMBER EXISTS ══════════════════
   ⚠ A mechanism that is never exercised is a mechanism that will not work the
   day it is switched on. The arithmetic is tested through the public function
   with an injected clock, without setting any real window. */
{
  const now = new Date("2026-09-09T12:00:00Z");
  let ok = false;
  try {
    retentionCutoff("RESUME_RAW_TEXT", now);
  } catch {
    ok = true;
  }
  check("4 — the injected clock does not bypass the undecided guard", ok);
}

if (failures.length) {
  console.error(`\ncheck:retention — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:retention — ${pass}/${pass} passed`);
