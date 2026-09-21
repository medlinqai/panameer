import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ THE GATE PERSONA — ONE CONSTANT, READ BY EVERY APP-SHELL GATE ──────
 *
 * ⚠ SCOTT, 2026-09-21, ruling on the `P0-E595` WS-B gate: *"test3: the roster
 * wins. test3@panameer.com stays Vincent Best, Recruiter. Move every app-shell
 * gate off test3 and onto one named, complete seeded provider (photo, rates,
 * skills), defined in one constant that every gate reads. The gate must fail
 * loudly if that persona isn't a complete provider. A gate that passes on
 * nothing isn't a gate (E586)."*
 *
 * ── WHY test3 HAD TO GO ────────────────────────────────────────────────────
 *
 * ⚠⚠ `test3@panameer.com` IS A RECRUITER IN `Users.xlsx` — Vincent Best,
 * Hollywood Consulting, job `Recruiter` — and a recruiter sells the services of
 * OTHERS. `WorkMethod.RECRUITER` SUPPRESSES THE RATE by design, so a recruiter
 * can never satisfy `providerMeetsRequired`, which requires one.
 * ⚠⚠⚠ SO EVERY GATE ASSERTING ABOUT RATES, A PUBLIC PROVIDER PAGE OR A
 * COMPLETE PROFILE WAS ASSERTING IT AGAINST AN ACCOUNT THE MODEL SAYS CANNOT
 * HAVE ONE. It only ever passed because test3 carried a hand-made profile that
 * predated the roster — and the `E595` reset deleted it, which is how this
 * surfaced. The gates were reading a fact about one account and being believed
 * as a fact about providers.
 *
 * ── ⚠⚠ WHY THIS FILE EXISTS RATHER THAN A STRING IN SEVEN SPECS ────────────
 *
 * ⚠ `_auth.ts` already carries the rule in its own header: *"a second copy of
 * the sign-in is the `teachesPathWhere` mistake applied to test code."* The
 * PERSONA is the same argument one level up. ⚠⚠ Seven specs each naming their
 * own account is seven things to miss on the next reset.
 */

/**
 * ⚠⚠ PRIYA NAIR — `sw_user21@straterp.com`, pid `3.v2-1`.
 *
 * ⚠ CHOSEN BECAUSE THE SPREADSHEET FULLY SPECIFIES HER and nothing here is
 * invented: `Users.xlsx` states her class (Provider), her lens
 * (Application-Specific), her headline (*"Oracle Cloud Procurement Expert"*),
 * her rate ($210), her location (New York, NY) and that she is validated.
 * ⚠⚠ She is therefore the one persona whose completeness is a ROSTER FACT
 * rather than a seeding convenience — which is exactly what a gate should
 * stand on.
 * ⚠ The password is READ FROM THE SEED FILE, never hardcoded, so a rotation in
 * `Users.xlsx` reaches the suite instead of breaking it a month later.
 */
export const GATE_PROVIDER_EMAIL = "sw_user21@straterp.com";

/** ⚠ The roster is the source of truth for the password, as in `_auth.ts`. */
export function gateProvider(): { email: string; password: string; name: string } {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "seed-data", "test-users.json"), "utf8")
  ) as Record<string, unknown>;
  const rows = (Object.values(raw).filter(Array.isArray) as {
    email?: string;
    password?: string;
    name?: string;
  }[][]).flat();
  const hit = rows.find(
    (r) => (r.email ?? "").toLowerCase() === GATE_PROVIDER_EMAIL.toLowerCase() && r.password
  );
  if (!hit) {
    throw new Error(
      `${GATE_PROVIDER_EMAIL} is not in prisma/seed-data/test-users.json with a password. ` +
        `The gate persona must be a roster account — see e2e-shell/_persona.ts.`
    );
  }
  return { email: hit.email!, password: hit.password!, name: hit.name ?? "" };
}

/**
 * ── ⚠⚠⚠ THE PRECONDITION. `E586` IS WHY IT THROWS INSTEAD OF SKIPPING ──────
 *
 * ⚠ `E586` is `check:resume` reporting `0 passed, 0 failed, 16 skipped` with
 * EXIT CODE 0 because its fixtures did not exist — *"the defect is that a gate
 * with no inputs does not fail"*, and it was quoted as green for weeks.
 * ⚠⚠ THE SAME HOLE IS OPEN HERE THE MOMENT A RESET EMPTIES THE SEED: a spec
 * that signs in and finds an empty profile can still pass every `toBeVisible`
 * it happens to assert, because an absent surface asserts nothing.
 *
 * ⚠⚠ SO THIS RUNS FIRST AND IT FAILS LOUDLY, naming the field that is missing
 * and the command that fixes it. It asserts the persona is a COMPLETE PROVIDER
 * the way a BUYER would see one — on the public page, not the owner's — because
 * that is the claim the downstream specs rely on.
 */
export async function requireCompleteProvider(page: Page): Promise<string> {
  const fix = `Re-seed with: npm run seed:test-data -- --apply`;

  /*
    ── ⚠⚠ IT READS THE SEED'S OWN RECEIPT RATHER THAN SEARCHING FOR THE PERSON ─

    ⚠ MEASURED 2026-09-21, AND IT IS WHY THE FIRST VERSION OF THIS ASSERTION WAS
    WRONG: `/talent` is a MARKETING page with a search hero and NO list, and
    `/explore` takes FOUR and MASKS the names — its own header calls it *"a
    search-results surface with masked people on it"*. ⚠⚠ A GATE THAT GREPS A
    MASKED, TRUNCATED, RELEVANCE-ORDERED LIST FOR A NAME GOES RED FOR REASONS
    THAT HAVE NOTHING TO DO WITH WHAT IT IS ASSERTING.

    ⚠⚠⚠ `gate-persona.json` IS WRITTEN BY THE SEED ON EVERY `--apply` RUN, and
    its `complete` flag is COMPUTED FROM THE ROW THE SEED JUST WROTE against the
    same seven clauses `providerMeetsRequired` uses. So a missing file, a stale
    file or a `complete: false` all fail here, loudly and by name.
  */
  let receipt: {
    email?: string;
    name?: string;
    title?: string;
    skillNames?: string[];
    providerProfileId?: string;
    publicPath?: string;
    complete?: boolean;
    missing?: string[];
  };
  try {
    receipt = JSON.parse(
      readFileSync(join(process.cwd(), "prisma", "seed-data", "gate-persona.json"), "utf8")
    );
  } catch {
    throw new Error(
      `GATE PERSONA RECEIPT MISSING: prisma/seed-data/gate-persona.json does not exist. ` +
        `Every app-shell gate asserts against it. ${fix}`
    );
  }

  expect(
    (receipt.email ?? "").toLowerCase(),
    `GATE PERSONA MISMATCH: the receipt names ${receipt.email}, the suite signs in as ` +
      `${GATE_PROVIDER_EMAIL}. One of prisma/gate-persona.ts or the seed is stale. ${fix}`
  ).toBe(GATE_PROVIDER_EMAIL.toLowerCase());

  expect(
    receipt.complete,
    `GATE PERSONA INCOMPLETE: ${receipt.name} (${GATE_PROVIDER_EMAIL}) is missing ` +
      `${(receipt.missing ?? []).join(", ") || "(unknown)"}. providerMeetsRequired needs ` +
      `title, role, a skill, a rate, photo, phone and an address. ${fix}`
  ).toBe(true);

  const href = receipt.publicPath;
  if (!href) throw new Error(`GATE PERSONA RECEIPT has no publicPath. ${fix}`);

  /*
    ⚠ AND THE PAGE ITSELF RENDERS THE THREE FACTS SCOTT NAMED — photo, rates,
    skills. ⚠⚠ The receipt proves the DATABASE ROW; this proves the PAGE, and
    they are different failures. ⚠⚠⚠ `/providers/[id]` 404s for a provider who
    fails the required set (`E581`), so reaching it at all is the visibility
    assertion — which is what `/talent` was reached for and could not give.
  */
  const res = await page.goto(href, { waitUntil: "domcontentloaded" });
  expect(
    res?.status(),
    `GATE PERSONA UNREACHABLE: ${href} returned ${res?.status()}. /providers/[id] 404s for a ` +
      `provider who fails the visibility gate. ${fix}`
  ).toBeLessThan(400);

  const shot = await page.evaluate(() => ({
    photo: document.querySelectorAll("main img").length,
    text: (document.body.innerText || "").toLowerCase(),
  }));
  expect(
    shot.photo,
    `GATE PERSONA INCOMPLETE: ${receipt.name}'s public page renders no image at all. ${fix}`
  ).toBeGreaterThan(0);

  /*
    ⚠⚠ ASSERTED ON THE PERSONA'S OWN DATA, NOT ON A HEADING — and that was a
    measured correction, not a preference. ⚠ SUPERSEDED, quoted not deleted
    (`E164`): `for (const needle of ["rate", "skill"])`.
    ⚠⚠⚠ `E562` RETIRED THE STANDALONE SKILLS CARD: skills render as chips in the
    hero with no "Skills" label, and the rate rows are the OWNER's only
    (`E593`). So both needles were asserting about page furniture that the
    product had deliberately removed, on a page that was entirely correct.
    ⚠ The title and a real skill name cannot rot that way.
  */
  expect(
    shot.text.includes((receipt.title ?? "").toLowerCase()),
    `GATE PERSONA INCOMPLETE: the title "${receipt.title}" is absent from ` +
      `${receipt.name}'s public page. ${fix}`
  ).toBe(true);

  /*
    ⚠⚠ THE SKILLS ARE ASSERTED FROM THE RECEIPT, NOT FROM THE PAGE, AND THAT IS
    A MEASURED CORRECTION. ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   expect(skills.some((s) => shot.text.includes(s.toLowerCase())), …).toBe(true);
    ⚠⚠⚠ `/providers/[id]` RENDERS `ConnectProfile`, AND `ConnectProfile.tsx`
    CONTAINS THE WORD "skills" ZERO TIMES — measured 2026-09-21. The public
    provider page shows no skills to anybody, so that assertion was failing on a
    page that is behaving exactly as built, which is the `check:cert-skills`
    mistake in reverse: a gate encoding a surface the product does not have.
    ⚠ REPORTED SEPARATELY — a buyer-facing profile with no skills on it is an
    `E581`-adjacent product gap, and it is Scott's to rule on, not a gate's.
  */
  const skills = receipt.skillNames ?? [];
  expect(
    skills.length,
    `GATE PERSONA INCOMPLETE: the receipt lists no skills for ${receipt.name}. ` +
      `providerMeetsRequired needs at least one. ${fix}`
  ).toBeGreaterThan(0);

  return href;
}
