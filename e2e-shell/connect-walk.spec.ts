import { test, expect, type Page, type Browser } from "@playwright/test";
import { signIn } from "./_auth";
import { requireCompleteProvider } from "./_persona";

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
 * ⚠ ROUTES CONFIRMED AGAINST `PAGE_TABS["/connect"]` IN `nav.ts`, not taken
 * from the brief. ⚠⚠ `Find a Mentor` IS NOT A SIXTH ROUTE — it is a section on
 * `/community/mentors`, which is why it is asserted there.
 *
 * ⚠ THE DUAL-ROLE HALF IS NOT HERE AND CANNOT BE. `test3@panameer.com` is
 * provider-only (measured — see `_auth.ts`), and the seed has no dual-role
 * account. ⚠⚠ THE SHAPE IS PROVED STATICALLY INSTEAD, in `check:community`'s
 * Teams block: two independent `hasCapability()` calls and no either/or branch.
 * A shape is catchable in Node; it needs no account, no browser and no seed.
 */

/*
  ── ⚠⚠ `home` IS `/connect` NOW (`P2-J3-E591` WS-A) ────────────────────────

  ⚠ The route split moved the member's own profile to `/connect` and left the
  PEOPLE at `/community`. ⚠⚠ `home` HERE MEANS "THE TAB LABELLED Home", which
  followed the profile — so the walk still opens what the first tab opens.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   home: "/community",
  ⚠ `community` IS A NEW ENTRY, not a rename of `home`: the Community page is a
  real destination with its own tab and it needs its own console-error walk.
*/
/**
 * ── ⚠⚠⚠ THE PRECONDITION. IT RUNS FIRST AND IT FAILS LOUDLY (`P0-E595` WS-B) ─
 *
 * ⚠ SCOTT, 2026-09-21: *"The gate must fail loudly if that persona isn't a
 * complete provider. A gate that passes on nothing isn't a gate (E586)."*
 *
 * ⚠⚠ `E586` IS `check:resume` REPORTING `0 passed, 0 failed, 16 skipped` WITH
 * EXIT CODE 0 because its fixtures did not exist, and it was quoted as green in
 * gate tables for weeks. ⚠⚠⚠ THE SAME HOLE OPENED HERE THE MOMENT THE `E595`
 * RESET EMPTIED THE SEED: the account every spec signs in as lost its provider
 * profile, and several assertions in this suite are ABSENCE checks — *"no rate
 * reaches the visitor"* — which a blank page satisfies perfectly.
 * ⚠ So the suite would have gone greener, not redder, on no data at all.
 *
 * ⚠ It asserts the persona as a BUYER sees them: on `/talent`, which only lists
 * providers who pass every clause of `providerMeetsRequired`.
 */
test("⚠⚠⚠ PRECONDITION — the gate persona is a complete, visible provider", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await signIn(page);
  const href = await requireCompleteProvider(page);
  console.log(`E595/WS-B  gate persona OK — ${href}`);
  await page.close();
});

const ROUTES = {
  home: "/connect",
  community: "/community",
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
/*
  ⚠⚠ `Home` IS `Profile` NOW (`P2-J3-E593` WS-A) — a RENAME, not a move: the
  first tab still lands on `/connect`, which is still the member's own profile.
  ⚠ SUPERSEDED (`E164`): this test was named *"renders with Home first"* and
  asserted the first label was `Home`.
*/
/*
  ── ⚠⚠⚠ `Profile` HAS LEFT THE ROW (`P2-A2-E598` WS-B, 2026-09-21) ──────────

  ⚠ SCOTT: *"The Profile tab leaves Connect's row. Connect lands on Community."*
  The profile is an ACCOUNT-MENU destination now, reached from your own picture.
  ⚠⚠ THIS IS `check:rollup`'S CASE, NOT `check:cert-skills`' — THE RULING
  CHANGED, THE CODE DID NOT DRIFT. The assertion below encoded a ruling that has
  since been superseded, so it is rewritten rather than worked around.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   test("E567/2 — the CONNECT tab row renders with Profile first", …)
  //   expect(labels[0]).toBe("Profile");
  //   expect(labels).toEqual(["Profile", "Community", "Groups", "Service Products", "Settings"]);

  ⚠⚠ THE ROW IS NOW READ ON `/community`, NOT ON `ROUTES.home`. `/connect`
  redirects there, so opening `home` still ARRIVES here — but naming the page
  the row actually belongs to is what stops the next route change reading as a
  tab-row failure.
  ⚠⚠⚠ EVERYTHING THE OLD TEST PROTECTED IS KEPT: the row is still found by its
  eyebrow and its tabs by LABEL (never by href prefix — that is how a tab falls
  out of a locator and the test goes green-by-absence); an EMPTY row is still a
  failure, not a pass; and the COUNT is still asserted as a list so an appended
  tab fails here.
*/
test("E567/2 — the CONNECT tab row renders, and Profile is NOT in it", async () => {
  await open(ROUTES.community);
  await expect(page.getByText("CONNECT", { exact: true }).first()).toBeVisible();
  /*
    ── ⚠⚠ ASSERTED BY LABEL, NOT BY HREF PREFIX (`P2-J3-E591` WS-A item 9) ───

    ⚠⚠⚠ THE OLD LOCATOR WAS `a[href^="/community"]` — A PREFIX ON A ROUTE. The
    `E591` split moved `Home` to `/connect`, and the tab would have fallen
    straight out of the locator: the test goes GREEN-BY-ABSENCE rather than
    failing, because `.first()` on an empty set with a `hasText` filter finds
    nothing to be visible about. ⚠ It would have reported a working tab row.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const tabs = page.locator('a[href^="/community"], a[href="/messages"]');
    //   await expect(tabs.filter({ hasText: "Home" }).first()).toBeVisible();

    ⚠⚠ A LOCATOR KEYED TO A ROUTE BREAKS ON EVERY ROUTE CHANGE. This is `E587`'s
    *assert the shape, not the incidental* applied to a spec: the RULE is "the
    CONNECT row renders, and Home is first in it". Neither half of that rule
    mentions a URL, so neither half of the assertion should.
    ⚠ The row is found by its own eyebrow, and the tab by its LABEL.
  */
  const row = page.getByTestId("page-tabs");
  await expect(row).toHaveCount(1);
  const labels = (await row.getByRole("link").allInnerTexts()).map((s) => s.trim());
  /* ⚠⚠ AN EMPTY ROW IS A FAILURE, NOT A PASS — the defect the old prefix
     locator would have produced is precisely a row that measures as fine
     because nothing was found in it. */
  expect(labels.length, "the CONNECT row rendered no tabs").toBeGreaterThan(0);
  /* ⚠⚠ ABSENCE, ASSERTED EXPLICITLY. Without this the list check below could be
     satisfied by a future row that reintroduces Profile somewhere else. */
  expect(labels, "Profile is an account-menu destination and must not be a Connect tab")
    .not.toContain("Profile");
  expect(labels[0]).toBe("Community");
  /*
    ⚠⚠⚠ FOUR TABS, ASSERTED AS A LIST. Scott's ruling was *"less tabs…simple"*,
    so the COUNT is the thing being held — an appended fifth must fail here
    rather than pass because the first one is still right.
    ⚠ SUPERSEDED, quoted not deleted (`E164`): *"FIVE TABS"*, when `Profile` was
    the first of them (`P2-A2-E598` WS-B took it to the account menu).
    ⚠ The gate persona is provider-only (measured, see `_auth.ts`), so it sees
    `Service Products`. ⚠⚠ A BUYER SEES THREE, and that difference is the entire
    reason `lib/connect-tabs.ts` exists.
  */
  expect(labels).toEqual(["Community", "Groups", "Service Products", "Settings"]);
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
  /* ⚠ READ ON `/community`, THE ROW'S OWN PAGE (`P2-A2-E598` WS-B). `home`
     redirects here, so this arrives in the same place either way. */
  await open(ROUTES.community);

  /*
    ⚠ The tabs that remain, in order — the row did not lose anything else.
    ⚠⚠ SIX, NOT FIVE, SINCE `P2-J3-E591` WS-A: `Home` followed the profile to
    `/connect` and a `Community` tab took over `/community`. ⚠ THE ROW DID NOT
    LOSE A TAB — a route that was carrying two pages became two routes.
    ⚠ SUPERSEDED, quoted not deleted (`E164`) — the five as `E560` left them:
    //   const TAB_HREFS = ["/community", "/community/colleagues",
    //     "/community/forums", "/community/mentors", "/community/teams"];
    ⚠⚠ THIS LIST IS DELIBERATELY STILL HREF-BASED, unlike the label assertion in
    `E567/2` above. It is asserting ORDER of DESTINATIONS — which is what the
    hrefs ARE — not the presence of a tab, so a route is the right key here.
  */
  /*
    ⚠⚠ THREE HREFS LEFT THE ROW (`P2-J3-E593` WS-A) AND NOT ONE PAGE DID.
    ⚠ SUPERSEDED (`E164`), described rather than re-listed so this quote cannot
    be mistaken for the live array: the row was `/connect`, `/community`,
    `/community/colleagues`, `/community/forums`, `/community/mentors`,
    `/community/teams`.
    ⚠⚠⚠ COLLEAGUES, MENTORS AND TEAMS ARE SECTIONS OF COMMUNITY NOW. Their
    survival is asserted where it now lives — `check:community`'s `E593/5` block
    checks the Community surface LINKS to all three, in every branch, which is a
    stronger guard than appearing in this row ever was.
  */
  /*
    ⚠⚠⚠ `/connect` LEFT THE ROW (`P2-A2-E598` WS-B) — it was the `Profile` tab's
    destination, and the profile is an account-menu surface now.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const TAB_HREFS = ["/connect", "/community", "/community/forums",
    //     "/my-services", "/settings"];
    ⚠⚠ THE ROUTE ITSELF IS NOT GONE — `/connect` still exists and redirects to
    `/community`. It simply is not a TAB any more, which is what this list is
    about. ⚠ The rule — ORDER of destinations, scoped to the row — is unchanged.
  */
  const TAB_HREFS = [
    "/community",
    "/community/forums",
    "/my-services",
    "/settings",
  ];
  /*
    ── ⚠⚠⚠ SCOPED TO THE TAB ROW, AND `E593` IS WHY ───────────────────────

    ⚠ SUPERSEDED (`E164`): this scanned `document.querySelectorAll("a")` — EVERY
    anchor on the page — and filtered to the known hrefs.
    ⚠⚠ THAT BROKE THE MOMENT A TAB POINTED AT A ROUTE THE BAND ALSO LINKS.
    `E593`'s `Service Products` tab is `/my-services`, and the seller band's
    `Sell` item is the same route — so the band's copy was collected FIRST and
    the order read `/connect · /my-services · /community · …`.
    ⚠⚠⚠ THE TEST WAS NEVER MEASURING THE ROW; it was measuring the page and
    getting away with it because no tab had ever shared an href with the band.
    ⚠ `data-testid="page-tabs"` exists since `E591` WS-A for exactly this class
    of problem — a locator keyed to a route breaks on every route change.
  */
  const order = await page.evaluate((hrefs) => {
    const row = document.querySelector('[data-testid="page-tabs"]');
    const seen: string[] = [];
    for (const a of Array.from(row?.querySelectorAll("a") ?? [])) {
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
  /*
    ⚠⚠ THE DOOR IS A BUTTON AS OF STAGE 2 (`E560`, 2026-09-19), NOT A LINK.
    ⚠ SUPERSEDED, quoted not deleted (`E164`) — Stage 1, when the icon navigated:
    // const clusterLink = page.locator('.pm-band-right a[aria-label="Messages"]');
    // await expect(clusterLink).toHaveCount(1);
    // await expect(clusterLink).toHaveAttribute("href", "/messages");

    ⚠⚠ THE ASSERTION'S INTENT IS UNCHANGED AND IS THE POINT: the tab was removed
    from the CONNECT row, so SOMETHING must still open messages. What changed is
    only the element — a thing that opens an overlay is a button, not a link.
    ⚠ `/messages` the ROUTE still exists and is linked from inside the drawer;
    that is asserted where the drawer is tested (`E560/4`), not here.
  */
  const clusterDoor = page.locator('.pm-band-right button[aria-label="Messages"]');
  await expect(clusterDoor).toHaveCount(1);

  /* ⚠ NO DIGIT ON IT, EVER — `Message` holds zero rows so no dot ships yet, and
     when one does it is a DOT, never a number (Scott, 2026-09-18). */
  await expect(clusterDoor).not.toHaveText(/\d/);
});

/*
  ── ⚠⚠⚠ 2b · THE BAND NEVER NAMES THE WRONG CONSOLE (`P2-ALL-E560`) ─────────

  ⚠⚠ THIS GUARDS A CLASS, NOT A STRING. The class is: A CLIENT COMPONENT WHOSE
  FALLBACK SWALLOWS "NOT LOADED YET" INTO A REAL-LOOKING VALUE. `AppBand` reads
  `useMe()`, which is null on first paint; `railPersona()` correctly returns
  `null` there, and the label ternary's FINAL ELSE turned that null into
  `"Buyer Console"` — so a PROVIDER was told they were a buyer on every
  logged-in page load. ⚠ The same shape would produce a wrong plan name, a wrong
  company, a wrong role badge, or a `0` where no number is known.
  ⚠⚠ THE RULE IT ENCODES IS THE HOUSE'S OWN, from `casing_spec_LOCKED.md` on the
  notification bell — *"a '0' or fake number is worse than none"*. A WRONG
  CONSOLE NAME IS WORSE THAN NO CONSOLE NAME. ⚠ An unresolved value renders
  NOTHING; it never borrows a real one.

  ⚠⚠⚠ IT ASSERTS THE TRANSIENT, NOT THE END STATE, AND THAT IS THE WHOLE POINT:
  A SINGLE POST-LOAD READ NEVER SEES THIS. By the time the menu has populated the
  label is already correct, so the bug is invisible to every other assertion in
  this suite. ⚠ This samples from FIRST PAINT (`waitUntil: "commit"`) until the
  menu populates, and fails if the wrong word was EVER on screen.

  ⚠ NEGATIVE-TESTED 2026-09-18: with the old ternary reinstated this sampler
  observed `["Buyer Console", "Provider Console"]` and FAILED; with the fix it
  observes `["", "Provider Console"]`. Reverted.
  ⚠ `test3@panameer.com` is PROVIDER-ONLY (`_auth.ts`), so `Buyer Console` is
  unambiguously wrong for this viewer — that is what makes the assertion sound.
*/
test("E560/3 — a provider is NEVER shown the wrong console, even for one frame", async () => {
  const seen = new Set<string>();
  await page.goto(ROUTES.home, { waitUntil: "commit" });

  /* ⚠ BOUNDED SAMPLING — 120 × 25ms ceiling so a hang fails the test rather
     than spinning. The loop exits as soon as the menu has populated. */
  for (let i = 0; i < 120; i++) {
    const label = await page
      .locator(".pm-band-brand span")
      .textContent()
      .catch(() => null);
    if (label !== null) seen.add(label.trim());
    const ready = await page
      .evaluate(() => document.querySelectorAll(".pm-band-item").length >= 5)
      .catch(() => false);
    if (ready) break;
    await page.waitForTimeout(25);
  }
  const settled = await page.locator(".pm-band-brand span").textContent();
  if (settled) seen.add(settled.trim());

  const observed = [...seen];
  expect(
    observed,
    `the band showed a console name this viewer is not in. Observed across the load: ${observed.join(" | ")}`
  ).not.toContain("Buyer Console");
  /* ⚠ AND IT MUST STILL ARRIVE AT THE RIGHT ONE — otherwise "render nothing"
     would pass by rendering nothing forever. */
  expect(observed, `observed: ${observed.join(" | ")}`).toContain("Provider Console");
});

/*
  ── ⚠⚠⚠ 2c · THE MESSAGES DRAWER (`P2-ALL-E560` STAGE 2) ───────────────────

  ⚠⚠ AN OVERLAY IS AN INTERACTION SURFACE, AND THE FAILURE THAT MATTERS IS ONE
  THAT WILL NOT CLOSE. A drawer that opens is obvious in a screenshot; a drawer
  that strands a keyboard user is invisible in one — which is why this is in the
  suite that caught the console flash rather than in a static check.

  ⚠ THREE THINGS, THE MINIMUM THE BRIEF NAMES: the icon OPENS it, Escape CLOSES
  it, and focus RETURNS TO THE ICON. ⚠⚠ THE THIRD IS THE ONE THAT IS EASY TO
  SKIP AND THE ONE THAT STRANDS SOMEBODY — focus dropped to `<body>` means the
  next Tab starts from the top of the document, not from where they were.

  ⚠ THE ICON IS A BUTTON, NOT A LINK (`E560` Stage 2): a thing that opens an
  overlay must not claim to navigate. Asserted by role, so turning it back into
  an `<a>` fails here rather than silently regressing the semantics.
*/
test("E560/4 — the Messages drawer opens, closes on Escape, and returns focus", async () => {
  await open(ROUTES.home);
  /*
    ⚠⚠ THE LANDING PATH IS CAPTURED, NOT NAMED (`P2-A2-E598` WS-B). `ROUTES.home`
    is `/connect`, which now REDIRECTS to `/community`, so asserting the URL
    equals `ROUTES.home` failed on a redirect the drawer had nothing to do with.
    ⚠⚠⚠ THE RULE IS *"the drawer overlays, it does not route"* — a statement
    about CHANGE, not about a particular URL. Comparing the page to ITSELF is
    what that rule actually says, and it survives the next route change too.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   expect(new URL(page.url()).pathname).toBe(ROUTES.home);
  */
  const landedPath = new URL(page.url()).pathname;

  const icon = page.locator('.pm-band-right button[aria-label="Messages"]');
  await expect(icon, "the cluster icon must be a BUTTON — it opens an overlay, it does not navigate").toHaveCount(1);
  await expect(icon).toHaveAttribute("aria-haspopup", "dialog");

  /* ⚠ CLOSED TO BEGIN WITH — otherwise "it opens" could pass on a drawer that
     was never shut. */
  await expect(page.locator(".pm-drawer-panel")).toHaveCount(0);
  await expect(icon).toHaveAttribute("aria-expanded", "false");

  await icon.click();
  const panel = page.locator(".pm-drawer-panel");
  await expect(panel).toBeVisible();
  await expect(icon).toHaveAttribute("aria-expanded", "true");
  /* ⚠ AND THE PAGE IS STILL THE PAGE — the drawer overlays, it does not route. */
  expect(new URL(page.url()).pathname).toBe(landedPath);

  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(icon).toHaveAttribute("aria-expanded", "false");

  /* ⚠⚠ FOCUS IS BACK ON THE ICON, NOT ON `<body>`. */
  const landed = await page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    return { tag: a?.tagName ?? null, label: a?.getAttribute("aria-label") ?? null };
  });
  expect(
    landed,
    `focus went to ${landed.tag}/${landed.label} instead of back to the Messages icon`
  ).toEqual({ tag: "BUTTON", label: "Messages" });
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
  /* ⚠ `exact` — "Your Groups" also matches "Recent in Your Groups" on this
     page, and a strict-mode violation reports as a failure of the thing being
     tested rather than of the selector.
     ⚠ `P2-A3-E612` Q17 — the noun moved; the assertion is unchanged.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   page.getByRole("heading", { name: "Your Forums", exact: true }) */
  await expect(
    page.getByRole("heading", { name: "Your Groups", exact: true })
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
  /* ⚠⚠ `Waiting on You` IS A `ConnectHome` HEADING, AND `ConnectHome` IS NOW
     `/community` (`P2-J3-E591` WS-A). ⚠ The string did not change and the rule
     did not change — the PAGE it renders on did, because `E591` split the
     profile off `/community`. ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   { route: ROUTES.home, strings: ["Waiting on You"] },
     ⚠⚠ THE GATE CAUGHT THIS MOVE BY FAILING, which is the gate working: an
     assertion that had followed `home` blindly would have gone looking for
     Connect Home's copy on the profile and found none. */
  /*
    ⚠⚠⚠ `Waiting on You` LEFT THIS LIST, AND THE RULE DID NOT MOVE WITH IT —
    IT CHANGED TOOL.

    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   { route: ROUTES.community, strings: ["Waiting on You"] },

    ⚠⚠ `E591` WS-C's block RENDERS NOTHING WHEN NOTHING IS PENDING — a debt
    block with no debt is an empty container, which is the shape this suite
    exists to prevent. `ConnectHome`'s version always drew its heading plus an
    empty-state line; at the top of the new page that is a sentence saying
    nothing, above the hero, for almost every member almost always.
    ⚠⚠⚠ SO THE BROWSER CANNOT SEE THE STRING ON A CLEAN ACCOUNT, and asserting
    it here would only pass if somebody seeded a pending request — which is
    `E564`, and is seeding to make a gate green.
    ⚠ THE CASING IS ASSERTED IN `check:community-page` INSTEAD, against the
    SOURCE, where it is visible whatever the data says. The rule is unweakened;
    it is checked by the tool that can actually see it.
  */
  { route: ROUTES.colleagues, strings: ["Invite a Colleague", "Shared Skills"] },
  /* ⚠⚠ `P2-A3-E612` Q17 — `Forums` -> `Groups`. Scott, 2026-09-23: *"the page
     heading becomes Groups. The nav is right; the heading is the older word."*
     ⚠ The Title Case RULE this row asserts is unchanged — only the noun moved.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   { route: ROUTES.forums, strings: ["Recent in Your Forums", "Your Forums"] }, */
  { route: ROUTES.forums, strings: ["Recent in Your Groups", "Your Groups"] },
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
    /* ⚠ MOVED WITH `ConnectHome` TO `/community` (`E591` WS-A), same reason as
       the `TITLE_CASE` entry above. ⚠ SUPERSEDED, quoted not deleted (`E164`):
       //   { route: ROUTES.home, strings: ["Waiting on you", "People you may know"] }, */
    { route: ROUTES.community, strings: ["Waiting on you", "People you may know"] },
    { route: ROUTES.colleagues, strings: ["Shared skills"] },
    /* ⚠ `P2-A3-E612` — the lower-case original moved with the noun.
       ⚠ SUPERSEDED, quoted not deleted (`E164`):
       //   { route: ROUTES.forums, strings: ["In paths you teach", "Recent in your forums"] }, */
    { route: ROUTES.forums, strings: ["In paths you teach", "Recent in your groups"] },
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
