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
  scrubInstitution,
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

  /*
    ⚠⚠ RE-HOMED BY `P1-J1.4-E373`, NOT DELETED — AND IT FIRED, WHICH IS THE
    HARNESS WORKING CORRECTLY.

    ⚠ SUPERSEDED, QUOTED NOT DELETED: *"A model that omits a required field must
    be REFUSED, not partially applied — half an employer in someone's profile is
    worse than no employer."* and `check("an employer with no name is refused",
    !bad.success)`.

    ⚠⚠ THAT RULE IS NOW FALSE BY DESIGN, AND ITS FALSENESS WAS THE BUG. Scott:
    *"Legally I HAVE to have a company (aka employer), but it could just be a one
    person LLC…so no one tends to mention it."* A REQUIRED name with no honest
    value is what forced the extractor to write the JOB TITLE into it — 36 of 250
    rows, and 38 of 91 live colleague suggestions reading *"You were both at
    Founder & Principal Consultant"*.

    ⚠ SO THE ASSERTION IS INVERTED RATHER THAN DROPPED, AND THE RULE IT ACTUALLY
    PROTECTED SURVIVES IN A STRONGER FORM. The point was never "a name must
    exist" — it was "the schema must not accept a half-formed employer". A
    MISSING name is now valid; an employer that is not an OBJECT, or that omits
    the key entirely rather than nulling it, still is not.
  */
  const noName = AI_RESUME_SCHEMA.safeParse({
    ...EDDIE_LIKE,
    employers: [{ name: null, roleTitle: "Director" }],
  });
  check(
    "an employer with an explicitly NULL name is ACCEPTED (E373)",
    noName.success,
    noName.success ? undefined : noName.error.issues[0]
  );
  /* ⚠ AND THE HALF-FORMED CASE IS STILL REFUSED — a non-object employer is not
     an employer, and that is what the original assertion was really guarding. */
  const bad = AI_RESUME_SCHEMA.safeParse({
    ...EDDIE_LIKE,
    employers: ["Director"],
  });
  check("a malformed employer entry is still refused", !bad.success);

  const junk = AI_RESUME_SCHEMA.safeParse("not an object");
  check("a non-object response is refused", !junk.success);
}

console.log("\n=== projects survive the conversion (the Marelise case) ===");
{
  const parsed = aiToParsedResume(AI_RESUME_SCHEMA.parse(MARELISE_LIKE));
  /*
    ── ⚠⚠ RE-HOMED, NOT WEAKENED (`P1-J1.4-E294`, 2026-09-01) ──────────────────

    The SCENARIO is unchanged — Marelise's ten project tables, no employers — and
    the assertions are STRONGER: they now pin the equation this brief is judged on.

    ⚠ SUPERSEDED, quoted, all four:
      · `check("all 10 projects become entries", parsed.experiences.length === 10)`
      · `check("each carries its client as the employer",
         parsed.experiences.every((e) => /^Client \d+$/.test(e.employer)))`
      · `check("each carries a start date",
         parsed.experiences.every((e) => e.startDate === "2023-09-01"))`
      · `check("software is named in the description, not lost",
         parsed.experiences[0]?.description?.includes(...))`

    The first asserted the FLATTENING — ten projects arriving as ten fake
    employers, which is precisely the defect Scott filed as *"28 employers"*.
    Correct for the old contract, wrong for this one, so it is INVERTED.

    ⚠⚠ AND TWO OF THE FOUR HAD ALREADY GONE VACUOUSLY GREEN. With `experiences`
    now empty, `parsed.experiences.every(...)` is TRUE OF AN EMPTY ARRAY — the
    client and start-date checks were passing while asserting nothing at all.
    A test that cannot fail is worse than a missing one, so both were re-pointed
    at `projects`, where the data actually is.
  */
  check("no project is promoted to a fake employer", parsed.experiences.length === 0, parsed.experiences.length);
  check("all 10 projects survive as projects", parsed.projects.length === 10, parsed.projects.length);
  check(
    "THE EQUATION: extracted === attached + unattached, nothing lost",
    parsed.projects.filter((p) => p.employerName).length +
      parsed.projects.filter((p) => !p.employerName).length ===
      MARELISE_LIKE.projects.length,
    { extracted: MARELISE_LIKE.projects.length, mapped: parsed.projects.length }
  );
  check(
    "with no employers to match, every project is UNATTACHED not dropped",
    parsed.projects.length > 0 && parsed.projects.every((p) => p.employerName === null)
  );
  check(
    "each carries its client",
    parsed.projects.length > 0 && parsed.projects.every((p) => /^Client \d+$/.test(p.client ?? "")),
    parsed.projects.slice(0, 2).map((p) => p.client)
  );
  check(
    "each carries a start date",
    parsed.projects.length > 0 && parsed.projects.every((p) => p.startDate === "2023-09-01"),
    parsed.projects[0]?.startDate
  );
  check(
    "software survives as structured data, not lost",
    Boolean(parsed.projects[0]?.software?.includes("Oracle Cloud HCM Applications")),
    parsed.projects[0]?.software
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
    /*
      ⚠ THIS ASSERTION IS REVERSED FROM ITS FIRST VERSION, on purpose.

      It used to assert that "Business Administration" was LEFT in the
      institution slot, on the reasoning that a field-shaped string is a
      different defect needing its own signal. WS-3 (2026-08-13) settles the
      question the other way: the institution field's job is to name a school,
      and anything that does not name one is blank rather than kept. Nine live
      rows look exactly like this.

      Nothing is lost here — the string duplicates `field`, so it is dropped
      rather than refiled. That is what makes blanking safe, and it is asserted
      below so a future change that starts destroying data fails this test.
    */
    "a field-shaped institution is blanked, and its duplicate text dropped",
    dupe.institution === "" &&
      dupe.degree === "Bachelor of Science" &&
      dupe.field === "Business Administration" &&
      dupe.description === null,
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

console.log("\n=== WS-3: the institution scrub (2026-08-13) ===");
{
  /* Every input below is a VERBATIM live row from the 23 marketplace providers. */

  const gpa = scrubInstitution("San Diego State University  •  3.72 GPA");
  check(
    "a bullet-separated GPA is stripped, the school survives",
    gpa.institution === "San Diego State University" && gpa.salvage === null,
    gpa
  );

  const gpaTight = scrubInstitution("San Diego State University • 3.72 GPA");
  check(
    "…with single spacing too (both spellings are in the data)",
    gpaTight.institution === "San Diego State University",
    gpaTight
  );

  const attended = scrubInstitution("Attended University of South Florida - Tampa");
  check(
    "a leading 'Attended' is the résumé's verb, not part of the name",
    attended.institution === "University of South Florida - Tampa",
    attended
  );

  const atSchool = scrubInstitution(
    "Dual Enrollment During High School at Polk State College (then Polk Community College)"
  );
  check(
    "'… at <school>' keeps the school, drops the preamble",
    atSchool.institution === "Polk State College (then Polk Community College)",
    atSchool
  );

  /*
    THE COUNTER-CASE that keeps the 'at' rule from being a wrecking ball. The
    tail "Buffalo" names nothing, so the split is rejected and the real name
    stands. Without this the rule would rename a university after a city.
  */
  const atBuffalo = scrubInstitution("University at Buffalo");
  check(
    "'University at Buffalo' is not split into 'Buffalo'",
    atBuffalo.institution === "University at Buffalo",
    atBuffalo
  );

  const campus = scrubInstitution("Universidad Nacional • Bogotá");
  check(
    "a bullet-separated CAMPUS is not a grade, and is kept",
    campus.institution === "Universidad Nacional • Bogotá",
    campus
  );

  const bullet = scrubInstitution(
    "Configure operating systems and administer cloud-based (SaaS) software"
  );
  check(
    "a résumé bullet names no school, so the institution is blank",
    bullet.institution === "" && bullet.salvage !== null,
    bullet
  );

  const refiled = fixEducationRow({
    institution: "Configure operating systems and administer cloud-based (SaaS) software",
    degree: null,
    field: null,
  });
  check(
    "…and the text is preserved in description rather than binned",
    refiled.institution === "" &&
      refiled.description ===
        "Configure operating systems and administer cloud-based (SaaS) software",
    refiled
  );

  const pgp = fixEducationRow({ institution: "Post Graduate Program", degree: null });
  check(
    "a qualification in the institution slot becomes the degree",
    pgp.institution === "" && pgp.degree === "Post Graduate Program",
    pgp
  );

  const clean = fixEducationRow({
    institution: "San Diego State University  •  3.72 GPA",
    degree: null,
    field: null,
  });
  check(
    "end to end: the dirtiest live row lands clean, with nothing invented",
    clean.institution === "San Diego State University" &&
      clean.degree === null &&
      clean.description === null,
    clean
  );

  const empty = scrubInstitution("   ");
  check("blank in, blank out", empty.institution === "" && empty.salvage === null, empty);
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
