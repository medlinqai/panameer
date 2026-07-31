/**
 * Guard for E121 — `npm run check:sections`.
 *
 * The regression this exists to catch is specific and it really happened: during
 * Walk6 a POST to `/api/settings/profile/section` carrying `employers` (instead
 * of `experiences`) deleted all four of the demo provider's employers and
 * returned 200. Nothing was rejected and nothing said anything had gone.
 *
 * Pure — it exercises `parseSectionBody`, the boundary the route now runs every
 * request through, so it needs no database and can run anywhere.
 */
import { parseSectionBody } from "./section-schemas";

let pass = 0;
let fail = 0;
const results: string[] = [];

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    pass++;
    results.push(`  PASS  ${label}`);
  } else {
    fail++;
    results.push(`  FAIL  ${label}${detail !== undefined ? ` → ${JSON.stringify(detail)}` : ""}`);
  }
}

const rejects = (body: unknown) => {
  const r = parseSectionBody(body);
  return !r.ok ? r : null;
};
const accepts = (body: unknown) => {
  const r = parseSectionBody(body);
  return r.ok ? r : null;
};

console.log("=== E121: the Walk6 payload ===");
{
  // The exact shape that wiped the employers.
  const r = rejects({
    section: "experience",
    data: { employers: [{ name: "Acme", description: "…" }] },
  });
  check("the wrong key name is REFUSED, not read as an empty list", r !== null);
  check(
    "and the message names the offending field",
    Boolean(r && /employers/.test(r.error)),
    r?.error
  );
  check("with a 4xx", r?.status === 400, r?.status);
}

console.log("\n=== a bio update must not be able to touch work history ===");
{
  const ok = accepts({ section: "bio", data: { overview: "x".repeat(120) } });
  check("a plain bio update is accepted", ok !== null);
  check(
    "and carries ONLY overview — nothing that could reach employers",
    Boolean(ok && Object.keys(ok.data).length === 1 && "overview" in ok.data),
    ok?.data && Object.keys(ok.data)
  );
  const smuggled = rejects({
    section: "bio",
    data: { overview: "hello there, this is a bio", experiences: [] },
  });
  check(
    "a bio payload that smuggles `experiences` is REFUSED, not silently ignored",
    smuggled !== null,
    smuggled?.error
  );
}

console.log("\n=== absent vs deliberately empty ===");
{
  check(
    "experience with NO list at all → refused",
    rejects({ section: "experience", data: {} }) !== null
  );
  check(
    "experience with an EMPTY list → accepted (clearing is legitimate)",
    accepts({ section: "experience", data: { experiences: [] } }) !== null
  );
  check(
    "education_languages needs BOTH lists — one alone would blank the other",
    rejects({ section: "education_languages", data: { education: [] } }) !== null
  );
  check(
    "education_languages with both → accepted",
    accepts({
      section: "education_languages",
      data: { education: [], languages: [] },
    }) !== null
  );
}

console.log("\n=== the other destructive sections ===");
for (const [section, key] of [
  ["education", "education"],
  ["languages", "languages"],
  ["certifications", "certifications"],
  ["specializations", "specializationIds"],
  ["skills", "skillIds"],
] as const) {
  check(
    `${section}: omitting "${key}" is refused`,
    rejects({ section, data: {} }) !== null
  );
  check(
    `${section}: an empty "${key}" is accepted`,
    accepts({ section, data: { [key]: [] } }) !== null
  );
}

console.log("\n=== malformed bodies ===");
{
  check("no body", rejects(null) !== null);
  check("no section", rejects({ data: {} }) !== null);
  check("unknown section", rejects({ section: "nonsense", data: {} }) !== null);
  check("missing data", rejects({ section: "bio" }) !== null);
  check(
    "employers is explicitly refused here (it has its own endpoint)",
    rejects({ section: "employers", data: {} }) !== null
  );
}

console.log("\n=== the happy paths still work ===");
{
  check("title", accepts({ section: "title", data: { headline: "Consultant" } }) !== null);
  check(
    "experience with real rows",
    accepts({
      section: "experience",
      data: {
        experiences: [
          {
            employer: "Acme Consulting",
            roleTitle: "Solution Architect",
            description: "Led the thing",
            startDate: "2019-01-01",
            endDate: null,
            projects: [{ name: "Rollout", description: null }],
          },
        ],
      },
    }) !== null
  );
  check(
    "photo",
    accepts({ section: "photo", data: { photoUrl: null } }) !== null
  );
}

console.log(results.join("\n"));
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
