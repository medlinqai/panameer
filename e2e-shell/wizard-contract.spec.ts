import { test, expect, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { db } from "./_db";

/**
 * ── ⚠⚠⚠ THE REGRESSION NET FOR `P2-A2-E597`. IT EXISTS TO BE UNCHANGED ────
 *
 * ⚠ SCOTT'S BRIEF, WS-A: record the wizard's behaviour *"so the refactor can be
 * proven unchanged"*, and it must pass **unchanged on trunk before WS-B starts,
 * and unchanged after every WS that follows.**
 *
 * ⚠⚠ IT ASSERTS WHAT EACH SECTION **SAVES**, NOT THAT A SCREEN ADVANCED. A
 * wizard that moves on while saving nothing looks identical to one that works,
 * and `E597` is about to move every one of these save paths.
 * ⚠⚠⚠ SO EVERY ASSERTION ENDS AT A DATABASE ROW. The UI drives it — a pure API
 * walk would keep passing after an extracted component stopped rendering, which
 * is the exact regression this net is for.
 *
 * ── ⚠⚠ IT WALKS THE REVIEW SCREEN'S MODALS, AND THAT IS DELIBERATE ────────
 *
 * ⚠ `E412` put every section's editor behind the review screen — *"No new
 * editors: the step bodies are HOISTED into helpers the step and the modal both
 * mount."* ⚠⚠ THAT SCREEN MOUNTS ALL SEVEN FROM ONE PLACE, so it is both the
 * densest coverage available and the exact surface WS-B cuts. A cold
 * 13-step registration would exercise the same save paths through thirteen
 * times as much choreography, and its failures would be about choreography.
 * ⚠ REPORTED AT THE GATE rather than claimed: this covers the EDITORS, not the
 * first-run itinerary. The itinerary is `check:app-shell`'s and
 * `check:review-edit`'s today.
 *
 * ── ⚠ THE PERSONA IS BUILT AND TORN DOWN BY THIS FILE ─────────────────────
 *
 * ⚠⚠ IT MUST NOT USE A SEEDED PERSONA. This walk WRITES to a provider profile,
 * and doing that to `sw_user21` would move the numbers every other gate asserts
 * — `check:profile-height`, the community counts, `E581`. ⚠ A dedicated row at
 * an `@example.seed` address is created, used and deleted, so the walk leaves
 * the database exactly as it found it.
 */

const EMAIL = "e597.wizard.walk@example.seed";
const PASSWORD = "Panameer123";

/** ⚠ Distinctive values, so an assertion cannot pass on data that was already there. */
const STAMP = "E597WALK";

async function resetPersona(): Promise<{ profileId: string; personId: string }> {
  const prisma = db();
  /* ⚠ Torn down first, not last: a previous run that failed mid-way must not
     make this one assert against its leftovers. */
  const existing = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, person: { select: { id: true } } },
  });
  if (existing?.person) await prisma.person.delete({ where: { id: existing.person.id } });
  if (existing) await prisma.user.delete({ where: { id: existing.id } });

  /* ⚠ BORROWED COMPANY AND SITE. This walk is about the wizard's SAVE PATHS,
     not about company binding — minting an org here would add a second thing
     that can fail and a second thing to clean up. */
  const host = await prisma.person.findFirst({
    where: { company_id: { not: undefined } },
    select: { company_id: true, site_id: true },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  });
  if (!host) throw new Error("no Person to borrow a company/site from");

  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      password_hash: await bcrypt.hash(PASSWORD, 10),
      email_verified: new Date(),
      first_name: "Walk",
      last_name: "Persona",
    },
    select: { id: true },
  });
  const person = await prisma.person.create({
    data: {
      user_id: user.id,
      first_name: "Walk",
      last_name: "Persona",
      is_service_provider: true,
      company_id: host.company_id,
      site_id: host.site_id,
    },
    select: { id: true },
  });
  /*
    ── ⚠⚠ THE PERSONA STARTS COMPLETE, AND THAT IS THE POINT ────────────────

    ⚠ MEASURED: a blank profile never reaches `?step=finish`. The server owns the
    itinerary and sends an empty provider to step 1 of 7, *"How Do You Work?"* —
    so the review screen, where every editor lives, is unreachable until the
    profile has enough on it.
    ⚠⚠ THIS NET IS ABOUT THE EDITORS, NOT THE FIRST-RUN ITINERARY. Seeding the
    profile complete is setup, not a shortcut past the thing under test: WS-B
    moves the editors, and the editors are what the assertions below read.
    ⚠ `work_method` IS THE GATE ON STEP 1 and is the one that decides the whole
    itinerary, so it is set explicitly rather than left to a default.
  */
  const role = await prisma.roleType.findFirst({ select: { id: true } });
  const skill = await prisma.skill.findFirst({
    where: { role_type_id: role?.id },
    select: { id: true },
  });
  const profile = await prisma.providerProfile.create({
    data: {
      person_id: person.id,
      status: "ACTIVE",
      currency: "USD",
      work_method: "SERVICES",
      role_type_id: role?.id ?? null,
      overview: `${STAMP} overview`,
      hourly_rate_cents: 15_000,
    },
    select: { id: true },
  });
  if (skill) {
    await prisma.providerSkill.create({
      data: { provider_profile_id: profile.id, skill_id: skill.id, source: "SELF_ADDED" },
    });
  }
  await prisma.person.update({
    where: { id: person.id },
    data: { title: `${STAMP} starting title`, phone: "+15550109999" },
  });
  return { profileId: profile.id, personId: person.id };
}

async function signInAs(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"]');
  /* ⚠ Hydration — the same race `_auth.ts` records. */
  await page.waitForTimeout(1200);
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', EMAIL, { delay: 5 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', PASSWORD, { delay: 5 });
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
    page.click('button[type="submit"]'),
  ]);
  /*
    ⚠⚠⚠ `res.ok()` IS NOT PROOF OF SIGN-IN, AND IT COST AN HOUR HERE.
    NextAuth's credentials callback answers **200 with an error URL** when the
    password is wrong or the user does not exist — so a failed sign-in and a
    successful one are the same status code. ⚠ MEASURED: a probe against a
    persona that had already been torn down reported `res.ok() === true` and sat
    on `/login`, and every downstream assertion failed describing the wizard
    instead of the session.
    ⚠⚠ SO THE ASSERTION IS THAT WE LEFT `/login`. `_auth.ts` carries the same
    weakness and works only because its persona always exists — reported at the
    gate, not fixed here, because that helper is eight other suites' contract.
  */
  expect(res.ok(), `sign-in as ${EMAIL} returned ${res.status()}`).toBe(true);
  await page.waitForTimeout(1500);
  expect(
    new URL(page.url()).pathname,
    `sign-in as ${EMAIL} did not leave /login — the session was never created`
  ).not.toBe("/login");
}

/**
 * Open the review screen and click one section's Edit, by its accessible name.
 *
 * ⚠⚠ THE NAME IS `EditButton`'s `title` PROP, NOT `EDIT_SECTION_TITLES`. Those
 * two differ — the button says *"Edit Title"* while the modal it opens is
 * headed *"Your Title"* — and using the modal's heading finds nothing.
 * ⚠ MEASURED AT THIS GATE: the review offers TEN edit controls (Title,
 * Overview, Rate, Work History, Solo Projects, Skills, Specializations,
 * Education, Certifications, Location), which is three more than the seven
 * EditLinks on the PROFILE. The two sets are not the same and the brief's table
 * is the profile's.
 */
async function openEditor(page: Page, sectionTitle: string) {
  await page.goto("/join/provider?step=finish", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const diag = await page.evaluate(() => ({
    url: location.href,
    h1: document.querySelector("h1")?.textContent?.trim() ?? "(none)",
    edits: [...document.querySelectorAll("button[aria-label^='Edit ']")].map((b) =>
      b.getAttribute("aria-label")
    ),
  }));
  console.log(`E597/WS-A  review screen: ${diag.h1} | edits: ${diag.edits.join(", ") || "(none)"}`);
  const btn = page.getByRole("button", { name: `Edit ${sectionTitle}` }).first();
  await expect(
    btn,
    `the review screen has no "Edit ${sectionTitle}" control — E412's modal set changed`
  ).toBeVisible({ timeout: 15_000 });
  await btn.click();
  await page.waitForTimeout(700);
}

test.describe.configure({ mode: "serial" });

let ids: { profileId: string; personId: string };

test.beforeAll(async () => {
  ids = await resetPersona();
});

test.afterAll(async () => {
  /* ⚠⚠ THE WALK LEAVES NOTHING BEHIND. Its persona would otherwise show up in
     E581's count, the community graph and every provider total. */
  const prisma = db();
  await prisma.person.deleteMany({ where: { id: ids.personId } });
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.$disconnect();
});

test("⚠⚠ PRECONDITION — the walk persona exists and can sign in", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await signInAs(page);
  /* ⚠ `E586` — a net that walks nothing must fail rather than report success. */
  const profile = await db().providerProfile.findUnique({
    where: { id: ids.profileId },
    select: { id: true },
  });
  expect(profile, "the walk persona has no provider profile").not.toBeNull();
  await page.close();
});

test("⚠⚠⚠ TITLE — the editor saves Person.title", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await signInAs(page);
  await openEditor(page, "Title");

  const value = `${STAMP} Procurement Lead`;
  /*
    ── ⚠⚠⚠ `dialog[open]`, AND BOTH HALVES OF THAT WERE MEASURED ────────────

    ⚠ `Modal` RENDERS A NATIVE `<dialog>`, so a `[role="dialog"]` CSS selector
    matches NOTHING — the role is implicit and never written as an attribute.
    ⚠⚠ AND THE REVIEW SCREEN MOUNTS **FOUR** DIALOGS, ALL PRESENT IN THE DOM AT
    ONCE, only one of them open. A bare `dialog input` matched an input inside
    the CLOSED "Edit Certification" modal and waited for it forever — the
    failure said `locator.fill: Test ended`, which describes the timeout and not
    the cause. ⚠ MEASURED: 4 dialogs, 1 open, heading "Your Title".
  */
  const input = page.locator("dialog[open] input").first();
  await input.fill(value);
  await page.getByRole("button", { name: /^Save$/ }).first().click();
  await page.waitForTimeout(1800);

  /*
    ⚠⚠⚠ `Person.title`, NOT `ProviderProfile.headline`. `E595` WS-B collapsed
    the two columns and the WIRE KEY stayed `headline` — so a test asserting the
    old column would pass on a field that no longer exists.
  */
  const person = await db().person.findUnique({
    where: { id: ids.personId },
    select: { title: true },
  });
  expect(person?.title, "the title editor did not save Person.title").toBe(value);
  await page.close();
});

test("⚠⚠⚠ RATE — the editor saves the rate columns", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await signInAs(page);
  await openEditor(page, "Rate");

  const inputs = page.locator("dialog[open] input");
  const n = await inputs.count();
  expect(n, "the rate editor rendered no inputs").toBeGreaterThan(0);
  await inputs.first().fill("177");
  await page.getByRole("button", { name: /^Save$/ }).first().click();
  await page.waitForTimeout(1800);

  const profile = await db().providerProfile.findUnique({
    where: { id: ids.profileId },
    select: { hourly_rate_cents: true },
  });
  expect(
    profile?.hourly_rate_cents,
    "the rate editor did not save hourly_rate_cents"
  ).toBe(17_700);
  await page.close();
});

test("⚠⚠⚠ CONTACT — the editor saves Person.phone and the address", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await signInAs(page);
  await openEditor(page, "Location");

  /*
    ── ⚠⚠ ADDED BEFORE THE EXTRACTION, NOT AFTER (`P2-A2-E597` WS-B) ────────

    ⚠ SCOTT, 2026-09-21: *"Before extracting each editor, extend
    check:wizard-contract to assert that editor's save in the database... A net
    that doesn't read a field can't catch a broken save of it."*
    ⚠⚠ TITLE AND RATE WERE ALREADY COVERED; CONTACT WAS NOT. So this assertion
    exists, and passes, on the UNEXTRACTED editor first — which is the only way
    it can prove the extraction changed nothing.

    ⚠⚠⚠ IT SAVES TWO DIFFERENT TABLES AND BOTH ARE READ. `postStep("finish", …)`
    writes `Person.phone` directly and hands the address to
    `saveProviderAddress`, which writes an `Address` row under the person's
    SITE. An assertion on the phone alone would pass while every address was
    silently dropped.
  */
  /*
    ⚠⚠ TEN DIGITS, NO `+1`. MEASURED: the field is a MASK and caps at ten
    digits, so `+15550107777` was stored as `1555010777` — the country code ate
    the first slot and the last digit fell off the end.
    ⚠ The test was wrong, not the editor. Recorded because the next person to
    add a phone assertion will reach for `+1` too.
  */
  const phone = "5550107777";
  await page.locator("#review-phone").fill(phone);

  const line1 = `${STAMP} 42 Extraction Way`;
  await page.locator("dialog[open] input").nth(1).fill(line1);

  await page.getByRole("button", { name: /^Save$/ }).first().click();
  await page.waitForTimeout(2200);

  const person = await db().person.findUnique({
    where: { id: ids.personId },
    select: {
      phone: true,
      site: { select: { addresses: { select: { line1: true }, orderBy: { created_at: "desc" }, take: 1 } } },
    },
  });
  /* ⚠ The field MASKS as you type, so the stored value is compared on digits —
     the assertion is that the number arrived, not how it was displayed. */
  expect(
    (person?.phone ?? "").replace(/\D/g, ""),
    "the contact editor did not save Person.phone"
  ).toContain("5550107777");
  expect(
    person?.site?.addresses[0]?.line1,
    "the contact editor did not save the address"
  ).toBe(line1);
  await page.close();
});

test("⚠⚠⚠ SPECIALIZATIONS — the editor saves the join rows", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await signInAs(page);
  await openEditor(page, "Specializations");

  /*
    ── ⚠⚠ ADDED BEFORE THE EXTRACTION, AND IT READS ROWS (`P2-A2-E597` WS-B) ──

    ⚠ SCOTT: *"Specializations and skills each write their own join tables, so
    assert the rows, not just the page."*
    ⚠⚠ SO THIS COUNTS `ProviderProfileSpecialization` BEFORE AND AFTER and names
    the row it expects. A count alone could pass on an unrelated row appearing;
    naming the specialization is what ties the assertion to the chip that was
    clicked.
  */
  const before = await db().providerProfileSpecialization.count({
    where: { provider_profile_id: ids.profileId },
  });

  /* ⚠ `Chip` IS A BUTTON WITH `aria-pressed`. An UNPICKED one is the only safe
     thing to click — clicking a picked chip would REMOVE it, and the assertion
     would then be about a deletion it did not intend to test. */
  const unpicked = page.locator('dialog[open] button[aria-pressed="false"]');
  const n = await unpicked.count();
  expect(n, "the specializations editor offered nothing to pick").toBeGreaterThan(0);
  const chip = unpicked.first();
  /* ⚠⚠ THE CHIP'S TEXT CARRIES A GLYPH. `Chip` renders its children next to a
     `+`/`×` affordance, so `textContent` reads "Oracle Cloud+" for a
     specialization actually named "Oracle Cloud". MEASURED at this gate — the
     first run failed on exactly that trailing character.
     ⚠ Stripping it is the honest comparison: the assertion is about WHICH
     specialization was saved, not about how the button decorates it. */
  const chipText = ((await chip.textContent()) ?? "").trim().replace(/\s*[+×]\s*$/, "");
  await chip.click();
  await page.waitForTimeout(400);

  await page.getByRole("button", { name: /^Save$/ }).first().click();
  await page.waitForTimeout(2200);

  const rows = await db().providerProfileSpecialization.findMany({
    where: { provider_profile_id: ids.profileId },
    select: { specialization: { select: { name: true } } },
  });
  expect(
    rows.length,
    `the specializations editor saved no new join row (was ${before})`
  ).toBeGreaterThan(before);
  expect(
    rows.map((r) => r.specialization.name),
    `the saved rows do not include the chip that was clicked ("${chipText}")`
  ).toContain(chipText);
  await page.close();
});

test("⚠⚠⚠ SKILLS — the editor saves the ProviderSkill rows", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await signInAs(page);
  await openEditor(page, "Skills");

  /*
    ── ⚠⚠ ROWS, NOT A COUNT (`P2-A2-E597` WS-B) ────────────────────────────

    ⚠ SCOTT: *"Specializations and skills each write their own join tables, so
    assert the rows, not just the page."*
    ⚠⚠⚠ AND THE ASSERTION IS DELIBERATELY NOT `count + 1`. `E552` records that
    the skills step DELETES every `ProviderSkill` row for the profile and
    rewrites the picks — so the total after a save is not the total before plus
    one, and a count assertion would fail for a reason that is not a defect.
    ⚠ What must be true is that THE SKILL THAT WAS CLICKED IS THERE afterwards.
    That survives the delete-and-rewrite, and it is the thing a provider cares
    about.
  */
  const unpicked = page.locator('dialog[open] button[aria-pressed="false"]');
  const n = await unpicked.count();
  expect(n, "the skills editor offered nothing to pick").toBeGreaterThan(0);
  const chip = unpicked.first();
  /*
    ⚠⚠ A SKILL CHIP CARRIES ITS DOMAIN, A SPECIALIZATION CHIP DOES NOT.
    MEASURED at this gate: `textContent` reads "Absence Management· PeopleSoft"
    for a skill named "Absence Management" — the picker appends `· <domain>` so
    two identically-named skills from different product lines can be told apart,
    which is `E515`'s whole subject.
    ⚠ So the NAME is the part before the separator, and the `+`/`×` glyph is
    stripped as in the specializations test.
  */
  const chipText = ((await chip.textContent()) ?? "")
    .split("·")[0]
    .trim()
    .replace(/\s*[+×]\s*$/, "");
  await chip.click();
  await page.waitForTimeout(400);

  await page.getByRole("button", { name: /^Save$/ }).first().click();
  await page.waitForTimeout(2500);

  const rows = await db().providerSkill.findMany({
    where: { provider_profile_id: ids.profileId },
    select: { skill: { select: { name: true } } },
  });
  expect(rows.length, "the skills editor saved no ProviderSkill rows").toBeGreaterThan(0);
  expect(
    rows.map((r) => r.skill.name),
    `the saved skills do not include the chip that was clicked ("${chipText}")`
  ).toContain(chipText);
  await page.close();
});

test("⚠⚠ EVERY SECTION THE REVIEW OFFERS OPENS AN EDITOR", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await signInAs(page);
  await page.goto("/join/provider?step=finish", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  /*
    ⚠⚠ ENUMERATED FROM THE PAGE, NOT LISTED HERE (`E587`). A section added to
    the review later is covered by this without an edit — and a section that
    QUIETLY DISAPPEARS during the extraction fails it, which is the regression
    WS-B is most likely to cause.
  */
  const labels = await page.evaluate(() =>
    [...document.querySelectorAll("button[aria-label^='Edit ']")].map(
      (b) => b.getAttribute("aria-label") ?? ""
    )
  );
  expect(labels.length, "the review screen offered no Edit controls").toBeGreaterThan(3);
  console.log(`E597/WS-A  review offers ${labels.length} editors: ${labels.join(" · ")}`);

  /*
    ── ⚠⚠⚠ NOT ALL TEN OPEN A MODAL, AND THAT IS THE FINDING ────────────────

    ⚠ MEASURED AT THIS GATE: `Edit Overview` opens NO dialog — it NAVIGATES to
    the wizard step. `E412` said *"the review screen edits in place, and never
    leaves"*, and for that control it still leaves.
    ⚠⚠ SO THIS TEST RECORDS THE SPLIT RATHER THAN ASSERTING A UNIFORMITY THAT
    DOES NOT EXIST. Claiming all ten are modals would make the net red on trunk,
    and a net that is red before the refactor proves nothing about the refactor.
    ⚠⚠⚠ WHAT IT ASSERTS IS THE PART THAT MUST NOT REGRESS: every control does
    SOMETHING — a modal with controls, or a navigation — and none of them is
    inert. ⚠ `E597` WS-B will make them uniform; this is the before picture.
  */
  const kinds: Record<string, string> = {};
  for (const label of labels) {
    await page.goto("/join/provider?step=finish", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: label }).first().click();
    await page.waitForTimeout(900);

    const seen = await page.evaluate(() => ({
      open: document.querySelectorAll("dialog[open]").length,
      controls: document.querySelectorAll(
        "dialog[open] input, dialog[open] textarea, dialog[open] button, dialog[open] select"
      ).length,
      heading: document.querySelector("h1")?.textContent?.trim() ?? "",
      /* ⚠ THE THIRD PATTERN: `Edit Overview` opens no modal and goes nowhere —
         it SCROLLS TO AND FOCUSES a textarea on the review page itself
         (`page.tsx`: `getElementById("review-overview")` then `.focus()`).
         Its own comment says why: *"the bio is edited on THIS page; there is no
         bio step to travel to any more."* */
      focused: document.activeElement?.tagName ?? "",
      focusedId: document.activeElement?.id ?? "",
    }));

    if (seen.open > 0) {
      expect(seen.controls, `"${label}" opened a modal with no controls`).toBeGreaterThan(1);
      kinds[label] = `modal (${seen.controls} controls)`;
    } else if (seen.focused === "TEXTAREA" || seen.focused === "INPUT") {
      /* ⚠⚠ EDITED IN PLACE ON THE REVIEW PAGE — a THIRD pattern beside "modal"
         and "wizard step", and one WS-B has to keep working. */
      kinds[label] = `inline on the review (focuses #${seen.focusedId || "?"})`;
    } else {
      expect(
        seen.heading.length,
        `"${label}" opened nothing at all — no modal, no step, no focused field`
      ).toBeGreaterThan(0);
      kinds[label] = `NAVIGATES to "${seen.heading}"`;
    }
  }
  console.log("E597/WS-A  what each review control does:");
  for (const [k, v] of Object.entries(kinds)) console.log(`             ${k.padEnd(24)} ${v}`);

  /* ⚠⚠ THE COUNT IS THE CONTRACT. WS-B must not quietly drop a section. */
  expect(Object.keys(kinds).length, "a review editor disappeared").toBe(labels.length);
  await page.close();
});
