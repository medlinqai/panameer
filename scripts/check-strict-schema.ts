/**
 * `check:strict-schema` — the schema is a contract, not a suggestion
 * (`P1-A1.4-E414` WS-6). `npm run check:strict-schema`.
 *
 * ── ⚠⚠ IT COSTS NOTHING AND MUST STAY THAT WAY ─────────────────────────────
 *
 * `E414`: *"Do not add a paid model call to the default gate set."* ⚠ SO
 * `globalThis.fetch` IS STUBBED and every request body is captured before it
 * would leave the machine. The stub returns a non-ok response, so each caller
 * takes its own failure path and returns normally. ⚠ THE API KEY IS A FAKE
 * SET BY THE NPM SCRIPT — `resolveProvider()` needs one to build a request at
 * all, and a real one is never read because nothing is ever sent.
 *
 * ⚠⚠ THE POINT OF CAPTURING BODIES RATHER THAN GREPPING SOURCE: §1 and §3 are
 * claims about WHAT IS SENT. A regex over `ai-passes.ts` would pass with the
 * flag set on a call site that no longer runs, and §3 in particular has to walk
 * the assembled schema — the thing the vendor will actually validate — not the
 * helper that is supposed to build it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  inventoryPass, employersPass, projectsPass,
  certificationsPass, skillsPass, profilePass,
} from "@/lib/resume/ai-passes";
import { aiExtractResume } from "@/lib/resume/ai-extract";
import { aiExtractJobPosting } from "@/lib/work-request/job-import";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

const read = (...p: string[]) => strip(readFileSync(join(...p), "utf8"));
const PROVIDER = read("src", "lib", "resume", "ai-provider.ts");
const PASSES = read("src", "lib", "resume", "ai-passes.ts");
const EXTRACT = read("src", "lib", "resume", "ai-extract.ts");

/* ═══ 0 · PROVE THE STRIP ═════════════════════════════════════════════════ */
{
  check("0 — a JSX comment is stripped", !/ghostTok/.test(strip("{/* ghostTok */} real")));
  check("0 — a block comment is stripped", !/ghostTok/.test(strip("/* ghostTok */ real")));
  check("0 — a line comment is stripped", !/ghostTok/.test(strip("// ghostTok\nreal")));
  check("0 — live code survives", /realTok/.test(strip("{/* ghostTok */} realTok")));
  check(
    "0 — a neutralised close sequence does not end a comment early",
    !/ghostTok/.test(strip("{/* was: <X a={1} * / /> ghostTok */} realTok")),
    "E408 — a lazy matcher walked past this and reported live code missing"
  );
  /*
    ⚠⚠ THE ONE THAT PROTECTS §2 AND §6. Both files QUOTE the superseded
    `strict: false` in prose. If the strip failed, §6 would read a comment as
    the default and §2 would find `strict: false` "in" ai-passes.ts.
  */
  check(
    "0 — ⚠⚠ the superseded `strict: false` quote is invisible",
    !/json_schema: \{ name: schemaName, strict: false, schema \}/.test(PROVIDER),
    "ai-provider.ts quotes this exact line inside a comment"
  );
}

type Captured = { name: string; strict: unknown; schema: unknown };
const captured: Captured[] = [];

async function captureRequests() {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: unknown, init: { body?: string }) => {
    try {
      const body = JSON.parse(init?.body ?? "{}");
      const js = body.response_format?.json_schema;
      if (js) captured.push({ name: js.name, strict: js.strict, schema: js.schema });
    } catch {
      /* not a JSON body — not ours */
    }
    return {
      ok: false,
      status: 599,
      text: async () => "captured by check:strict-schema",
      json: async () => ({}),
    };
  }) as never;
  const t = "stub document text";
  await Promise.allSettled([
    inventoryPass(t), employersPass(t, []), projectsPass(t, []),
    certificationsPass(t), skillsPass(t), profilePass(t),
    aiExtractResume(t), aiExtractJobPosting(t),
  ]);
  globalThis.fetch = realFetch;
}

const SIX = [
  "resume_inventory", "resume_employers", "resume_projects",
  "resume_certifications", "resume_skills", "resume_profile",
];

/**
 * Strict mode's schema contract, applied to an ASSEMBLED schema.
 * ⚠ These are the rules the vendor enforces: every object seals with
 * `additionalProperties: false`, every declared property appears in `required`,
 * and optionality is expressed as a null union rather than by omission.
 */
function strictViolations(node: unknown, path: string, out: string[], depth = 0): void {
  if (!node || typeof node !== "object") return;
  const n = node as Record<string, unknown>;
  if (n.type === "object" || n.properties) {
    if (n.additionalProperties !== false) out.push(`${path}: additionalProperties !== false`);
    const props = Object.keys((n.properties ?? {}) as object);
    const req = (n.required ?? []) as string[];
    const missing = props.filter((p) => !req.includes(p));
    if (missing.length) out.push(`${path}: not in required → ${missing.join(", ")}`);
    if (depth > 5) out.push(`${path}: nested deeper than 5`);
    for (const [k, v] of Object.entries((n.properties ?? {}) as Record<string, unknown>))
      strictViolations(v, `${path}.${k}`, out, depth + 1);
  }
  if (n.type === "array" && n.items) strictViolations(n.items, `${path}[]`, out, depth + 1);
}

async function main() {
  await captureRequests();

  /* ═══ 1 · THE SIX GO OUT STRICT ═══════════════════════════════════════
     Mutate: flip one → red.                                               */
  {
    check("1 — the stub captured every schema", captured.length === 8, `got ${captured.length}`);
    for (const name of SIX) {
      const c = captured.find((x) => x.name === name);
      check(`1 — ⚠ ${name} is sent with strict: true`, c?.strict === true, `got ${String(c?.strict)}`);
    }
  }

  /* ═══ 2 · ⚠⚠ THE LEGACY PATH IS NOT STRICT ════════════════════════════
     An absence-assertion protecting `record_resume` from a well-meaning flip.
     Mutate: pass `true` → red.                                            */
  {
    const legacy = captured.find((x) => x.name === "record_resume");
    check("2 — record_resume was captured", Boolean(legacy));
    check(
      "2 — ⚠⚠ ABSENCE: record_resume is NOT sent with strict",
      legacy?.strict === false,
      `got ${String(legacy?.strict)} — it carries 10 strict blockers; strict would 400 the call`
    );
    const job = captured.find((x) => x.name === "record_work_request");
    check("2 — ⚠ the job importer is NOT sent with strict either", job?.strict === false, `got ${String(job?.strict)}`);
    /* ⚠ AND THE LEGACY SCHEMA REALLY IS UNREADY — measured, not asserted from
       memory, so nobody "fixes" §2 by flipping the flag and finding out live. */
    const v: string[] = [];
    strictViolations(legacy?.schema, "record_resume", v, 0);
    check(
      "2 — ⚠⚠ and it genuinely could not pass strict today",
      v.length === 10,
      `${v.length} blockers (expected 10): ${v.slice(0, 2).join(" | ")}`
    );
  }

  /* ═══ 3 · ⚠⚠ EVERY STRICT SCHEMA SATISFIES THE CONTRACT ═══════════════
     Mutate: drop one property from one `required` list → red.
     THIS IS THE ASSERTION THAT STOPS A FIELD ADDED NEXT MONTH FROM SILENTLY
     BREAKING THE CONTRACT — strict fails the CALL, not the field.          */
  {
    const strictOnes = captured.filter((c) => c.strict === true);
    check("3 — exactly six schemas are strict", strictOnes.length === 6, `got ${strictOnes.length}`);
    for (const c of strictOnes) {
      const v: string[] = [];
      strictViolations(c.schema, c.name, v, 0);
      check(`3 — ⚠⚠ ${c.name} satisfies strict mode`, v.length === 0, v.join(" | "));
    }
  }

  /* ═══ 4 · ⚠⚠ A REFUSAL IS A REFUSAL ══════════════════════════════════
     Mutate: remove the refusal read → red.                                */
  {
    check("4 — the response is read for a refusal", /\.refusal;/.test(PROVIDER));
    check(
      "4 — ⚠⚠ and it returns its OWN reason, not \"error\"",
      /reason: "refusal",/.test(PROVIDER),
      "collapsing it into `error` means nobody can count how often it happens"
    );
    check(
      "4 — ⚠ the refusal branch runs BEFORE the no-content branch",
      PROVIDER.indexOf(".refusal;") < PROVIDER.indexOf("The model returned no content."),
      "refusal arrives WITH content: null — order is the whole fix"
    );
    check("4 — the no-content branch still exists for a genuinely empty body", /The model returned no content\./.test(PROVIDER));
    check("4 — the reason reaches the type", /"no_key" \| "truncated" \| "error" \| "refusal"/.test(PROVIDER));
    /* ⚠ AND IT SURVIVES THE TWO FALLBACKS rather than being flattened on the
       way out — `import.ts` records this string on `ImportPath.reason`. */
    check(
      "4 — ⚠ ai-extract forwards it instead of flattening",
      /call\.reason === "no_key" \|\| call\.reason === "refusal" \? call\.reason : "error"/.test(EXTRACT)
    );
    check(
      "4 — ⚠ the multi-pass path forwards it too",
      /inv\.reason === "no_key" \|\| inv\.reason === "refusal" \? inv\.reason : "error"/.test(PASSES)
    );
  }

  /* ═══ 5 · THE LOOSE READERS SURVIVE ══════════════════════════════════
     They protect `record_resume`, which is still not strict.
     Mutate: remove either → red.                                          */
  {
    check("5 — `looseStringArray` still exists", /const looseStringArray = z/.test(EXTRACT));
    check("5 — and is still wired to a field", /: looseStringArray,/.test(EXTRACT));
    check(
      "5 — ⚠ the one-shot retry still exists",
      /if \(call\.ok && declaredKeyCount\(call\.value\) === 0\) \{/.test(EXTRACT),
      "it is now the ONLY thing protecting the legacy path"
    );
    /* ⚠ ONCE, NOT IN A LOOP. Counting `call = await ask()` naively gives TWO —
       the `let` declaration contains the same text — so the two are counted
       apart: one declaration, one re-assignment. A second re-assignment would
       be a retry loop, which the original note rejected explicitly. */
    check("5 — the first call is a declaration", (EXTRACT.match(/let call = await ask\(\);/g) ?? []).length === 1);
    check(
      "5 — ⚠ and it retries exactly ONCE, not in a loop",
      (EXTRACT.match(/(?<!let )call = await ask\(\);/g) ?? []).length === 1,
      `found ${(EXTRACT.match(/(?<!let )call = await ask\(\);/g) ?? []).length} re-assignments`
    );
  }

  /* ═══ 6 · ⚠⚠ THE DEFAULT IS FALSE ════════════════════════════════════
     Mutate: default it `true` → red. Opt in; never opt out.               */
  {
    check("6 — ⚠⚠ `strict` defaults to false", /^\s*strict = false,$/m.test(PROVIDER), "opt in, never opt out");
    check("6 — the parameter is declared optional", /strict\?: boolean;/.test(PROVIDER));
    check("6 — and the request uses the parameter, not a literal", /json_schema: \{\s*name: schemaName,\s*strict,\s*schema,/.test(PROVIDER));
    /* ⚠ ONE OPT-IN SITE. Six schemas, one funnel — a second `strict:` in this
       file would mean somebody opted a seventh path in without saying so. */
    check(
      "6 — ⚠ exactly one opt-in, in `runPass`",
      (PASSES.match(/strict: true,/g) ?? []).length === 1,
      `found ${(PASSES.match(/strict: true,/g) ?? []).length}`
    );
    check("6 — ⚠ ABSENCE: ai-extract opts in nowhere", !/strict:/.test(EXTRACT));
  }

  /* ═══ 7 · ⚠ WS-5 — WHAT THIS DOES NOT FIX, IN THE CODE ═══════════════ */
  {
    const raw = readFileSync(join("src", "lib", "resume", "ai-passes.ts"), "utf8");
    check(
      "7 — ⚠⚠ the code records that strict does NOT fix segmentation",
      /STRICT CONSTRAINS SHAPE, NOT CONTENT/.test(raw) && /SCHEMA-VALID/.test(raw),
      "a green shape-failure rate must not read as a fixed parser"
    );
    check("7 — it names the measured counts", /29, 30 and 51 sections/.test(raw));
    check(
      "7 — ⚠ and the link E413 found between the two symptoms",
      /Oracle Cloud\s+Content & AI-Native Application Developer/.test(raw)
    );
  }

  if (failures.length) {
    console.error(`\ncheck:strict-schema — ${failures.length} FAILED, ${pass} passed\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`check:strict-schema — ${pass}/${pass} passed`);
}
main();
