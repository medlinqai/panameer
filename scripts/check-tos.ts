import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * check:tos — EVERY ACCOUNT-CREATING PATH RECORDS ACCEPTANCE (`P1-ALL-E384`).
 *
 * SCOTT, 2026-09-04: *"yes, everyone needs to accept ToS...fix."*
 *
 * ⚠⚠ THIS EXISTS BECAUSE THE FORM PATHS WERE NEVER THE PROBLEM. All three
 * signup routes already wrote both fields and enforced `tosAccepted:
 * z.literal(true)` server-side. The holes were the two paths with NO FORM —
 * `/assess/claim/[token]` (4 live rows) and `lib/oauth.ts` (latent, 0 rows only
 * because OAuth is off). Nobody noticed, because there is no checkbox to be
 * missing from a flow that has no checkbox.
 *
 * ⚠ UNDER `E380` THE ToS **IS** THE MSA. An account with no acceptance is a
 * member with no master agreement, and the gate reads it as false — which is
 * indistinguishable from having DECLINED.
 *
 * ⚠⚠ SO THIS IS THE GUARD THAT STOPS A FOURTH PATH APPEARING WITHOUT ONE. It
 * discovers `prisma.user.create` / `tx.user.create` call sites BY SCANNING, not
 * from a list — a hand-maintained list is exactly what would miss the next one.
 */
let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const strip = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const SELF = join("scripts", "check-tos.ts");
const files = [...walk("src")].filter((f) => f !== SELF);
const bodies = new Map(files.map((f) => [f, strip(readFileSync(f, "utf8"))]));

/*
  ⚠⚠ THE DISCOVERY IS A SCAN, NOT A LIST. Every `user.create` under `src/`.
  Seeds and one-off scripts under `prisma/` are deliberately OUT of scope — a
  seeded fixture is not a person who agreed to anything, and `E384` explicitly
  refuses to fabricate acceptance for them.
*/
const CREATE_RE = /(?:prisma|tx)\.user\.create\(\s*\{[\s\S]*?\n\s{2,}\}\)/g;
const sites: { file: string; body: string }[] = [];
for (const [file, body] of bodies) {
  for (const m of body.matchAll(CREATE_RE)) sites.push({ file, body: m[0] });
}

check(
  "the scan found the account-creating paths",
  sites.length >= 5,
  `${sites.length} site(s): ${[...new Set(sites.map((s) => s.file))].join(", ")}`
);

/* ⚠⚠ THE LOAD-BEARING ASSERTION: BOTH FIELDS, IN THE SAME `create`. Not "the
   file mentions tos_version somewhere" — IN THE CREATE OBJECT ITSELF, so a
   follow-up write that can fail on its own does not satisfy it. */
const missing: string[] = [];
for (const s of sites) {
  const hasAt = /tos_accepted_at\s*:/.test(s.body);
  const hasVer = /tos_version\s*:/.test(s.body);
  if (!hasAt || !hasVer) {
    missing.push(`${s.file} (${!hasAt ? "no tos_accepted_at" : ""}${!hasAt && !hasVer ? " + " : ""}${!hasVer ? "no tos_version" : ""})`);
  }
}
check(
  "EVERY account-creating path writes tos_accepted_at AND tos_version in the same transaction",
  missing.length === 0,
  missing.join("; ")
);

/* ⚠ AND THE TWO PATHS `E384` FIXED ARE NAMED, so the scan cannot pass
   vacuously if a refactor renames or inlines them away. */
for (const f of [
  join("src", "app", "assess", "claim", "[token]", "page.tsx"),
  join("src", "lib", "oauth.ts"),
]) {
  const b = bodies.get(f) ?? "";
  check(`${f} is on disk`, b.length > 0);
  check(
    `${f} records acceptance`,
    /tos_accepted_at\s*:/.test(b) && /tos_version\s*:/.test(b)
  );
}

/* ⚠ THE VERSION IS THE SHARED CONSTANT, never a literal. A hand-typed
   "2026-08-draft" in one path is a version that stops moving when the real one
   is bumped, and `companyTosCurrent`-style comparisons would silently pass. */
const literalVersion = [...bodies.entries()]
  .filter(([, b]) => /tos_version\s*:\s*"/.test(b))
  .map(([f]) => f);
check(
  "no path hard-codes a version string",
  literalVersion.length === 0,
  literalVersion.join(", ")
);

/* ⚠⚠ THE FRICTIONLESS PATHS MUST NAME THE TERMS. An agreement nobody could read
   before agreeing is not one, and neither of these two has a checkbox. */
const tosLib = readFileSync(join("src", "lib", "tos.ts"), "utf8");
check(
  "the shared terms notice exists in one place",
  /export const CLAIM_TERMS_NOTICE/.test(tosLib)
);
const claimPage = bodies.get(join("src", "app", "assess", "claim", "[token]", "page.tsx")) ?? "";
check(
  "the claim page renders the terms notice",
  /CLAIM_TERMS_NOTICE/.test(claimPage)
);
check(
  "the claim page links BOTH documents, not just names them",
  /href="\/terms"/.test(claimPage) && /href="\/privacy"/.test(claimPage),
  "an agreement nobody could read before agreeing is not one"
);

/* ⚠⚠ AND NOTHING BACKFILLS. `E384` WS-1c: fabricating an acceptance record for
   somebody who did not accept is the one genuinely indefensible thing here —
   worse than the E034 shape, because it manufactures EVIDENCE rather than a
   promise. No code may write acceptance for an EXISTING user. */
const backfillers = [...bodies.entries()]
  .filter(([, b]) => /user\.update(Many)?\(\s*\{[\s\S]{0,400}?tos_accepted_at/.test(b))
  .map(([f]) => f);
check(
  "no code path backfills acceptance onto an existing user",
  backfillers.length === 0,
  `${backfillers.join(", ")} — under E380 the ToS IS the MSA; fabricating agreement is manufacturing evidence`
);

if (failures.length > 0) {
  console.error(`check:tos — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:tos — ${pass}/${pass} passed`);
