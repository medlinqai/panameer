import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = "src";
const GATE = join(SRC, "lib", "learn-enrolment-gate.ts");

let pass = 0;
const fails: string[] = [];
function check(name: string, ok: boolean, why = "") {
  if (ok) pass += 1;
  else fails.push(`${name}${why ? ` — ${why}` : ""}`);
}

function strip(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
}

const files = walk(SRC);

/* ── 1 · THE RULE EXISTS AND IS ONE FUNCTION ───────────────────────────── */
const gateRaw = readFileSync(GATE, "utf8");
const gate = strip(gateRaw);
check("1 — the enrolment gate module exists", gateRaw.length > 0);
check(
  "1 — it exports one refusal function",
  /export async function learnEnrolmentRefusal\(/.test(gate),
  "the rule is a function callers import, not a block they copy"
);

check(
  "1 — condition 1 is learnGaps, the shared identity bar",
  /await learnGaps\(userId\)/.test(gate),
  "the field list is LEARN_BAR's; a list here would be a second bar"
);
check(
  "1 — condition 2 is pathIsOpenTo over pathHasPlayableLessons",
  /pathIsOpenTo\(pathHasPlayableLessons\(path\), false\)/.test(gate),
  "a new enrolment does not get to count itself as the reason it is allowed"
);
check(
  "1 — the gate imports both predicates rather than restating them",
  /import \{ pathHasPlayableLessons, pathIsOpenTo \} from "@\/lib\/learn"/.test(gateRaw),
  "a hand-rolled copy agrees until the rule changes"
);

const WRITE = /\blearnEnrollment\.(create|createMany|upsert)\b/;
const writers = files.filter((f) => {
  if (f === GATE) return false;
  return WRITE.test(strip(readFileSync(f, "utf8")));
});

check(
  "2 — the scan found the enrolment writers",
  writers.length >= 2,
  `${writers.length} file(s) write a LearnEnrollment — a scan with no inputs is not a check`
);

for (const f of writers) {
  const body = strip(readFileSync(f, "utf8"));
  check(
    `2 — ${f} calls learnEnrolmentRefusal`,
    /await learnEnrolmentRefusal\(/.test(body),
    "writing an enrolment IS granting forum membership; the two checks are not optional here"
  );
  /* ⚠⚠ AND IT CALLS IT BEFORE IT WRITES. A refusal that arrives after the
     upsert has already granted the thing it was refusing. */
  const callAt = body.search(/await learnEnrolmentRefusal\(/);
  const writeAt = body.search(WRITE);
  check(
    `2 — ${f} asks before it writes`,
    callAt >= 0 && writeAt >= 0 && callAt < writeAt,
    "a refusal after the upsert has already granted what it refuses"
  );
}

/* ── 3 · ⚠⚠ AND NOBODY RESTATES THE RULE INSTEAD OF CALLING IT ───────────
   ⚠ DERIVED, NOT LISTED. A file that writes an enrolment AND names both halves
   of the rule itself has copied it rather than imported it — which is exactly
   the shape `/api/learn/enroll` had before the extraction. */
for (const f of writers) {
  const body = strip(readFileSync(f, "utf8"));
  const restates = /learnGaps\(/.test(body) && /pathIsOpenTo\(/.test(body);
  check(
    `3 — ${f} does not restate the rule it calls`,
    !restates,
    "both halves spelled out beside the call is two rules that agree until one changes"
  );
}

console.log(
  `check:learn-enrol — ${fails.length ? `${fails.length} FAILED, ` : ""}${pass} passed`
);
for (const f of fails) console.log(`\n  ✗ ${f}`);
if (fails.length) process.exit(1);
