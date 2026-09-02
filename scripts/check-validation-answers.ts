import { readFileSync } from "fs";

/**
 * `check:validation-answers` — the four ways `P1-J2.1-E024` goes wrong.
 *
 *   1 ⚠⚠ THE CONFIRMATION MUST COMMIT BEFORE, AND INDEPENDENT OF, THE ANSWERS.
 *     This is the assertion that protects the whole feature. If a `status` write
 *     ever appears inside the answer path, a client who answers badly — or whose
 *     save fails — could lose a validation they already earned.
 *   2 EVERY ANSWER FIELD IS NULLABLE. One `String` without a `?` turns an optional
 *     question into a required one at the database level.
 *   3 BOTH CONSENT FLAGS DEFAULT FALSE, and nothing renders a testimonial without
 *     checking both.
 *   4 `saveValidationAnswers` NEVER WRITES `status`.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SCAN. This file and the source it reads both
 * NAME the forbidden tokens in prose; a scanner that read comments would fail on
 * its own documentation, and the fix for that is always to weaken the scanner.
 */
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, detail?: unknown) => {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail === undefined ? "" : ` → ${JSON.stringify(detail)}`}`);
  }
};

const lib = strip(readFileSync("src/lib/project-validation.ts", "utf8"));
const schema = readFileSync("prisma/schema.prisma", "utf8");

// ── 1 + 4 — the answer path cannot touch the badge ─────────────────────────
const answerFn = lib.slice(lib.indexOf("export async function saveValidationAnswers"));
check(
  "saveValidationAnswers exists",
  answerFn.length > 0
);
check(
  "⚠ saveValidationAnswers never writes `status`",
  !/status\s*:/.test(answerFn),
  answerFn.match(/status\s*:[^,\n]*/)?.[0]
);
check(
  "⚠ saveValidationAnswers never writes `responded_at`",
  !/responded_at\s*:/.test(answerFn)
);
check(
  "⚠ saveValidationAnswers never touches the Project row",
  !/prisma\.project\.update/.test(answerFn)
);

// the confirm write still lives in its own function, ahead of any answer write
const respondFn = lib.slice(
  lib.indexOf("export async function respondToValidation"),
  lib.indexOf("export async function saveValidationAnswers")
);
check(
  "⚠⚠ the CONFIRMED write is in respondToValidation, not the answer path",
  /CONFIRMED/.test(respondFn) && !/CONFIRMED/.test(answerFn)
);

// ── 2 — every answer field nullable ────────────────────────────────────────
const model = schema.slice(
  schema.indexOf("model ProjectValidation {"),
  schema.indexOf("}", schema.indexOf("model ProjectValidation {"))
);
for (const f of [
  "responder_name",
  "responder_title",
  "worked_from",
  "worked_to",
  "role_note",
  "would_work_again",
  "testimonial",
  "answered_at",
]) {
  const line = model.split("\n").find((l) => l.trim().startsWith(f + " "));
  check(`${f} is nullable`, Boolean(line && /\?/.test(line)), line?.trim());
}
check(
  "skills_noted is a String[] (a list, never required)",
  /skills_noted\s+String\[\]/.test(model)
);

// ── 3 — consent defaults, and nothing publishes without both ───────────────
check(
  "testimonial_public defaults false",
  /testimonial_public\s+Boolean\s+@default\(false\)/.test(model)
);
check(
  "attribution_public defaults false",
  /attribution_public\s+Boolean\s+@default\(false\)/.test(model)
);

/*
  ⚠ NOTHING RENDERS A TESTIMONIAL YET — this brief CAPTURES, it does not publish.
  The check is therefore that no read path exists which reads `testimonial`
  WITHOUT also reading `testimonial_public`. It passes vacuously today and starts
  biting the moment somebody builds the display.
*/
import { readdirSync, statSync } from "fs";
import { join } from "path";
const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
};
const offenders = walk("src").filter((f) => {
  if (f.endsWith("project-validation.ts")) return false;
  const src = strip(readFileSync(f, "utf8"));
  return /\btestimonial\b/.test(src) && !/testimonial_public|testimonialPublic/.test(src);
});
check(
  "⚠ no read path renders a testimonial without checking consent",
  offenders.length === 0,
  offenders
);

console.log(`\ncheck:validation-answers — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
