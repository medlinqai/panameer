import { test, expect, type Page, type Browser } from "@playwright/test";
import { signIn } from "./_auth";

/**
 * ── ⚠⚠ THE CONNECT WALK (`P2-J3-E567` WS-B) ───────────────────────────────
 *
 * `P2-J3-E558` shipped five surfaces and NOT ONE was rendered by any automated
 * gate. They are auth-gated, so `check:ui` cannot reach them; `check:app-shell`
 * can, but its `PAGES` list does not include them.
 *
 * ⚠⚠ ITS OWN SPEC FILE, NOT AN ADDITION TO `app-shell.spec.ts`'s `PAGES`. That
 * array feeds the shell contract and its count (29) is quoted in briefs. The
 * config's own docblock sets the pattern one level up: *"Two configs, two
 * numbers, neither able to hide a regression in the other."* Same reasoning
 * here — new spec, own count.
 *
 * ⚠⚠⚠ THIS SUITE ASSERTS THE EMPTY STATE IS THE DESIGNED ONE. IT DOES NOT
 * ASSERT ROWS. Every surface renders empty on every account today —
 * `ForumThread` 0, `CoordinatorInvite` 0, providers-with-coordinator 0,
 * `open_for_mentoring` 0. ⚠ AN ASSERTION THAT NEEDED DATA WOULD BE AN ASSERTION
 * THAT FORCES SEEDING, and seeding to make a surface demonstrable is `E564`.
 * ⚠ The honest empty states cost four stop gates to get right. This is what
 * stops them regressing.
 *
 * ⚠ ROUTES CONFIRMED AGAINST `PAGE_TABS["/community"]` IN `nav.ts`, not taken
 * from the brief. ⚠⚠ `Find a Mentor` IS NOT A SIXTH ROUTE — it is a section on
 * `/community/mentors`, which is why it is asserted there.
 *
 * ⚠ THE DUAL-ROLE HALF IS NOT HERE AND CANNOT BE. `test3@panameer.com` is
 * provider-only (measured — see `_auth.ts`), and the seed has no dual-role
 * account. ⚠⚠ THE SHAPE IS PROVED STATICALLY INSTEAD, in `check:community`'s
 * Teams block: two independent `hasCapability()` calls and no either/or branch.
 * A shape is catchable in Node; it needs no account, no browser and no seed.
 */

const ROUTES = {
  home: "/community",
  colleagues: "/community/colleagues",
  forums: "/community/forums",
  mentors: "/community/mentors",
  teams: "/community/teams",
} as const;

let browserRef: Browser;
let page: Page;
/** ⚠ Collected per navigation so a failure names the page that logged it. */
let consoleErrors: string[] = [];

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  browserRef = browser;
  const ctx = await browserRef.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  await signIn(page);
});

test.afterAll(async () => {
  await page?.context().close();
});

/**
 * ⚠⚠ THE FLOOR, ASSERTED BEFORE ANYTHING ELSE: it rendered, and it did not
 * bounce to `/login`.
 * ⚠ A REDIRECT TO `/login` MEANS THE FIXTURE IS BROKEN, NOT THE PAGE, and the
 * message says which — otherwise a dead session reads as five page failures.
 */
async function open(path: string) {
  consoleErrors = [];
  const res = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(res?.status(), `${path} returned ${res?.status()}`).toBeLessThan(400);
  await page.waitForLoadState("networkidle");
  expect(
    new URL(page.url()).pathname,
    `${path} redirected to ${new URL(page.url()).pathname} — the SIGN-IN FIXTURE is broken, not the page`
  ).not.toBe("/login");
}

/* ── 1 · EVERY PAGE RENDERS, SIGNED IN, WITH NO CONSOLE ERROR ───────────── */
for (const [name, path] of Object.entries(ROUTES)) {
  test(`E567/1 — ${name} (${path}) renders signed in`, async () => {
    await open(path);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test(`E567/1 — ${name} logs no console error`, async () => {
    await open(path);
    expect(consoleErrors, `${path} logged: ${consoleErrors.join(" | ")}`).toEqual([]);
  });
}

/* ── 2 · CONNECT HOME — THE TAB ROW, AND MESSAGES STILL LAST ────────────── */
test("E567/2 — the CONNECT tab row renders with Home first", async () => {
  await open(ROUTES.home);
  await expect(page.getByText("CONNECT", { exact: true }).first()).toBeVisible();
  const tabs = page.locator('a[href^="/community"], a[href="/messages"]');
  await expect(tabs.filter({ hasText: "Home" }).first()).toBeVisible();
});

/*
  ── ⚠⚠ MESSAGES HAS LEFT THE ROW (`P2-ALL-E560` STAGE 1, 2026-09-18) ────────

  ⚠ THIS ASSERTION NAMED ITS OWN EXPIRY — *"it leaves under `E560`"* — AND THIS
  IS `E560`. ⚠⚠ IT IS INVERTED, NOT DELETED: the rule was never *"Messages must
  be last"*, it was *"the row must never leave messages unreachable"*. That rule
  still holds; the door moved to the band's utility cluster.

  ⚠ SUPERSEDED, quoted not deleted (`E164`), as LINE comments per rule 12 because
  the quoted body carries its own block comment:
  // test("E567/2 - Messages is still LAST in the row (it leaves under E560)", async () => {
  //   await open(ROUTES.home);
  //   ASSERTED ON THE TAB HREFS IN DOM ORDER, not by walking up from one link to
  //   a guessed container. THE FIRST VERSION DID THE LATTER
  //   (closest("div")?.parentElement) AND FAILED - a layout change it was not
  //   testing would have broken it, which is a test that reports the wrong thing.
  //   const TAB_HREFS = ["/community", "/community/colleagues", "/community/forums",
  //     "/community/mentors", "/community/teams", "/messages"];
  //   ... collects those hrefs in DOM order ...
  //   expect(order).toContain("/messages");
  //   expect(order[order.length - 1]).toBe("/messages");
  // });
*/
test("E560/2 — Messages is GONE from the CONNECT row, and still reachable", async () => {
  await open(ROUTES.home);

  /* ⚠ The five that remain, in order — the row did not lose anything else. */
  const TAB_HREFS = [
    "/community",
    "/community/colleagues",
    "/community/forums",
    "/community/mentors",
    "/community/teams",
  ];
  const order = await page.evaluate((hrefs) => {
    const seen: string[] = [];
    for (const a of Array.from(document.querySelectorAll("a"))) {
      const href = a.getAttribute("href") ?? "";
      if (hrefs.includes(href) && !seen.includes(href)) seen.push(href);
    }
    return seen;
  }, TAB_HREFS);
  expect(order, `tab hrefs found: ${order.join(" | ")}`).toEqual(TAB_HREFS);

  /*
    ⚠⚠ AND THE DOOR DID NOT CLOSE — THIS HALF IS THE POINT.
    ⚠ Removing a tab without proving the replacement exists is exactly how
    `E493`'s invite and `E519`'s résumé re-run got buried. The cluster link is
    asserted BY ITS aria-label inside the band, not by counting links on the page.
  */
  const clusterLink = page.locator('.pm-band-right a[aria-label="Messages"]');
  await expect(clusterLink).toHaveCount(1);
  await expect(clusterLink).toHaveAttribute("href", "/messages");

  /* ⚠ NO DIGIT ON IT, EVER — `Message` holds zero rows so no dot ships yet, and
     when one does it is a DOT, never a number (Scott, 2026-09-18). */
  await expect(clusterLink).not.toHaveText(/\d/);
});

/* ── 3 · COLLEAGUES — NO MEMBER-WIDE SEARCH ─────────────────────────────── */
test("E567/3 — typing in Colleagues search fires NO request", async () => {
  await open(ROUTES.colleagues);
  /*
    ⚠⚠ THE `E558` WS-A RULING, MADE MECHANICAL. The box filters a list already on
    the page, in memory — there is no endpoint behind it. ⚠ THIS IS THE EASIEST
    THING IN THE BRIEF TO REGRESS BY "IMPROVING" THE SEARCH, and the member-wide
    query it replaced is the route 145 providers take to reach 13 buyers.
    ⚠ ASSERTED ON *ANY* REQUEST, not on a named endpoint — a future search would
    not necessarily reuse the old URL, and naming one would let a differently
    named one through.
  */
  const requests: string[] = [];
  const record = (r: { url: () => string }) => {
    const u = r.url();
    if (!/\.(js|css|woff2?|png|jpg|svg|ico|map)(\?|$)/.test(u)) requests.push(u);
  };
  page.on("request", record);
  const box = page.getByLabel("Search your colleagues");
  await expect(box).toBeVisible();
  await box.type("payab", { delay: 30 });
  await page.waitForTimeout(700);
  page.off("request", record);
  expect(
    requests,
    `typing fired ${requests.length} request(s): ${requests.join(" | ")}`
  ).toEqual([]);
});

/* ── 4 · FORUMS — ZERO THREADS COLLAPSES TO ONE PANEL ───────────────────── */
test("E567/4 — with zero threads the two groups collapse to ONE panel", async () => {
  await open(ROUTES.forums);
  /* ⚠ The two group headings exist only when there is something in them. With
     zero threads NEITHER may render — two empty bordered boxes read as
     something that failed to load, which is the house pattern this replaced. */
  await expect(page.getByText("No Replies Yet")).toHaveCount(0);
  await expect(
    page.getByText("Answered by Someone Else — You Haven't Weighed In")
  ).toHaveCount(0);
});

test("E567/4 — the rail still lists rooms", async () => {
  await open(ROUTES.forums);
  /* ⚠ THE PAGE IS NEVER BLANK. The rail says the rooms exist and nothing has
     been asked yet, which is true. */
  /* ⚠ `exact` — "Your Forums" also matches "Recent in Your Forums" on this
     page, and a strict-mode violation reports as a failure of the thing being
     tested rather than of the selector. */
  await expect(
    page.getByRole("heading", { name: "Your Forums", exact: true })
  ).toBeVisible();
});

/* ── 5 · MENTORING — THE NO-PROMISE RULE, MADE MECHANICAL ───────────────── */
/**
 * ⚠⚠ THE RULE IS ABOUT PROMISES, NOT VOCABULARY, AND THE FIRST VERSION OF THIS
 * TEST GOT IT WRONG.
 *
 * ⚠ It scanned rendered text for `Book|Booking|Purchase|Buy|Pay` and FAILED on
 * the `Paid Sessions` state-table row *"Booking a block of time" -> "Not built —
 * no scheduling exists"* — which is EXACTLY WHAT THE BRIEF ASKED FOR. Naming a
 * thing that does not exist, and saying it does not exist, is the opposite of
 * promising it.
 * ⚠⚠ SO THE ASSERTION TESTS THE PROMISE: an INTERACTIVE CONTROL offering to
 * book, buy or pay. A word in a table nobody can click is not a promise; a
 * button is.
 */
const PROMISE_VERBS = /\b(book|booking|purchase|buy|pay|checkout|subscribe)\b/i;

test("E567/5 — no control on Mentoring offers a booking or a payment", async () => {
  await open(ROUTES.mentors);
  const controls = await page.locator("button, a").allInnerTexts();
  const offenders = controls
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter((t) => t && PROMISE_VERBS.test(t));
  expect(
    offenders,
    `these clickable controls offer a booking or payment: ${offenders.join(" | ")}`
  ).toEqual([]);
});

test("E567/5 — Mentoring shows no rate, price or currency", async () => {
  await open(ROUTES.mentors);
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  /* ⚠⚠ A RATE BESIDE A "Follow as a Mentor" BUTTON READS AS A PRICE FOR A
     SESSION NOBODY CAN BUY. `rateDisplay` was deliberately removed from this
     page in `E558` WS-C2 and nothing currently stops it coming back. */
  expect(/\$\d/.test(body), `a currency amount appears: ${body.slice(0, 200)}`).toBe(false);
  expect(/\bper hour\b|\bhourly\b/i.test(body), "an hourly rate appears").toBe(false);
});

test("E567/5 — Paid Sessions renders as a state table, not a button", async () => {
  await open(ROUTES.mentors);
  const section = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Paid Sessions" }) });
  await expect(section).toBeVisible();
  /* ⚠ A TABLE OF FACTS ABOUT THE BUILD. ⚠⚠ AND NO CONTROL INSIDE IT — the
     brief's rule is that nothing here may promise a session. */
  await expect(section.locator("table")).toBeVisible();
  await expect(section.locator("button, a")).toHaveCount(0);
});

test("E567/5 — the mentor signal renders even at 0", async () => {
  await open(ROUTES.mentors);
  /* ⚠ RENDERED AT 0, NOT HIDDEN — nobody buys time with a mentor they cannot
     evaluate, and hiding a zero is how a page starts flattering people. */
  await expect(page.getByRole("heading", { name: "Your Mentor Signal" })).toBeVisible();
  await expect(page.getByText("answers marked helpful").first()).toBeVisible();
});

/* ── 6 · FIND A MENTOR — THE EMPTY STATE RECRUITS ───────────────────────── */
test("E567/6 — Find a Mentor's empty state states the mechanism", async () => {
  await open(ROUTES.mentors);
  await expect(page.getByRole("heading", { name: "Find a Mentor" })).toBeVisible();
  /* ⚠⚠ IT SAYS WHY IT IS EMPTY — opt-in, nobody has chosen — rather than
     "nothing found", which teaches nobody anything. ⚠ And it must NOT be papered
     over by widening the gate. */
  await expect(page.getByText(/Mentoring is opt-in/i)).toBeVisible();
});

test("E567/6 — it offers the toggle to a viewer with a provider profile", async () => {
  await open(ROUTES.mentors);
  /* ⚠ `test3@panameer.com` HAS a provider profile (measured — see `_auth.ts`),
     so the toggle is offered. ⚠⚠ THE SAME COMPONENT AND ENDPOINT AS WS-C1 — no
     second endpoint was built. */
  await expect(page.getByText("Open for mentoring").first()).toBeVisible();
});

/* ── 7 · TEAMS — SINGULAR HEADINGS, CONSENT LANGUAGE, PROVIDER SET ONLY ── */
test("E567/7 — Teams headings are SINGULAR", async () => {
  await open(ROUTES.teams);
  /* ⚠⚠ THERE IS NO `Team` MODEL. The relationship is
     `ProviderProfile.coordinator_person_id`, a nullable FK, so a provider
     belongs to at most ONE coordinator. ⚠ Plural headings would label something
     the schema forbids. RENAME WHEN THE MODEL BECOMES ONE-TO-MANY. */
  await expect(page.getByRole("heading", { name: "The Team You’re On" })).toBeVisible();
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  expect(/\bTeams you(’|')re on\b/i.test(body), "a plural heading returned").toBe(false);
  expect(/\bTeams you manage\b/i.test(body), "a plural heading returned").toBe(false);
});

test("E567/7 — a provider-only viewer sees the PROVIDER set and NOT the recruiter set", async () => {
  await open(ROUTES.teams);
  /*
    ⚠⚠ THIS IS HALF THE CAPABILITY RULING, AND IT IS THE HALF A BROWSER CAN
    PROVE. `test3@panameer.com` holds `canProvideServices` and NOT
    `canCoordinate` (measured — see `_auth.ts`), so the provider set renders and
    the recruiter set must be absent. That proves the gate EXCLUDES correctly.
    ⚠ THE OTHER HALF — that someone holding BOTH sees BOTH — cannot be proved
    here: the seed has no dual-role account, and adding one changes row counts
    other gates quote. ⚠⚠ IT IS PROVED STATICALLY in `check:community`'s Teams
    block instead.
  */
  await expect(page.getByRole("heading", { name: "The Team You’re On" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Invitations" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recruiters you know" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Your Team", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Your Team’s Coverage" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Open Work You Could Field" })
  ).toHaveCount(0);
});

/* ── 8 · TITLE CASE, LOCKED AT THE LITERAL (`P2-J3-E568`) ────────────────────
   ⚠⚠ THE CORRECTED STRINGS, ASSERTED EXACTLY — NOT A TITLE-CASE ALGORITHM. A
   test that re-implements the rule is the `titleCase()` helper the brief forbids,
   wearing a different hat: a second definition of the house style that will
   eventually disagree with the house style.
   ⚠ THE RULE, for a reader: Title Case for card titles, section headings and
   buttons; articles and short prepositions lowercase unless first or last word
   (`on`, `to`, `by`, `a`); ⚠⚠ PRONOUNS ALWAYS CAPITALIZE — `You`, `Your`, `My`,
   `It`, `This`. That last one is what a naive library gets wrong.

   ⚠⚠ NOTHING IN THE DO-NOT-TOUCH TABLE IS ASSERTED HERE — no error copy, no
   empty-state sentence, no placeholder, no state-table value, no data. Guarding
   those would forbid a legitimate future copy edit to an error message. */
/*
  ⚠⚠ ONLY STRINGS THAT RENDER AGAINST TODAY'S EMPTY DATA. Four corrected strings
  are DELIBERATELY ABSENT from this list because their sections are CONDITIONAL
  and do not render for this account:
    · `People You May Know`  — renders only when there are suggestions
    · `In Paths You Teach`   — renders only for a path instructor
    · `Mentors You Follow`   — renders only when following someone
    · `Turn On`              — the toggle reads `You're open` once opted in
  ⚠ MEASURED, NOT ASSUMED: the first version of this list included
  `People You May Know` and FAILED on `/community`.
  ⚠⚠ AN ASSERTION THAT NEEDS ROWS IS AN ASSERTION THAT FORCES SEEDING (`E564`),
  and seeding to make a guard pass is how a suite starts being satisfied by fake
  data. ⚠ Those four are still covered by the "originals are gone" test below,
  which passes whether or not the section renders.
*/
const TITLE_CASE: { route: string; strings: string[] }[] = [
  { route: ROUTES.home, strings: ["Waiting on You"] },
  { route: ROUTES.colleagues, strings: ["Invite a Colleague", "Shared Skills"] },
  { route: ROUTES.forums, strings: ["Recent in Your Forums", "Your Forums"] },
  {
    route: ROUTES.mentors,
    strings: [
      "Members Following You as a Mentor",
      "Your Mentor Signal",
      "Paid Sessions",
      "Find a Mentor",
    ],
  },
  {
    route: ROUTES.teams,
    strings: ["The Team You’re On", "Recruiters You Know", "Invitations"],
  },
];

for (const { route, strings } of TITLE_CASE) {
  test(`E568 — Title Case survives on ${route}`, async () => {
    await open(route);
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    const missing = strings.filter((t) => !body.includes(t));
    expect(
      missing,
      `these exact strings were not found on ${route}: ${missing.join(" | ")}`
    ).toEqual([]);
  });
}

test("E568 — the lower-case originals are gone", async () => {
  /* ⚠ THE OTHER HALF: asserting the corrected string is present does not prove
     the old one left — a page could render both. ⚠⚠ ONLY THE STRINGS THIS BRIEF
     CHANGED are listed; nothing here constrains copy it did not touch. */
  const GONE: { route: string; strings: string[] }[] = [
    { route: ROUTES.home, strings: ["Waiting on you", "People you may know"] },
    { route: ROUTES.colleagues, strings: ["Shared skills"] },
    { route: ROUTES.forums, strings: ["In paths you teach", "Recent in your forums"] },
    {
      route: ROUTES.mentors,
      strings: ["Mentors you follow", "Your mentor signal", "Paid sessions", "Find a mentor"],
    },
    { route: ROUTES.teams, strings: ["Recruiters you know", "Open work you could field"] },
  ];
  const offenders: string[] = [];
  for (const { route, strings } of GONE) {
    await open(route);
    const body = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    for (const t of strings) if (body.includes(t)) offenders.push(`${route}: "${t}"`);
  }
  expect(offenders, `lower-case originals still rendering: ${offenders.join(" | ")}`).toEqual(
    []
  );
});
