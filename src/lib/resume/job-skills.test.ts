import { extractJobSkills, suggestedCompany, type VocabEntry } from "./job-skills";

/**
 * Per-job extraction precision (brief_per_job_skill_model WS-3).
 *
 *   npm run check:jobskills
 *
 * Every guard in job-skills.ts exists because its absence produces a FALSE
 * skill — a claim attributed to a named person against a dated engagement.
 * These assertions are the guards; without them the module's comments are
 * aspirations.
 */

let pass = 0;
const failures: string[] = [];
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

const APP = "Application-Specific";
const TECH = "Technology-Specific";

/** A miniature v5 catalog: shared modules on three suites, plus anchors. */
const VOCAB: VocabEntry[] = [
  // Shared module names — the ambiguous ones.
  { skillId: "o-gl", name: "General Ledger", suite: "ORACLE_FUSION_CLOUD", role: APP, aliases: ["GL"] },
  { skillId: "e-gl", name: "General Ledger", suite: "ORACLE_EBS", role: APP, aliases: ["GL"] },
  { skillId: "p-gl", name: "General Ledger", suite: "PEOPLESOFT", role: APP, aliases: ["GL"] },
  { skillId: "o-ap", name: "Payables", suite: "ORACLE_FUSION_CLOUD", role: APP, aliases: ["AP"] },
  { skillId: "e-ap", name: "Payables", suite: "ORACLE_EBS", role: APP, aliases: ["AP"] },
  // Suite-unique anchors.
  { skillId: "o-vbs", name: "Visual Builder Studio", suite: "ORACLE_FUSION_CLOUD", role: TECH, aliases: ["VBS"] },
  { skillId: "e-forms", name: "Oracle Forms Personalization", suite: "ORACLE_EBS", role: TECH, aliases: [] },
  { skillId: "p-code", name: "PeopleCode", suite: "PEOPLESOFT", role: TECH, aliases: [] },
  { skillId: "p-appdes", name: "Application Designer", suite: "PEOPLESOFT", role: TECH, aliases: [] },
  { skillId: "s-apex", name: "Apex", suite: "SALESFORCE", role: TECH, aliases: [] },
  // A category acronym that is also a real row's alias.
  { skillId: "s-crma", name: "CRM Analytics", suite: "SALESFORCE", role: TECH, aliases: ["CRM"] },
  // Agnostic.
  { skillId: "x-sql", name: "SQL Development", suite: "CROSS_VENDOR", role: TECH, aliases: [] },
];

const run = (t: string) => extractJobSkills(t, VOCAB);

console.log("\njob-skills.ts\n");

// --- the core promise -------------------------------------------------------
{
  const r = run("Implemented Oracle Cloud Financials: General Ledger and Payables.");
  ok("an explicit suite anchors the block", r.suite === "ORACLE_FUSION_CLOUD");
  ok("shared modules resolve to that suite only", r.skillIds.includes("o-gl") && r.skillIds.includes("o-ap"));
  ok("the other suites' rows are discarded", !r.skillIds.includes("e-gl") && !r.skillIds.includes("p-gl"));
  ok("role derives from the matched skills", r.role === APP);
  ok("an anchored block does not need a suite", r.needsSuite === false);
}

// --- the same module on two employers --------------------------------------
{
  const a = run("PeopleCode customisations alongside General Ledger support.");
  const b = run("Apex triggers and General Ledger integration work.");
  ok("job A resolves GL to PeopleSoft via its anchor", a.skillIds.includes("p-gl"));
  ok("job B resolves GL to nothing (Salesforce has no GL)", !b.skillIds.some((id) => id.endsWith("-gl")));
  ok("two employers reach different answers for one word", a.suite === "PEOPLESOFT" && b.suite === "SALESFORCE");
}

// --- needs-suite ------------------------------------------------------------
{
  const r = run("Responsible for General Ledger and Payables month-end close.");
  ok("an unanchored shared module is flagged, not guessed", r.needsSuite === true);
  ok("…and nothing is attributed", r.suite === null && r.skillIds.length === 0);
}
{
  const r = run("Ran the finance function and managed a team of twelve.");
  ok("a block with no modules at all is NOT flagged needs-suite", r.needsSuite === false);
}

// --- acronym guards ---------------------------------------------------------
{
  const r = run("Oracle Cloud rollout covering AP and GL.");
  ok("uppercase acronyms resolve once the suite is known", r.skillIds.includes("o-ap") && r.skillIds.includes("o-gl"));
}
{
  const r = run("Managed ap and gl processes.");
  ok("lowercase acronyms never match", r.skillIds.length === 0, r.names.join(","));
}
{
  /*
    The rule that keeps an acronym from choosing the vendor: with no anchor,
    "AP" must not resolve to any suite's Payables.
  */
  const r = run("Owned AP and AR operations end to end.");
  ok("an acronym alone cannot anchor a suite", r.suite === null);
  ok("…and therefore attributes no module", r.skillIds.length === 0);
}
{
  const r = run("Salesforce programme covering CRM strategy.");
  ok(
    "'CRM' is a category, never CRM Analytics",
    !r.skillIds.includes("s-crma"),
    r.names.join(",")
  );
}

// --- canonical-name casing --------------------------------------------------
{
  const r = run("Managed physical assets and the payables ledger for the group.");
  ok("prose does not become modules", r.skillIds.length === 0, r.names.join(","));
}
{
  const r = run("Built with Visual Builder Studio.");
  ok("a long canonical name matches case-insensitively", r.skillIds.includes("o-vbs"));
  ok("…and anchors the suite by itself", r.suite === "ORACLE_FUSION_CLOUD");
}

// --- multi-suite careers ----------------------------------------------------
{
  const r = run("Migration from Oracle E-Business Suite to Oracle Cloud; General Ledger in both.");
  ok(
    "a genuinely two-suite block does not silently pick one",
    r.suite === null || r.needsSuite === false,
    `suite=${r.suite}`
  );
}

// --- agnostic tools ---------------------------------------------------------
{
  const r = run("Heavy SQL Development against the PeopleSoft schema.");
  ok("cross-vendor tools survive regardless of suite", r.skillIds.includes("x-sql"));
  ok("…and the suite still resolves from the anchor", r.suite === "PEOPLESOFT");
}
{
  // A platform-neutral tool is evidence about the work, not about the vendor.
  const r = run("Deep SQL Development across the data warehouse.");
  ok("cross-vendor alone does not become the job's suite", r.suite === null, String(r.suite));
  ok("…but the tool is still recorded", r.skillIds.includes("x-sql"));
}

// --- role derivation --------------------------------------------------------
{
  const r = run("PeopleCode and Application Designer work supporting General Ledger.");
  ok("role follows the weight of evidence", r.role === TECH, String(r.role));
}

// --- suggested company (WS-3) ----------------------------------------------
{
  const jobs = [
    { employer: "Old Corp", endDate: "2019-01-01" },
    { employer: "StratERP Inc.", endDate: null },
    { employer: "Middle Ltd", endDate: "2022-06-01" },
  ];
  ok("a current job wins outright", suggestedCompany(jobs) === "StratERP Inc.");
}
{
  const jobs = [
    { employer: "Old Corp", endDate: "2019-01-01" },
    { employer: "Middle Ltd", endDate: "2022-06-01" },
  ];
  ok("otherwise the latest end date wins", suggestedCompany(jobs) === "Middle Ltd");
}
ok("no work history suggests nothing", suggestedCompany([]) === null);

console.log(`\n${pass} passed, ${failures.length} failed\n`);
if (failures.length) process.exit(1);
