import {
  SUITES,
  SUITE_ORDER,
  suiteFromPillar,
  suiteFromText,
  suitesMentioned,
  suiteLabel,
} from "./suite";

/**
 * Suite resolution (brief_per_job_skill_model WS-1).
 *
 *   npm run check:suite
 *
 * Worth a harness because every failure here is silent. A pillar name that
 * stops resolving returns an empty module list rather than an error; a suite
 * matched inside another word tags a job with a system nobody worked on, and
 * every skill on that job is then misattributed in the rollup.
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

console.log("\nsuite.ts\n");

// --- the three names stay in step ------------------------------------------
ok(
  "every enum value has metadata",
  SUITE_ORDER.every((s) => SUITES[s]?.pillar && SUITES[s]?.label)
);
ok(
  "SUITE_ORDER covers every key in SUITES",
  SUITE_ORDER.length === Object.keys(SUITES).length,
  `${SUITE_ORDER.length} vs ${Object.keys(SUITES).length}`
);
ok(
  "pillar names round-trip",
  SUITE_ORDER.every((s) => suiteFromPillar(SUITES[s].pillar) === s)
);
ok("an unknown pillar resolves to null", suiteFromPillar("Netsuite") === null);
ok("null pillar resolves to null", suiteFromPillar(null) === null);

// --- how people actually write them ----------------------------------------
ok("'EBS' → ORACLE_EBS", suiteFromText("EBS") === "ORACLE_EBS");
ok("'R12' → ORACLE_EBS", suiteFromText("R12") === "ORACLE_EBS");
ok("'Fusion' → ORACLE_FUSION_CLOUD", suiteFromText("Fusion") === "ORACLE_FUSION_CLOUD");
ok("'oracle cloud' → ORACLE_FUSION_CLOUD", suiteFromText("oracle cloud") === "ORACLE_FUSION_CLOUD");
ok("'SFDC' → SALESFORCE", suiteFromText("SFDC") === "SALESFORCE");
ok("'PSFT' → PEOPLESOFT", suiteFromText("PSFT") === "PEOPLESOFT");

/*
  THE ONE THAT MATTERS. "Oracle" alone is Fusion, EBS and PeopleSoft at once.
  Resolving it to any of them is the exact mistake the per-job model exists to
  stop making — better to leave the job unanchored and ask.
*/
ok("bare 'Oracle' resolves to nothing", suiteFromText("Oracle") === null);
ok("empty text resolves to nothing", suiteFromText("") === null);

// --- scanning a job block ---------------------------------------------------
ok(
  "finds two suites in one block",
  JSON.stringify(
    suitesMentioned("Led the Oracle Cloud rollout after migrating off PeopleSoft.")
  ) === JSON.stringify(["ORACLE_FUSION_CLOUD", "PEOPLESOFT"])
);
ok(
  "word-bounded: 'forward' does not contain Workday's 'WD'",
  suitesMentioned("Drove the project forward").length === 0
);
ok(
  "word-bounded: 'R120' is not 'R12'",
  suitesMentioned("Ticket R120 closed").length === 0
);
ok(
  "punctuation is a boundary",
  suitesMentioned("Stack: EBS, PeopleSoft.").length === 2
);
ok("a block naming nothing yields nothing", suitesMentioned("Managed a team of six.").length === 0);

// --- labels -----------------------------------------------------------------
ok("Oracle Fusion Cloud labels as 'Oracle Cloud'", suiteLabel("ORACLE_FUSION_CLOUD") === "Oracle Cloud");

console.log(`\n${pass} passed, ${failures.length} failed\n`);
if (failures.length) process.exit(1);
