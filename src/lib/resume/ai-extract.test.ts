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
import {
  AI_RESUME_SCHEMA,
  aiToParsedResume,
  fixEducationRow,
  isPlausibleEducationRow,
} from "./ai-extract";
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
  const conf = assessParse("x".repeat(6000), parsed, { source: "ai" });
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


console.log("\n=== WS3: absent keys vs a genuinely empty résumé ===");
{
  /*
    The distinction the guard turns on. Both of these validate; only one is a
    real answer. Zod's `.default([])` makes them identical AFTER parsing, which
    is why the check has to look at the raw keys before defaults are applied.
  */
  const allAbsent: Record<string, unknown> = {};
  const genuinelyEmpty = {
    headline: "Recent graduate",
    overview: null,
    employers: [],
    projects: [],
    education: [{ institution: "A University", degree: "BSc", field: "CS", startYear: 2021, endYear: 2025 }],
    skills: ["Python"],
    languages: [],
    certifications: [],
  };

  const KEYS = ["employers", "projects", "education", "skills", "headline", "overview"];
  const declared = (o: Record<string, unknown>) => KEYS.filter((k) => k in o).length;

  check("an all-keys-absent response declares nothing", declared(allAbsent) === 0);
  check(
    "a genuinely work-history-free résumé still declares its keys",
    declared(genuinelyEmpty) === 6,
    declared(genuinelyEmpty)
  );

  // …and both parse to the same thing, which is exactly the trap.
  const a = AI_RESUME_SCHEMA.parse(allAbsent);
  const b = AI_RESUME_SCHEMA.parse(genuinelyEmpty);
  check(
    "after defaults they are indistinguishable by employer count — hence the raw check",
    a.employers.length === 0 && b.employers.length === 0
  );
  check(
    "the real one still carries its education and skills",
    aiToParsedResume(b).education.length === 1 && aiToParsedResume(b).skills.length === 1
  );
  check(
    "and converts to zero work history without error",
    aiToParsedResume(b).experiences.length === 0
  );
}


console.log("\n=== WS7a: a degree is not a school ===");
{
  // Shapes taken from live rows, not invented.
  const moved = fixEducationRow({ institution: "Bachelor of Arts in Accounting", degree: null });
  check(
    "a degree in the institution field becomes the degree",
    moved.institution === "" && moved.degree === "Bachelor of Arts in Accounting",
    moved
  );

  const dupe = fixEducationRow({
    institution: "Business Administration",
    degree: "Bachelor of Science",
    field: "Business Administration",
  });
  check(
    // The rule fires on a DEGREE-led string. "Business Administration" is a
    // FIELD sitting in the institution slot — a real live row, and a different
    // defect that needs a different signal, so it is deliberately left alone
    // rather than guessed at. Asserted so the boundary is recorded, not assumed.
    "a field-shaped institution is left alone (needs its own signal)",
    dupe.institution === "Business Administration" &&
      dupe.degree === "Bachelor of Science",
    dupe
  );

  const real = fixEducationRow({
    institution: "San Diego State University",
    degree: "Bachelor of Science",
    field: "Information & Decision Systems",
    startYear: 2000,
    endYear: 2004,
  });
  check(
    "a genuine university is untouched",
    real.institution === "San Diego State University" &&
      real.degree === "Bachelor of Science" &&
      real.startYear === 2000,
    real
  );

  const tricky = fixEducationRow({ institution: "Bachelor College", degree: null });
  check(
    "a school whose NAME starts with a degree word is not gutted",
    tricky.institution === "Bachelor College",
    tricky
  );
}

/* ---- E164: accomplishment bullets are not schools ----------------------- */
console.log("\n=== E164: an accomplishment bullet is not a school ===");
{
  const keep: { institution: string; degree?: string | null; startYear?: number | null; endYear?: number | null }[] = [
    { institution: "Purdue University", degree: "BSc" },
    { institution: "IIM Bangalore" },
    { institution: "ENSAE" },
    // fixEducationRow's own output shape: a qualification, no school, dated.
    { institution: "", degree: "Bachelor of Arts in Accounting", startYear: 1994, endYear: 1997 },
  ];
  for (const e of keep) {
    check(
      `keeps "${e.institution || e.degree}"`,
      isPlausibleEducationRow({
        institution: e.institution,
        degree: e.degree ?? null,
        field: null,
        startYear: e.startYear ?? null,
        endYear: e.endYear ?? null,
      })
    );
  }

  const drop = [
    "Led the P2P transformation across three business units",
    "Managed a team of 12 consultants",
    "Implemented Oracle Cloud Procurement for a global manufacturer",
    "",
  ];
  for (const institution of drop) {
    check(
      `drops "${institution.slice(0, 38) || "(empty)"}"`,
      !isPlausibleEducationRow({ institution, degree: null, field: null, startYear: null, endYear: null })
    );
  }

  const converted = aiToParsedResume(
    AI_RESUME_SCHEMA.parse({
      employers: [],
      projects: [],
      education: [
        { institution: "Purdue University", degree: "BSc", field: "Engineering", startYear: 2001, endYear: 2005 },
        { institution: "Led the P2P transformation across three business units" },
      ],
      skills: [],
    })
  );
  check("converter keeps 1 of 2 rows", converted.education.length === 1, converted.education);
  check(
    "the survivor is the school",
    converted.education[0]?.institution === "Purdue University",
    converted.education[0]
  );
}

console.log(out.join("\n"));
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
