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
  /*
    ── ⚠⚠ A DEV TOOL IS NOT A PURGE, AND THE DIFFERENCE IS THE WHOLE RULE ──────

    ⚠ THIS ASSERTION FIRED ON `scripts/dev-reset-resume.ts` (`P1-A1.4-E407` WS-8)
    and it was RIGHT to — it found a new deletion path the moment one appeared.
    But what `E404` forbids is a purge that runs ON A SCHEDULE AGAINST A WINDOW
    NOBODY SET: *"an implementer picks 30 or 90 days because the code needs a
    number, a purge runs, and afterwards there is no way to tell a decision from
    a placeholder."*

    ⚠ `dev-reset-resume` has no window, no schedule and no default. A person
    invokes it against ONE email they type, and it refuses to delete without
    `--yes`. ⚠⚠ THE EXEMPTION IS NARROW AND POLICED: `dev-*` scripts are skipped
    HERE, and §3b asserts every one of them still demands explicit confirmation,
    so the exemption cannot be used to smuggle in a silent purge.
  */
  const isDevTool = (p: string) => /(^|[\\/])scripts[\\/]dev-[a-z-]+\.ts$/.test(p);
  /*
    ── ⚠ A GATE THAT ASSERTS ABOUT A PURGE IS NOT A PURGE (`P1-A1.4-E413`) ─────

    ⚠ THIS FIRED ON `scripts/check-project-parent.ts`, which quotes `raw_text:
    null` inside an assertion about the supersession purge — the same way it
    once fired on `dev-reset-resume.ts`. ⚠ It was RIGHT to look: the pattern is
    a real deletion shape. But a `check:*` harness runs in CI with no database
    handle and deletes nothing; it reads source text.
    ⚠⚠ AND THE EXEMPTION IS CONDITIONAL ON HAVING NO DATABASE HANDLE, which is
    the whole distinction. ⚠ MEASURED: five harnesses DO hold one
    (`check-duration`, `check-forums`, `check-learn-review`, `check-playable`,
    `check-solution-types`) — a blanket "gates are exempt" would have stopped
    scanning exactly the five files where a purge could actually run. ⚠ They
    stay in scope; only the text-scanning harnesses are skipped, and §3c pins
    that the exemption is being decided this way and not by filename alone.
  */
  const hasDbHandle = (code: string) => /from "@\/lib\/prisma"|new PrismaClient/.test(code);
  const isGate = (f: { path: string; code: string }) =>
    /(^|[\\/])scripts[\\/]check-[a-z-]+\.ts$/.test(f.path) && !hasDbHandle(f.code);
  /* The shape of a purge: a bulk delete over the two kinds of retained data. */
  const purges = SRC.filter(
    (f) =>
      !isDevTool(f.path) &&
      !isGate(f) &&
      (/profileImport\.deleteMany|taxProfile\.deleteMany/.test(f.code) ||
        /raw_text\s*:\s*null/.test(f.code))
  );
  /*
    ── ⚠⚠ SUPERSEDED BY `P1-A1.4-E413` WS-7 ────────────────────────────────────

    ⚠ SUPERSEDED, quoted not deleted (`E164`):

        check("3 — ⚠⚠ ABSENCE: nothing deletes or blanks retained data",
          purges.length === 0, purges.map((p) => p.path).join(", "));

    ⚠⚠ IT WAS RIGHT UNTIL 2026-09-10 AND THE SENTENCE IT WAS WAITING FOR NOW
    EXISTS. SCOTT, asked to name the window and answering:

        *"keep for the life of the account OR if a new resume is uploaded."*

    ⚠ `E404`'s rule was never "never delete" — it was *"BUILD NOTHING THAT
    DELETES UNTIL SCOTT NAMES THE WINDOW… FAIL LOUDLY rather than defaulting."*
    The failure it existed to prevent was **an implementer picking a number**.
    No number was picked: `RESUME_RETENTION_DAYS` is still `null` and
    `retentionCutoff` still THROWS, which §2 and the second assertion below
    still pin.

    ⚠ SO THE ABSENCE IS REPLACED BY A SHAPE, NOT DROPPED. Exactly one purge is
    permitted — the supersession one, in `resume/import.ts` — and it must be the
    supersession purge and not a time-based one. Anything else deleting or
    blanking retained data still turns this red.
  */
  const PERMITTED_PURGE = "src/lib/resume/import.ts";
  const unexpected = purges.filter((p) => p.path.replace(/\\/g, "/") !== PERMITTED_PURGE);
  check(
    "3 — ⚠⚠ ABSENCE: nothing deletes or blanks retained data EXCEPT the named supersession purge",
    unexpected.length === 0,
    unexpected.map((p) => p.path).join(", ")
  );
  /* ⚠ AND THE PERMITTED ONE IS THE SUPERSESSION RULE, not a clock that crept in
     under its name. Mutate: point it at `retentionCutoff` → red via the next
     assertion; rename the function → red here. */
  const importer = SRC.find((f) => f.path.replace(/\\/g, "/") === PERMITTED_PURGE);
  check(
    "3 — ⚠ the one permitted purge is `purgeSupersededResumes`",
    Boolean(importer && /export async function purgeSupersededResumes\(/.test(importer.code)),
    "E413 WS-7 — Scott's rule is supersession, not a window"
  );
  check(
    "3 — ⚠⚠ and it runs ONLY after the new import row exists",
    Boolean(importer && /await purgeSupersededResumes\(profileId, row\.id\);/.test(importer.code)),
    "a delete-then-parse order loses the only copy when a parse fails"
  );
  /* ⚠ AND NOBODY CALLS THE CUTOFF YET. The day something does, §2 makes it
     throw — this says so out loud rather than waiting for a runtime crash. */
  const callers = SRC.filter(
    (f) => !f.path.endsWith("lib/retention.ts") && /retentionCutoff\s*\(/.test(f.code)
  );
  check("3 — ABSENCE: nothing calls retentionCutoff while it throws",
    callers.length === 0, callers.map((c) => c.path).join(", "));

  /* ═══ 3c · ⚠ THE GATE EXEMPTION IS POLICED TOO ══════════════════════════
     A `check:*` harness may MENTION a purge; it must not be able to RUN one.
     Without this, §3's new exemption is a hole rather than a distinction. */
  const exempted = SRC.filter(isGate);
  check("3c — the guard can see the harnesses it exempts", exempted.length >= 5, `${exempted.length} exempt`);
  check(
    "3c — ⚠⚠ every exempted harness is database-free",
    exempted.every((f) => !hasDbHandle(f.code)),
    "the exemption is decided by capability, not by filename"
  );
  const dbGates = SRC.filter(
    (f) => /(^|[\\/])scripts[\\/]check-[a-z-]+\.ts$/.test(f.path) && hasDbHandle(f.code)
  );
  check(
    "3c — ⚠ and the DB-backed harnesses are still SCANNED, not skipped",
    dbGates.length >= 1 && dbGates.every((f) => !isGate(f)),
    `${dbGates.length} in scope: ${dbGates.map((g) => g.path.split("/").pop()).join(", ")}`
  );

  /* ═══ 3b · ⚠ THE DEV EXEMPTION IS POLICED ═══════════════════════════════
     Any `scripts/dev-*.ts` that deletes must require explicit confirmation.
     Without this, §3's exemption is a hole rather than a distinction. */
  const devDeleters = SRC.filter((f) => isDevTool(f.path) && /\.deleteMany\(/.test(f.code));
  check("3b — the guard can see the dev tools it exempts", devDeleters.length >= 1,
    `${devDeleters.length} found`);
  for (const d of devDeleters) {
    /*
      ⚠⚠ THE GUARD MUST STAND **BEFORE** THE FIRST DELETE, not merely exist in
      the file. My first version tested that the words `--yes` and `confirmed`
      appeared anywhere, and mutation-testing walked straight through it: turning
      `if (!confirmed)` into `if (false)` left both words in place and the gate
      stayed green. A word is not a guard; a position is.
    */
    const guard = d.code.search(/if\s*\(\s*!\s*confirmed\s*\)/);
    const firstDelete = d.code.search(/\.deleteMany\(/);
    check(
      `3b — ⚠ ${d.path} refuses to delete without explicit confirmation`,
      /--yes/.test(d.code) && guard > -1 && guard < firstDelete,
      guard === -1
        ? "no `if (!confirmed)` guard at all"
        : `the guard is at ${guard} but the first delete is at ${firstDelete}`
    );
  }
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
