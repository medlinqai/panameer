/**
 * `check:buyer-reuse` — a buyer and a requester walk ONE wizard and answer the
 * same questions (`P1-A1.2-E421`). `npm run check:buyer-reuse`.
 *
 * ── ⚠⚠ WHAT THIS PROTECTS ──────────────────────────────────────────────────
 *
 * SCOTT: *"i want them to both collect the same data. this cant be hard."*
 * ⚠ The cheapest way to break that is a second wizard — a `/join/buyer/steps`,
 * a `role` prop, a copied page. `E408` locked the same rule for `CompanyStep`
 * and for the same reason: two copies diverge. §2 is an ABSENCE-ASSERTION that
 * no second copy exists.
 *
 * ⚠ NO MODEL CALL, NO DATABASE, NO BROWSER — text scans only.
 */
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
  /* ⚠⚠ PROTECTS §1: `join/page.tsx` QUOTES the superseded coming-soon push in
     prose. Without the strip, §1's absence-assertion reads the history. */
  check(
    "0 — ⚠⚠ the superseded coming-soon push is invisible",
    !/router\.push\("\/join\/coming-soon\?job=buyer"\);/.test(JOIN),
    "join/page.tsx quotes this exact line inside a comment"
  );
}

/* ═══ 1 · ⚠⚠ BUYER REACHES THE REQUESTER WIZARD, NEVER COMING-SOON ═══════ */
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
  /* ⚠ AND THE REQUESTER'S OWN CASE IS UNTOUCHED — same push, no job param. */
  check(
    "1 — ⚠ the requester case is unchanged",
    /case "requester":\s*router\.push\(withCtx\("\/join\/requester"\)\);/.test(JOIN),
    "the requester journey must be byte-for-byte what it was"
  );
  check("1 — the context is carried", /withCtx\("\/join\/requester\?job=buyer"\)/.test(JOIN));
}

/* ═══ 2 · ⚠⚠ EXACTLY ONE WIZARD ═════════════════════════════════════════
   Mutate: add a second copy → red.                                         */
{
  /* ⚠ THE STEPS PAGE IS THE WIZARD. There must be exactly one of them under
     `join/`, and it must be the requester's. */
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
  /* ⚠ NO ROLE/JOB PROP THREADED INTO THE WIZARD ITSELF. The job stops at
     account creation; if it reached the steps, the two would start to differ. */
  const STEPS = read("src", "app", "join", "requester", "steps", "page.tsx");
  check(
    "2 — ⚠⚠ ABSENCE: the steps page knows nothing about `job`",
    !/\bjob\b/.test(STEPS),
    "a buyer and a requester must be asked the same questions"
  );
}

/* ═══ 3 · ⚠ HOW THE JOB IS CARRIED AND PERSISTED ════════════════════════ */
{
  check("3 — the entry page reads ?job=buyer", /get\("job"\) === "buyer"/.test(REQ));
  check("3 — ⚠ anything else is a requester", /\? "buyer"\s*:\s*"requester"/.test(REQ));
  check("3 — it is posted with the account", /\bjob,\s*\}\),/.test(REQ));
  check("3 — the route accepts it, optional and defaulted", /job: z\.enum\(\["requester", "buyer"\]\)\.optional\(\)\.default\("requester"\)/.test(ROUTE));
  /* ⚠⚠ PERSISTED AS A `BuyerProfile` — the model that exists today. No enum,
     no column, no migration. */
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

/* ═══ 4 · ⚠ NO TIER SCREEN, AND BASIC APPLIES ON ITS OWN ════════════════ */
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
  /* ⚠ `E164` — the upsell is RETIRED, NOT DELETED. */
  check("4 — ⚠ setBuyerTier survives on disk", /export async function setBuyerTier/.test(readFileSync(join("src", "lib", "onboarding.ts"), "utf8")));
  check("4 — ⚠ its endpoint survives", existsSync(join("src", "app", "api", "onboarding", "buyer", "tier", "route.ts")));
}

/* ═══ 5 · ⚠ RETIRED, NOT DELETED (`E164`) ═══════════════════════════════ */
{
  check("5 — /join/buyer is still on disk", existsSync(join("src", "app", "join", "buyer", "page.tsx")));
  check("5 — /join/coming-soon is still on disk", existsSync(join("src", "app", "join", "coming-soon", "page.tsx")));
  check("5 — createBuyerAccount survives", /export async function createBuyerAccount/.test(readFileSync(join("src", "lib", "onboarding.ts"), "utf8")));
}

/* ═══ 6 · ⚠⚠ NO SCHEMA CHANGE ═══════════════════════════════════════════ */
{
  /*
    ── ⚠⚠ RE-POINTED BY `P1-A1.4-E418`, NOT LOOSENED (2026-09-11) ────────────

    ⚠ SUPERSEDED, quoted not deleted:
        const e = /enum RequesterOnboardingStep \{\s*company\s*requester_info\s*work_location\s*review\s*\}/
        check("6 — ⚠⚠ RequesterOnboardingStep is unchanged", e, "reuse needs no enum change");

    `E421` pinned the enum so that reuse could not quietly change it and so that
    `E418` — which owns the change — could not land twice or half-land. `E418`
    has now landed: `company` is gone from the enum and from `REQUESTER_STEPS`.
    ⚠ THE ASSERTION IS STILL LITERAL AND STILL EXACT, naming all three values in
    order. Deleting it, or relaxing it to "contains requester_info", would give
    up the mirror this exists to protect — see `E421`'s own note below about a
    harness that could no longer fail.
  */
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

/* ═══ 7 · ⚠⚠ THE COMPANY STEP IS GONE — `E418` REMOVED IT ═══════════════ */
{
  /*
    ⚠ SUPERSEDED, quoted not deleted — the tripwire `E421` left for `E418`:

        check("7 — ⚠⚠ `company` is still the first requester step",
          /export const REQUESTER_STEPS = \[\s*"company",/.test(…),
          "E418 removes it from every pathway; doing it twice is the risk");

    It fired exactly as designed the moment `E418` removed the step, and `E418`
    re-pointed it rather than deleting it. ⚠ THE REPLACEMENT IS THE SAME
    ASSERTION FROM THE OTHER SIDE: `company` must now be ABSENT from the list.
  */
  check(
    "7 — ⚠⚠ `company` is no longer a requester step (E418)",
    !/export const REQUESTER_STEPS = \[[^\]]*"company"/.test(read("src", "lib", "requester-steps.ts")),
    "Scott 2026-09-11: strip it all out — company is captured at work order acceptance"
  );
  /*
    ⚠ SUPERSEDED, quoted not deleted — this was decorative and the mutation test
    proved it:

        check("7 — ⚠ ABSENCE: this brief did not touch requester-steps",
          !/E421/.test(read("src", "lib", "requester-steps.ts")));

    ⚠⚠ IT SCANNED THE **STRIPPED** FILE FOR A MARKER ONLY A COMMENT COULD
    CARRY, so it could never fail. ⚠ The thing actually worth protecting is the
    STEP LIST ITSELF: `E418` changes it, this brief must not, and the two
    landing in either order must not silently merge.
  */
  /*
    ⚠ SUPERSEDED, quoted not deleted:
        check("7 — ⚠⚠ the four steps are exactly as E418 will find them",
          /export const REQUESTER_STEPS = \[\s*"company",\s*"requester_info",\s*"work_location",\s*"review",\s*\]/.test(…),
          "company · requester_info · work_location · review — E418 owns any change");

    ⚠⚠ PINNED JUST AS LITERALLY, TO THE NEW LIST. This is the assertion that
    keeps the enum mirror honest from the TypeScript side, and it is the one
    `E421` said must not be deleted or loosened when `E418` moved it.
  */
  check(
    "7 — ⚠⚠ the three steps are exactly what E418 left",
    /export const REQUESTER_STEPS = \[\s*"requester_info",\s*"work_location",\s*"review",\s*\]/.test(
      read("src", "lib", "requester-steps.ts")
    ),
    "requester_info · work_location · review"
  );
  /*
    ⚠⚠ AND THE BUYER STILL WALKS IT. `E421`'s whole claim is that a buyer enters
    the REQUESTER wizard; `E418` removed a step from that wizard, so this asserts
    the reuse survived the removal rather than assuming it did.
  */
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
