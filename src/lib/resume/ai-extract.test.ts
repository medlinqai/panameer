/**
 * `npm run check:ai-extract`
 *
 * Covers the parts of the AI tier that DON'T need a model: schema validation and
 * the conversion into the shape the review step already consumes. Those are
 * where a wrong answer would silently corrupt a profile, and they are pure — so
 * they are testable without a key, a network, or spending anything.
 *
 * The live call itself is exercised in WS5 against the banked fixtures.
 */
import { AI_RESUME_SCHEMA, aiToParsedResume } from "./ai-extract";
import { assessParse } from "./confidence";

let pass = 0;
let fail = 0;
const out: string[] = [];
const check = (label: string, cond: boolean, detail?: unknown) => {
  cond ? pass++ : fail++;
  out.push(`  ${cond ? "PASS" : "FAIL"}  ${label}${cond || detail === undefined ? "" : ` → ${JSON.stringify(detail)}`}`);
};

/** Shaped like Marelise's document: everything lives in project tables. */
const MARELISE_LIKE = {
  headline: "Oracle Cloud HCM Consultant",
  overview: "Implementation consultant.",
  employers: [],
  projects: Array.from({ length: 10 }, (_, i) => ({
    name: `Core HR Implementation ${i + 1}`,
    client: `Client ${i + 1}`,
    roleType: "Application-Specific (Functional SME)",
    software: ["Oracle Cloud HCM Applications"],
    skills: ["OTBI Dashboards", "Core HR"],
    description: "Implemented New Global HR Entity/Created OTBI HR Reporting.",
    startDate: "2023-09",
    endDate: null,
    employer: null,
  })),
  education: [{ institution: "A University", degree: "BA", field: "Accounting", startYear: 1994, endYear: 1997 }],
  skills: ["Core HR"],
  languages: ["English"],
  certifications: [],
};

/** Shaped like Eddie's: employers, including the undated trailing three. */
const EDDIE_LIKE = {
  headline: "Transformation Specialist",
  overview: null,
  employers: [
    { name: "OraCloud Plus, LLC", roleTitle: "Director", location: "Miami, Florida", startDate: "2018-01-01", endDate: null, isCurrent: true, description: "Oracle SaaS." },
    { name: "Citigroup", roleTitle: "Executive Director", location: "New York", startDate: "2008-01-01", endDate: "2013-01-01", isCurrent: false, description: null },
    { name: "Morgan Stanley", roleTitle: "Executive Director", location: null, startDate: null, endDate: null, isCurrent: null, description: null },
  ],
  projects: [],
  education: [],
  skills: ["Expense Management"],
  languages: [],
  certifications: [{ name: "CIMA", issuer: "CIMA", issuedOn: null, expiresOn: null }],
};

console.log("=== schema validation ===");
{
  const ok = AI_RESUME_SCHEMA.safeParse(MARELISE_LIKE);
  check("a well-formed response validates", ok.success, ok.success ? undefined : ok.error.issues[0]);

  // A model that omits a required field must be REFUSED, not partially applied —
  // half an employer in someone's profile is worse than no employer.
  const bad = AI_RESUME_SCHEMA.safeParse({
    ...EDDIE_LIKE,
    employers: [{ roleTitle: "Director" }],
  });
  check("an employer with no name is refused", !bad.success);

  const junk = AI_RESUME_SCHEMA.safeParse("not an object");
  check("a non-object response is refused", !junk.success);
}

console.log("\n=== projects survive the conversion (the Marelise case) ===");
{
  const parsed = aiToParsedResume(AI_RESUME_SCHEMA.parse(MARELISE_LIKE));
  check("all 10 projects become entries", parsed.experiences.length === 10, parsed.experiences.length);
  check(
    "each carries its client as the employer",
    parsed.experiences.every((e) => /^Client \d+$/.test(e.employer)),
    parsed.experiences.slice(0, 2).map((e) => e.employer)
  );
  check(
    "each carries a start date",
    parsed.experiences.every((e) => e.startDate === "2023-09-01"),
    parsed.experiences[0]?.startDate
  );
  check(
    "software and skills are folded into skills",
    parsed.skills.includes("Oracle Cloud HCM Applications") &&
      parsed.skills.includes("OTBI Dashboards"),
    parsed.skills
  );
  check(
    "software is named in the description, not lost",
    Boolean(parsed.experiences[0]?.description?.includes("Oracle Cloud HCM Applications"))
  );
}

console.log("\n=== employers survive the conversion (the Eddie case) ===");
{
  const parsed = aiToParsedResume(AI_RESUME_SCHEMA.parse(EDDIE_LIKE));
  check("all 3 employers become entries", parsed.experiences.length === 3, parsed.experiences.length);
  check(
    "dates are normalised to YYYY-MM-DD",
    parsed.experiences[1]?.startDate === "2008-01-01" && parsed.experiences[1]?.endDate === "2013-01-01"
  );
  check(
    "an undated employer is kept, not dropped",
    parsed.experiences.some((e) => e.employer === "Morgan Stanley" && e.startDate === null)
  );
  check("seniority is NOT invented by the model", parsed.experienceLevel === null);
}

console.log("\n=== the AI result would pass the WS0 gate ===");
{
  // The point of the tier: what the model returns must score HIGH, or the gate
  // would offer an AI pass on top of an AI pass.
  const parsed = aiToParsedResume(AI_RESUME_SCHEMA.parse(MARELISE_LIKE));
  const conf = assessParse("x".repeat(6000), parsed);
  check("Marelise-shaped AI output scores high", conf.score === "high", conf.reasons);
}

console.log("\n=== degenerate responses ===");
{
  const empty = aiToParsedResume(
    AI_RESUME_SCHEMA.parse({ headline: null, overview: null, employers: [], projects: [], education: [], skills: [], languages: [], certifications: [] })
  );
  check("an empty result converts without throwing", empty.experiences.length === 0);
  const partialDate = aiToParsedResume(
    AI_RESUME_SCHEMA.parse({
      ...EDDIE_LIKE,
      employers: [{ ...EDDIE_LIKE.employers[0], startDate: "2018" }],
    })
  );
  check("a year-only date becomes Jan 1st", partialDate.experiences[0]?.startDate === "2018-01-01", partialDate.experiences[0]?.startDate);
}

console.log(out.join("\n"));
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
