import { projectMonogram } from "./project-monogram";

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

is("", "");
is("   ", "");
is("!!!", "");
ok("no output ever contains a question mark", !["", "  ", "???", "The", "Ω project"].some((n) => projectMonogram(n).includes("?")));

ok(
  "never more than two letters",
  ["Oracle Cloud Procurement Transformation Programme", "A B C D E", "one two three"].every((n) => projectMonogram(n).length <= 2)
);

is("The Of", "TO");

ok("non-Latin first letters survive", projectMonogram("Ωmega Rollout") === "ΩR", projectMonogram("Ωmega Rollout"));

if (failures.length > 0) {
  console.error(`\ncheck:monogram — ${failures.length} FAILED, ${pass} passed\n`);
  process.exit(1);
}
console.log(`\ncheck:monogram — ${pass}/${pass} passed\n`);
