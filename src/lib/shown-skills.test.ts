import { isSkillShown, shownSkills, selectedRoleIds } from "./shown-skills";

/** `check:shown-skills` — the role filter that replaced the prune (`E517`). */
let pass = 0;
const failures: string[] = [];
const ok = (label: string, cond: boolean) => {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { failures.push(label); console.log(`  FAIL  ${label}`); }
};

console.log("\ncheck:shown-skills — what a role selection hides\n");

const APP = "role-app", TECH = "role-tech", OPS = "role-ops";

ok("a skill in a selected role is shown", isSkillShown([APP], APP));
ok("a skill outside the selection is hidden", !isSkillShown([APP], TECH));
ok("multi-select shows both", isSkillShown([APP, TECH], TECH) && isSkillShown([APP, TECH], APP));
ok("a third role is still hidden", !isSkillShown([APP, TECH], OPS));

/* ⚠⚠ ABSENCE IS NOT A NEGATIVE STATEMENT (Scott, 2026-09-17). 28 profiles hold
   165 skills with no role recorded; they must not blank. */
ok("NO selection shows everything", isSkillShown([], TECH) && isSkillShown(new Set<string>(), OPS));
ok("a skill with no role at all is shown, never hidden by accident", isSkillShown([APP], null));

const rows = [{ r: APP }, { r: TECH }, { r: APP }, { r: OPS }];
ok("shownSkills keeps order and drops the rest", JSON.stringify(shownSkills([APP], rows, (x) => x.r)) === JSON.stringify([{ r: APP }, { r: APP }]));
ok("shownSkills with no selection keeps all", shownSkills([], rows, (x) => x.r).length === 4);

ok("selectedRoleIds prefers the multi-select", JSON.stringify(selectedRoleIds({ role_type_id: OPS, roles: [{ role_type_id: APP }, { role_type_id: TECH }] })) === JSON.stringify([APP, TECH]));
ok("selectedRoleIds falls back to the primary", JSON.stringify(selectedRoleIds({ role_type_id: OPS, roles: [] })) === JSON.stringify([OPS]));
ok("selectedRoleIds empty means empty", selectedRoleIds({ role_type_id: null, roles: [] }).length === 0);

/* ⚠ NOTHING EXPIRES — there is no date in this module at all. */
ok("the rule has no notion of age", !/(expire|month|year|Date)/.test(require("fs").readFileSync("src/lib/shown-skills.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "")));

if (failures.length > 0) { console.error(`\ncheck:shown-skills — ${failures.length} FAILED, ${pass} passed\n`); process.exit(1); }
console.log(`\ncheck:shown-skills — ${pass}/${pass} passed\n`);
