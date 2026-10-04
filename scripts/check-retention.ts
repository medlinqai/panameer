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

{
  let threw: unknown = null;
  try {
    retentionCutoff("RESUME_RAW_TEXT");
  } catch (e) {
    threw = e;
  }
  check("2 — ⚠⚠ retentionCutoff THROWS while the window is unset",
    threw instanceof RetentionUndecidedError);
  check("2 — the error names what is undecided",
    threw instanceof Error && /RESUME_RAW_TEXT/.test(threw.message));
  check("2 — the error says whose decision it is",
    threw instanceof Error && /Scott|accountant/i.test(threw.message));
  const src = SRC.find((f) => f.path.endsWith("lib/retention.ts"))!;
  check("2 — ABSENCE: retention.ts contains no fallback number",
    !/\?\?\s*\d+|\|\|\s*\d+/.test(src.code), src.code.match(/\?\?\s*\d+|\|\|\s*\d+/)?.[0] ?? "");
}

{
  const isDevTool = (p: string) => /(^|[\\/])scripts[\\/]dev-[a-z-]+\.ts$/.test(p);
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
  const PERMITTED_PURGE = "src/lib/resume/import.ts";
  const unexpected = purges.filter((p) => p.path.replace(/\\/g, "/") !== PERMITTED_PURGE);
  check(
    "3 — ⚠⚠ ABSENCE: nothing deletes or blanks retained data EXCEPT the named supersession purge",
    unexpected.length === 0,
    unexpected.map((p) => p.path).join(", ")
  );
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
  const callers = SRC.filter(
    (f) => !f.path.endsWith("lib/retention.ts") && /retentionCutoff\s*\(/.test(f.code)
  );
  check("3 — ABSENCE: nothing calls retentionCutoff while it throws",
    callers.length === 0, callers.map((c) => c.path).join(", "));

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
