/**
 * ⚠ THIS TEST IS THE CONSTRAINT, NOT A CHECK ON IT.
 *
 * The brief that added `PackageValueFactor` said so plainly: "Assert the enum matches the
 * wizard. Add a test that fails if `basis` names a variable `AssessmentWizard` does not
 * collect. That test is the whole point of the constraint — without it, factors will drift
 * onto data the assessment never gathers and the estimates become unanchored."
 *
 * So this reads the WIZARD SOURCE as text rather than importing it (`AssessmentWizard.tsx`
 * is a `"use client"` module and its state variables are locals, not exports — there is
 * nothing to import). The same technique the existing schema-mirror assertion in
 * `scoring.test.ts` uses, and for the same reason: the thing that drifts is the source.
 */
import { readFileSync } from "node:fs";
import {
  BASIS_REQUIRES,
  VALUE_FACTOR_BASES,
  factorUnit,
  isProportional,
  type ValueFactorBasis,
} from "@/lib/catalog/value-factors";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail === undefined ? "" : " → " + JSON.stringify(detail)}`);
  }
}

const wizard = readFileSync("src/components/assessment/AssessmentWizard.tsx", "utf8");
const schema = readFileSync("prisma/schema.prisma", "utf8");

console.log("\n=== the enum mirrors schema.prisma ===");
{
  const block = schema.slice(
    schema.indexOf("enum ValueFactorBasis"),
    schema.indexOf("}", schema.indexOf("enum ValueFactorBasis"))
  );
  const inSchema = [...block.matchAll(/^\s{2}([A-Z_]+)$/gm)].map((m) => m[1]).sort();
  check(
    "lib and schema declare the same bases",
    JSON.stringify(inSchema) === JSON.stringify([...VALUE_FACTOR_BASES].sort()),
    { schema: inSchema, lib: [...VALUE_FACTOR_BASES].sort() }
  );
}

console.log("\n=== ⚠ every basis references a variable the wizard COLLECTS ===");
{
  /*
    The wizard's collected answer variables, read from the payload it POSTs plus the
    `Basics` type. Derived from the source rather than re-listed here — a list in this file
    would be a third copy to forget.
  */
  const answersBlock = wizard.slice(
    wizard.indexOf("answers: {"),
    wizard.indexOf("},", wizard.indexOf("answers: {"))
  );
  const basicsBlock = wizard.slice(
    wizard.indexOf("type Basics = {"),
    wizard.indexOf("};", wizard.indexOf("type Basics = {"))
  );
  /*
    ⚠ COMMENT LINES ARE STRIPPED FIRST, AND THAT MATTERS FOR SOUNDNESS. Both blocks carry
    `⚠ Scott: "..."` quotes, and `Scott:` matches a `word:` pattern — so the collected set
    picked up "Scott" and would have accepted a basis that required a field named after any
    word appearing as `Word:` in a comment. Over-inclusion is the DANGEROUS direction for
    this guard: it makes a bogus basis pass. Stripped, the set is only real code.
  */
  const decomment = (t: string) =>
    t
      .split("\n")
      .filter((l) => !/^\s*(\/\/|\/\*|\*|⚠)/.test(l))
      .join("\n");
  const collected = new Set([
    ...[...decomment(answersBlock).matchAll(/^\s+(\w+)[,:]/gm)].map((m) => m[1]),
    ...[...decomment(basicsBlock).matchAll(/^\s+(\w+):/gm)].map((m) => m[1]),
  ]);

  check(
    "the wizard payload was parsed at all (guards against a silent pass)",
    collected.has("spendBand") && collected.has("revenueBand"),
    [...collected].sort()
  );

  for (const basis of VALUE_FACTOR_BASES) {
    const needs = BASIS_REQUIRES[basis];
    const missing = needs.filter((f) => !collected.has(f));
    check(
      `${basis} needs [${needs.join(", ") || "nothing"}] — all collected`,
      missing.length === 0,
      { missing, collected: [...collected].sort() }
    );
  }

  check(
    "every basis has an entry in BASIS_REQUIRES (a missing key would read as 'needs nothing')",
    VALUE_FACTOR_BASES.every((b) => Array.isArray(BASIS_REQUIRES[b])),
    VALUE_FACTOR_BASES.filter((b) => !Array.isArray(BASIS_REQUIRES[b]))
  );
  check(
    "FLAT is the ONLY basis that references nothing — risk avoidance does not scale",
    VALUE_FACTOR_BASES.filter((b) => BASIS_REQUIRES[b].length === 0).join(",") === "FLAT",
    VALUE_FACTOR_BASES.filter((b) => BASIS_REQUIRES[b].length === 0)
  );
}

console.log("\n=== the rate's unit is decided in exactly one place ===");
{
  check("FLAT is cents", factorUnit("FLAT") === "cents");
  check(
    "every other basis is bps",
    VALUE_FACTOR_BASES.filter((b) => b !== "FLAT").every((b) => factorUnit(b) === "bps")
  );
  check(
    "isProportional agrees with factorUnit",
    VALUE_FACTOR_BASES.every(
      (b) => isProportional(b) === (factorUnit(b as ValueFactorBasis) === "bps")
    )
  );
  check(
    "schema stores rate as Int, not a float",
    /\n\s+rate\s+Int\b/.test(schema),
    schema.slice(schema.indexOf("model PackageValueFactor"), schema.indexOf("model PackageValueFactor") + 900)
      .split("\n")
      .find((l) => l.includes("rate "))
  );
}

console.log("\n=== the join is many-to-many, and process is not duplicated ===");
{
  const join = schema.slice(
    schema.indexOf("model PackageCapabilityDomain"),
    schema.indexOf("}", schema.indexOf("@@map(\"package_capability_domains\")"))
  );
  check("unique on the pair", /@@unique\(\[package_id, capability_domain_id\]\)/.test(join));
  check("indexed both ways", /@@index\(\[package_id\]\)/.test(join) && /@@index\(\[capability_domain_id\]\)/.test(join));
  check("cascades on package delete", /package_id\], references: \[id\], onDelete: Cascade/.test(join));
  check(
    "⚠ no `process` column on the join — CapabilityDomain.process is the one source",
    !/\bprocess\b/.test(join.replace(/\/\/.*/g, "")),
    join.split("\n").filter((l) => /\bprocess\b/.test(l) && !l.trim().startsWith("///"))
  );
  check(
    "⚠ Package.role_type_id survives — it answers a different question",
    /role_type_id\s+String\?/.test(schema)
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
