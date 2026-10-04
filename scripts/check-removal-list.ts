import { readFileSync as rawRead } from "node:fs";
import { join } from "node:path";

const read = (p: string): string =>
  rawRead(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const ROUTE = join("src", "app", "api", "onboarding", "provider", "resume-ai", "apply", "route.ts");
const DIFF = join("src", "lib", "resume", "rerun-diff.ts");
const IMPORT = join("src", "lib", "resume", "import.ts");
const KEY = join("src", "lib", "resume", "job-key.ts");

let pass = 0;
const failures: string[] = [];
const check = (label: string, cond: boolean, detail = "") => {
  if (cond) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

const route = read(ROUTE);
const diff = read(DIFF);
const imp = read(IMPORT);
const key = read(KEY);

check(
  "1 — ⚠⚠⚠ the apply route NEVER calls `recomputeProviderRollup` (E553)",
  !/\brecomputeProviderRollup\s*\(/.test(route)
);
check(
  "2 — ⚠⚠⚠ the apply route NEVER calls `deleteEmployer` (it ends in afterJobChange → the rollup)",
  !/\bdeleteEmployer\s*\(/.test(route)
);
check(
  "3 — ⚠ both removal deletes are owner-scoped by `provider_profile_id`, never by the body alone",
  (() => {
    const deletes = [...route.matchAll(/prisma\.(employer|project)\.deleteMany\s*\(\s*\{[\s\S]{0,260}?\}\s*\)/g)];
    if (deletes.length !== 2) return false;
    return deletes.every((d) => /provider_profile_id\s*:\s*profile\.id/.test(d[0]));
  })(),
  "expected exactly two deleteMany calls, each scoped to profile.id"
);
check(
  "4 — ⚠⚠ the ticks are filtered against the DIFF, not trusted from the payload",
  /offeredEmployers\s*=\s*new Set\(\s*diff\.onProfileNotInResume\.employers/.test(route) &&
    /offeredProjects\s*=\s*new Set\(\s*diff\.onProfileNotInResume\.projects/.test(route) &&
    /removeEmployerIds\.filter\(\s*\(id\)\s*=>\s*offeredEmployers\.has\(id\)\s*\)/.test(route) &&
    /removeProjectIds\.filter\(\s*\(id\)\s*=>\s*offeredProjects\.has\(id\)\s*\)/.test(route)
);
check(
  "5 — ⚠⚠ ONE job key: both the writer and the preview import `jobKey` (E585)",
  /from\s+"@\/lib\/resume\/job-key"/.test(imp) && /from\s+"@\/lib\/resume\/job-key"/.test(diff)
);
check(
  "6 — ⚠ neither file rebuilds the key by hand any more",
  !/`\$\{[^`]*employer[^`]*\}\|\$\{/i.test(imp.replace(/jobKey/g, "")) &&
    !/\$\{e\.name\}\s*\$\{e\.role_title/.test(diff)
);
check(
  "7 — ⚠⚠ the key is pipe-joined and lower-cased, the WRITER's form",
  /\|\$\{roleTitle\s*\?\?\s*""\}`\.toLowerCase\(\)/.test(key) ||
    /`\$\{employer\s*\?\?\s*""\}\|\$\{roleTitle\s*\?\?\s*""\}`\.toLowerCase\(\)/.test(key)
);
check(
  "8 — ⚠⚠⚠ nothing on the removal list is pre-ticked (the component starts both sets EMPTY)",
  (() => {
    const ui = read(join("src", "components", "onboarding", "ResumeImportAction.tsx"));
    return (
      /useState<Set<string>>\(new Set\(\)\);?\s*$/m.test(ui) &&
      /dropEmployers,\s*setDropEmployers\s*\]\s*=\s*useState<Set<string>>\(new Set\(\)\)/.test(ui) &&
      /dropProjects,\s*setDropProjects\s*\]\s*=\s*useState<Set<string>>\(new Set\(\)\)/.test(ui)
    );
  })(),
  "both removal sets must start empty — the brief: 'unticked by default'"
);

if (failures.length > 0) {
  console.error(`\ncheck:removal-list — ${failures.length} FAILED, ${pass} passed\n`);
  process.exit(1);
}
console.log(`\ncheck:removal-list — ${pass}/${pass} passed\n`);
