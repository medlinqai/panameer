import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};
const strip = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
const read = (...p: string[]) => strip(readFileSync(join(...p), "utf8"));

const JOIN = read("src", "app", "join", "page.tsx");
const REQ = read("src", "app", "join", "requester", "page.tsx");
const ROUTE = read("src", "app", "api", "onboarding", "requester", "account", "route.ts");
const LIB = read("src", "lib", "requester-onboarding.ts");
const SCHEMA = readFileSync(join("prisma", "schema.prisma"), "utf8");

/* ═══ 0 · PROVE THE STRIP ═════════════════════════════════════════════════ */
{
  check("0 — a JSX comment is stripped", !/ghostTok/.test(strip("{/* ghostTok */} real")));
  check("0 — a block comment is stripped", !/ghostTok/.test(strip("/* ghostTok */ real")));
  check("0 — a line comment is stripped", !/ghostTok/.test(strip("// ghostTok\nreal")));
  check("0 — live code survives", /realTok/.test(strip("{/* ghostTok */} realTok")));
  check(
    "0 — ⚠⚠ the superseded coming-soon push is invisible",
    !/router\.push\("\/join\/coming-soon\?job=buyer"\);/.test(JOIN),
    "join/page.tsx quotes this exact line inside a comment"
  );
}

{
  check(
    "1 — ⚠⚠ the buyer case enters the requester wizard",
    /case "buyer-admin":\s*router\.push\(withCtx\("\/join\/requester\?job=buyer"\)\);/.test(JOIN)
  );
  check(
    "1 — ⚠⚠ ABSENCE: nothing pushes to coming-soon any more",
    !/coming-soon/.test(JOIN),
    "the wall"
  );
  check(
    "1 — ⚠ the requester case is unchanged",
    /case "requester":\s*router\.push\(withCtx\("\/join\/requester"\)\);/.test(JOIN),
    "the requester journey must be byte-for-byte what it was"
  );
  check("1 — the context is carried", /withCtx\("\/join\/requester\?job=buyer"\)/.test(JOIN));
}

{
  const joinDir = join("src", "app", "join");
  const stepPages: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name === "page.tsx" && /[\\/]steps[\\/]page\.tsx$/.test(full)) stepPages.push(full);
    }
  };
  walk(joinDir);
  check(
    "2 — ⚠⚠ exactly one `steps` wizard exists under join/",
    stepPages.length === 1,
    stepPages.join(", ")
  );
  check(
    "2 — and it is the requester's",
    stepPages[0] === join("src", "app", "join", "requester", "steps", "page.tsx"),
    stepPages[0]
  );
  const STEPS = read("src", "app", "join", "requester", "steps", "page.tsx");
  check(
    "2 — ⚠⚠ ABSENCE: the steps page knows nothing about `job`",
    !/\bjob\b/.test(STEPS),
    "a buyer and a requester must be asked the same questions"
  );
}

{
  check("3 — the entry page reads ?job=buyer", /get\("job"\) === "buyer"/.test(REQ));
  check("3 — ⚠ anything else is a requester", /\? "buyer"\s*:\s*"requester"/.test(REQ));
  check("3 — it is posted with the account", /\bjob,\s*\}\),/.test(REQ));
  check("3 — the route accepts it, optional and defaulted", /job: z\.enum\(\["requester", "buyer"\]\)\.optional\(\)\.default\("requester"\)/.test(ROUTE));
  check(
    "3 — ⚠⚠ a buyer gets a BuyerProfile",
    /if \(input\.job === "buyer"\) \{\s*await tx\.buyerProfile\.create\(\{ data: \{ person_id: person\.id \} \}\);/.test(LIB)
  );
  check(
    "3 — ⚠ and still gets a RequesterProfile, which is what makes resume work",
    /await tx\.requesterProfile\.create\(\{ data: \{ person_id: person\.id \} \}\);/.test(LIB),
    "lib/me.ts derives isRequester from it; join/page.tsx:198 resumes on it"
  );
  check("3 — the input type defaults to requester", /job\?: "requester" \| "buyer";/.test(LIB));
}

{
  check(
    "4 — ⚠⚠ ABSENCE: nothing in the wizard asks for a tier",
    !/subscription_tier|BUSINESS_PLUS/.test(REQ) && !/BUSINESS_PLUS/.test(LIB),
    "tier is an upsell, not registration — no payment is collected"
  );
  check(
    "4 — BASIC is the schema default, so it needs no code",
    /subscription_tier\s+SubscriptionTier\s+@default\(BASIC\)/.test(SCHEMA)
  );
  check("4 — ⚠ setBuyerTier survives on disk", /export async function setBuyerTier/.test(readFileSync(join("src", "lib", "onboarding.ts"), "utf8")));
  check("4 — ⚠ its endpoint survives", existsSync(join("src", "app", "api", "onboarding", "buyer", "tier", "route.ts")));
}

{
  check("5 — /join/buyer is still on disk", existsSync(join("src", "app", "join", "buyer", "page.tsx")));
  check("5 — /join/coming-soon is still on disk", existsSync(join("src", "app", "join", "coming-soon", "page.tsx")));
  check("5 — createBuyerAccount survives", /export async function createBuyerAccount/.test(readFileSync(join("src", "lib", "onboarding.ts"), "utf8")));
}

{
  const e = /enum RequesterOnboardingStep \{\s*requester_info\s*work_location\s*review\s*\}/.test(
    SCHEMA.replace(/\r/g, "")
  );
  check(
    "6 — ⚠⚠ RequesterOnboardingStep mirrors REQUESTER_STEPS (E418: no `company`)",
    e,
    "requester_info · work_location · review — the enum and the list must stay in step"
  );
  check(
    "6 — ⚠ ABSENCE: no USER_JOB / USER_CLASS enum was invented",
    !/enum UserJob|enum UserClass|user_job\s+/.test(SCHEMA),
    "that is brief_user_class_job_model, a separate piece of work"
  );
  check("6 — BuyerProfile already existed", /model BuyerProfile \{/.test(SCHEMA));
}

{
  check(
    "7 — ⚠⚠ `company` is no longer a requester step (E418)",
    !/export const REQUESTER_STEPS = \[[^\]]*"company"/.test(read("src", "lib", "requester-steps.ts")),
    "Scott 2026-09-11: strip it all out — company is captured at work order acceptance"
  );
  check(
    "7 — ⚠⚠ the three steps are exactly what E418 left",
    /export const REQUESTER_STEPS = \[\s*"requester_info",\s*"work_location",\s*"review",\s*\]/.test(
      read("src", "lib", "requester-steps.ts")
    ),
    "requester_info · work_location · review"
  );
  check(
    "7 — ⚠ the buyer still routes into the requester wizard",
    /case "buyer-admin":\s*router\.push\(withCtx\("\/join\/requester\?job=buyer"\)\)/.test(
      read("src", "app", "join", "page.tsx")
    ),
    "E421 — one wizard, no fork"
  );
}

if (failures.length) {
  console.error(`\ncheck:buyer-reuse — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:buyer-reuse — ${pass}/${pass} passed`);
