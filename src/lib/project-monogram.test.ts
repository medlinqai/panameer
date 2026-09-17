import { projectMonogram } from "./project-monogram";

/**
 * `check:monogram` — the project tile's letters (`P2-J1.4-E512`).
 *
 *   npm run check:monogram
 *
 * ⚠ Pure, so the rule is provable without a browser. The PLACEMENT is asserted
 * by `check:ui`; this asserts what the letters ARE.
 */
let pass = 0;
const failures: string[] = [];
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { failures.push(label); console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`); }
};

console.log("\ncheck:monogram — a project's initials\n");

const is = (name: string, expected: string) =>
  ok(`"${name}" → "${expected}"`, projectMonogram(name) === expected, `got "${projectMonogram(name)}"`);

is("Oracle Cloud Procurement", "OC");
is("Vanguard", "V");
is("The Ceres Migration", "CM");
is("A Report for the Board", "RB");
is("3M Rollout", "3R");
is("p2p redesign", "PR");
is("Supplier Enablement (REMOTE)", "SE");
is("OBN — Supplier Onboarding", "OS");
is("Payables/Receivables Cutover", "PR");

/* ⚠⚠ NO QUESTION MARK, EVER (Scott, 2026-09-17). An unnamed tile is EMPTY. */
is("", "");
is("   ", "");
is("!!!", "");
ok("no output ever contains a question mark", !["", "  ", "???", "The", "Ω project"].some((n) => projectMonogram(n).includes("?")));

/* ⚠ Never more than two letters — the tile is 40px. */
ok(
  "never more than two letters",
  ["Oracle Cloud Procurement Transformation Programme", "A B C D E", "one two three"].every((n) => projectMonogram(n).length <= 2)
);

/* ⚠ A name of only stop-words still shows something. */
is("The Of", "TO");

/* ⚠ Non-Latin names are letters too — `\p{L}`, not A–Z. */
ok("non-Latin first letters survive", projectMonogram("Ωmega Rollout") === "ΩR", projectMonogram("Ωmega Rollout"));

if (failures.length > 0) {
  console.error(`\ncheck:monogram — ${failures.length} FAILED, ${pass} passed\n`);
  process.exit(1);
}
console.log(`\ncheck:monogram — ${pass}/${pass} passed\n`);
