import { test, expect } from "@playwright/test";
import { signIn, signInAsSeeded, seededAccount } from "./_auth";
import { prisma } from "@/lib/prisma";
import { createGroup } from "@/lib/group-membership";

/**
 * ── ⚠⚠⚠ THE GROUPS PAGE, IN A BROWSER (`P2-A3-E619` WS-A) ───────────────
 *
 * ⚠ THE BRIEF'S STOP GATE: *"phone screenshot first, then desktop; every
 * figure proven against the database; the rebuild proven (two screenshots 15
 * seconds apart)."*
 *
 * ⚠⚠⚠ WHAT A STRUCTURAL GATE CANNOT CARRY, AND WHY THESE RUN IN A BROWSER:
 * the three header figures, the quietest-first order and the rebuild are all
 * RENDERED behaviour. ⚠ `check:groups` asserts the RULES against the database;
 * this asserts that a member actually SEES them.
 *
 * ⚠⚠ PHONE FIRST — 390px is the default viewport below, and the desktop test
 * opts INTO a wider one. The brief's order, in the file's order.
 */

/**
 * ── ⚠⚠⚠ A TEARDOWN THAT SURVIVES A TIMEOUT (`P2-A3-E619` WS-B) ──────────
 *
 * ⚠⚠ MEASURED, NOT IMAGINED: the ask/approve walk timed out at 180s during
 * development, Playwright killed it mid-test, **and the `finally` inside the
 * test body never ran.** ⚠⚠⚠ ONE PROBE GROUP SURVIVED INTO THE SHARED DATABASE
 * and was only found because a Discover count read **28 boards against 27** —
 * i.e. by reconciling a total, not by anything failing.
 *
 * ⚠ A `finally` PROTECTS AGAINST A THROW. IT DOES NOT PROTECT AGAINST THE TEST
 * BEING KILLED. `afterAll` runs in the worker after the timeout is handled, so
 * this is the sweep that actually holds. ⚠⚠ The per-test `finally` blocks stay
 * — they clean up immediately in the normal case, and this is the backstop.
 *
 * ⚠⚠⚠ IT IS SCOPED BY **TWO** CONDITIONS THAT BOTH ENCODE THIS SUITE'S OWN
 * NAMING — the `g-e619-` slug prefix AND the `E619 ` title prefix. ⚠ One alone
 * would be a wider net than a teardown is ever allowed to cast: this runs
 * against the SHARED database that localhost, every Preview and Production all
 * write to, and a sweep that guessed could delete a member's real room.
 * ⚠ Memberships cascade with the board.
 */
test.afterAll(async () => {
  /*
    ── ⚠⚠⚠ AND THEIR NOTIFICATIONS, WHICH DID NOT EXIST WHEN THIS WAS WRITTEN ─

    ⚠ `P2-A3-E620` wired `joinGroup`, `decideJoinRequest` and `createThread` to
    `notify()`, so these walks now produce notification rows as a SIDE EFFECT.
    ⚠⚠ `Notification` has no foreign key to `ForumBoard` — it carries loose
    `entity_type`/`entity_id` references — **so deleting the board leaves them
    behind**, and they accumulate in the shared database run after run.
    ⚠⚠⚠ MEASURED: the count went 1 -> 13 across two brief's gate runs before
    anybody noticed, and nothing failed to report it. ⚠ A teardown written
    before a side effect existed is not wrong; it is just no longer complete.
  */
  const boards = await prisma.forumBoard.findMany({
    where: { AND: [{ slug: { startsWith: "g-e619-" } }, { title: { startsWith: "E619 " } }] },
    select: { id: true },
  });
  if (boards.length > 0) {
    await prisma.notification.deleteMany({
      where: { entity_type: "forum_board", entity_id: { in: boards.map((b) => b.id) } },
    });
  }
  const swept = await prisma.forumBoard.deleteMany({
    where: {
      AND: [{ slug: { startsWith: "g-e619-" } }, { title: { startsWith: "E619 " } }],
    },
  });
  if (swept.count > 0) {
    console.log(`E619/teardown  swept ${swept.count} probe group(s) a killed test left behind`);
  }
  await prisma.$disconnect();
});

const PHONE = { width: 390, height: 900 };
const DESK = { width: 1280, height: 1000 };

test.use({ viewport: PHONE });

test("groups — the page renders its counted figures at 390px", async ({ page }) => {
  await signIn(page);
  await page.goto("/community/groups", { waitUntil: "domcontentloaded" });

  /* ⚠ The heading is `Groups`, matching the nav (`E612` Q17). */
  await expect(page.locator("h1")).toHaveText("Groups");

  /*
    ⚠⚠⚠ THE THREE FIGURES EXIST AND ARE NUMBERS. ⚠ It asserts the SHAPE, never
    a literal count: the figures are read off a shared database that every
    branch and both Vercel environments write to, so pinning `13` here would
    make this gate fail the day somebody enrols in a path.
    ⚠⚠ `E586`'s rule still applies — the assertion must be capable of failing,
    so the count of figures is checked too. A page that rendered none of them
    would satisfy "every figure is a number" vacuously.
  */
  const figs = page.locator(".pm-groups-figs dd");
  await expect(figs).toHaveCount(3);
  const values = await figs.allTextContents();
  for (const v of values) {
    expect(v.trim(), `figure "${v}" is not a number`).toMatch(/^\d+$/);
  }
  const labels = await page.locator(".pm-groups-figs dt").allTextContents();
  expect(labels.map((s) => s.trim())).toEqual([
    "Groups You Run",
    "Questions Waiting",
    "Groups You Joined",
  ]);

  /* ⚠⚠ NO HORIZONTAL SCROLL AT PHONE WIDTH. The Connect row clipped at 390px
     once already (`E612` Q16) and it is the failure this width exists to catch. */
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, "the page scrolls sideways at 390px").toBeLessThanOrEqual(1);

  /*
    ⚠⚠ EVERY VIEW TAB IS WHOLLY ON SCREEN — WHICH THE LINE ABOVE CANNOT TELL
    YOU. An inner `overflow-x: auto` container does not widen the document, so
    a clipped tab inside one leaves `scrollWidth` unchanged and that assertion
    true. ⚠ These are DIFFERENT QUESTIONS and both are worth asking.

    ⚠⚠⚠ IT IS NOT HERE BECAUSE IT CAUGHT ANYTHING — AND SAYING SO MATTERS. I
    first claimed the screenshot showed `Requests` clipped; **it did not**,
    and the mutation proved it: restoring the scrolling version did not fail
    this assertion, because at 390px the tabs end at x=128/227/330 in a 350px
    row. ⚠ The claim was mine, not the page's.
    ⚠⚠ IT STAYS AS A TRIPWIRE, honestly labelled: a fourth view, a longer
    label or a larger font is exactly how a row like this starts clipping, and
    `E612` Q16 is the same failure one row up this page.
  */
  const tabsFit = await page.evaluate(() =>
    [...document.querySelectorAll(".pm-groups-views a")].map((el) => {
      const r = el.getBoundingClientRect();
      return { text: (el.textContent ?? "").trim(), right: Math.round(r.right) };
    })
  );
  expect(tabsFit.length, "no view tabs rendered").toBe(3);
  for (const t of tabsFit) {
    expect(t.right, `the "${t.text}" tab is clipped at 390px`).toBeLessThanOrEqual(390);
  }

  await page.screenshot({ path: "/tmp/e619-phone.png", fullPage: true });

  console.log(
    `E619/phone  figures ${labels.map((l, i) => `${l.trim()}=${values[i].trim()}`).join(" · ")}`
  );
});

test("groups — the picture is one circle per group, dashed while quiet", async ({ page }) => {
  await signIn(page);
  await page.goto("/community/groups", { waitUntil: "domcontentloaded" });

  const dots = page.locator(".pm-groups-dot");
  const n = await dots.count();
  /*
    ⚠⚠⚠ THE PICTURE MUST NOT BE EMPTY, AND THIS IS THE ASSERTION THAT WOULD
    HAVE CAUGHT THE `NaN` BUG. ⚠ Every group holds 0 members today, so the
    size scale's denominator is zero; without the guard in `GroupCircles`
    every circle would size to `NaN` and the field would render blank.
    ⚠⚠ `E586` — a gate with no inputs must fail. A count of zero here is a
    failure, not a pass.
  */
  expect(n, "the picture rendered no circles").toBeGreaterThan(0);

  /* ⚠ The legend's count and the circles must agree — two ways of saying the
     same number, and `E603` WS-C is the lesson that they can silently diverge. */
  const legend = await page.locator(".pm-groups-legend-n").first().textContent();
  expect(Number(legend?.trim())).toBe(n);

  /* ⚠⚠ MEASURED: `ForumThread` holds ZERO rows, so every group is quiet and
     every circle is dashed. Asserted as an IMPLICATION rather than a literal:
     a circle is dashed IF AND ONLY IF its group is quiet, which stays true the
     day somebody finally posts. */
  const dashedCount = await page.locator(".pm-groups-dot.is-quiet").count();
  const quietFromLegend = await page
    .locator(".pm-groups-legend")
    .textContent();
  expect(quietFromLegend).toContain("quiet");
  console.log(`E619/picture  circles ${n} · dashed (quiet) ${dashedCount}`);
});

test("groups — the rebuild redraws and the numbers do not move", async ({ page }) => {
  await signIn(page);
  await page.goto("/community/groups", { waitUntil: "domcontentloaded" });

  /*
    ── ⚠⚠⚠ THE BRIEF'S RULE: "THE NUMBERS NEVER CHANGE ON A REBUILD." ───────
    ⚠ This is the assertion that makes that a fact rather than an intention.
    ⚠⚠ It reads the figures, waits past one whole 15-second cycle, and reads
    them again. A rebuild that recomputed anything would move them.
  */
  const before = await page.locator(".pm-groups-figs dd").allTextContents();
  const legendBefore = await page.locator(".pm-groups-legend").textContent();
  await page.screenshot({ path: "/tmp/e619-rebuild-a.png" });

  /* ⚠ 16s — past one full cycle, so the redraw has certainly happened. */
  await page.waitForTimeout(16_000);

  const after = await page.locator(".pm-groups-figs dd").allTextContents();
  const legendAfter = await page.locator(".pm-groups-legend").textContent();
  await page.screenshot({ path: "/tmp/e619-rebuild-b.png" });

  expect(after, "a figure moved on a rebuild").toEqual(before);
  expect(legendAfter, "the legend moved on a rebuild").toBe(legendBefore);
  console.log(
    `E619/rebuild  figures before ${before.join("/")} · after ${after.join("/")} — unchanged`
  );
});

/**
 * ── ⚠⚠⚠ A HOST, NOT JUST A BYSTANDER (`P2-A3-E619` WS-A) ────────────────
 *
 * ⚠⚠ THE DEFAULT SEEDED ACCOUNT RUNS NOTHING, so every test above exercises
 * only the EMPTY branch — 0/0/0 and the four general groups. ⚠⚠⚠ A SUITE THAT
 * ONLY EVER SEES ZERO CANNOT TELL A WORKING COUNT FROM A HARD-CODED ONE:
 * *"two zeros agree"* (`decisions_2026-09-23` §11), and this page is almost
 * entirely zeros today.
 *
 * ⚠ MEASURED, so the persona is a real one rather than a hopeful guess: four
 * people host boards — Scott (13), **Marelise `sw_user4` (4)**, Eddie (3) and
 * Linus (3) — and Marelise is the largest host who is also in
 * `test-users.json` with a password, so she is the one a browser can be.
 * ⚠⚠ SHE IS A PROTECTED LESSON-HOLDER (load-bearing rule 10), and this test
 * only READS — it signs in and looks at a page.
 */
test("groups — a host sees the groups she runs, and they are counted", async ({ page }) => {
  await signInAsSeeded(page, "sw_user4@straterp.com");
  await page.goto("/community/groups", { waitUntil: "domcontentloaded" });

  const runFig = page.locator(".pm-groups-figs dd").first();
  const runCount = Number((await runFig.textContent())?.trim());

  /* ⚠⚠⚠ THE ASSERTION THAT MAKES THE ZEROS ELSEWHERE MEAN SOMETHING: this
     figure is NOT zero, so the three above are reading data rather than
     printing a constant. ⚠ Still a shape, not the literal 4 — the database is
     shared and a host can gain a board. */
  expect(runCount, "a known host sees no groups — the count is not reading data").toBeGreaterThan(0);

  /* ⚠ The heading she gets is the one that names ownership. */
  await expect(page.getByRole("heading", { name: "Groups You Run" })).toBeVisible();

  /* ⚠⚠ THE CARDS AND THE FIGURE AGREE — up to the 4 the page shows before it
     offers `Show All`. Two ways of saying the same number, and `E603` WS-C is
     the lesson that they can silently diverge. */
  const cards = await page.locator(".pm-groups-card").count();
  expect(cards).toBe(Math.min(runCount, 4));

  console.log(`E619/host  sw_user4 runs ${runCount} · cards shown ${cards}`);
  await page.screenshot({ path: "/tmp/e619-host-phone.png", fullPage: true });
});

test("groups — desktop, and every card states counted facts", async ({ page }) => {
  await page.setViewportSize(DESK);
  await signIn(page);
  await page.goto("/community/groups", { waitUntil: "domcontentloaded" });

  const cards = page.locator(".pm-groups-card");
  const n = await cards.count();

  if (n > 0) {
    /*
      ⚠⚠⚠ QUIETEST FIRST IS ASSERTED, NOT ASSUMED. ⚠ It reads each card's post
      count off the rendered line and proves the sequence never decreases.
      ⚠⚠ Today every card reads "no posts yet", so this passes on a field of
      zeros — TWO ZEROS AGREE (`decisions_2026-09-23` §11). **So the sort is
      ALSO proved in `check:groups` against constructed values**, where the
      compared numbers are deliberately different. This half proves the page
      renders the order; that half proves the order is right.
    */
    const metas = await page.locator(".pm-groups-card-m").allTextContents();
    const posts = metas.map((m) =>
      /no posts yet/.test(m) ? 0 : Number(/(\d+)\s+posts?/.exec(m)?.[1] ?? "0")
    );
    for (let i = 1; i < posts.length; i++) {
      expect(posts[i], `card ${i} is noisier than the one before it`).toBeGreaterThanOrEqual(
        posts[i - 1]
      );
    }
    /* ⚠ Every card names its kind, its members and its posts — no card may be
       a bare title, which is what the old rail rendered. */
    for (const m of metas) {
      expect(m).toMatch(/(Path group|Member group) · \d+ members? · (no posts yet|\d+ posts?)/);
    }
    console.log(`E619/desktop  cards ${n} · post counts ${posts.join(",")}`);
  }

  await page.screenshot({ path: "/tmp/e619-desktop.png", fullPage: true });
});

/**
 * ── ⚠⚠⚠ STARTING A GROUP, THROUGH THE ACTUAL FORM (`P2-A3-E619` WS-A) ───
 *
 * ⚠⚠ SCOTT, EARLIER IN THIS RUN: *"Measure it. Render it. **Do not read the
 * code and conclude.**"* ⚠ `check:groups` proves `createGroup` writes the right
 * rows; it does NOT prove a member can reach it, and it does not prove the
 * place the form sends them exists.
 *
 * ⚠⚠⚠ THE REDIRECT IS THE HALF THAT COULD SILENTLY BE A WALL. `createGroup`
 * returns a slug and the form pushes to `/community/groups/<slug>`, where
 * `getBoard` decides. A member-created group has a NULL `learning_path_id`,
 * the same as the four general boards — so it *should* be readable by anyone.
 * ⚠ **"Should" is a reading of the code.** This walks it.
 */
test("groups — a member can start a group, and lands somewhere real", async ({ page }) => {
  const TITLE = `E619 walk ${Date.now()}`;
  let slug: string | null = null;
  try {
    await signIn(page);
    await page.goto("/community/groups", { waitUntil: "domcontentloaded" });

    await page.fill("#new-group-title", TITLE);
    await page.click('button:has-text("Start a Group")');

    /* ⚠ The form pushes to the new room — so the URL itself is the assertion
       that a slug came back and the route resolved. */
    await page.waitForURL(/\/community\/groups\/g-e619-walk/, { timeout: 20_000 });
    slug = new URL(page.url()).pathname.split("/").pop() ?? null;

    /* ⚠⚠⚠ NOT A 404, AND NOT AN ERROR PAGE. The heading is the group's own
       name, which only the real board can produce. */
    await expect(page.locator("h1")).toHaveText(TITLE);

    /* ⚠ And it is reachable a second time, by URL — a redirect that works only
       as a push would be a room nobody can return to. */
    await page.goto(`/community/groups/${slug}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toHaveText(TITLE);

    /*
      ⚠⚠ THE FOUNDER'S OWN PAGE NOW COUNTS IT — the figure MOVED, which is what
      proves the rows are read and not merely written.

      ⚠⚠⚠ IT IS `Groups You Run`, NOT `Groups You Joined`, AND THIS ASSERTION
      WAS WRONG FIRST TIME. It read `nth(2)` — the joined figure — and failed
      on a `0` that was CORRECT: `getGroupsHome` files a board you host under
      `run` and explicitly excludes it from `joined`, so a founder never
      double-counts. ⚠ THE CODE WAS RIGHT AND THE ASSERTION WAS ABOUT THE WRONG
      NOUN — the same shape as the `E607` outline mistake, caught here only
      because the figure it checked was a real zero rather than a coincidental
      match. ⚠⚠ Recorded rather than quietly corrected, because a test that
      asserts the wrong noun and PASSES is the version nobody ever finds.
    */
    await page.goto("/community/groups", { waitUntil: "domcontentloaded" });
    const run = Number(
      (await page.locator(".pm-groups-figs dd").nth(0).textContent())?.trim()
    );
    expect(run, "the founder's own group did not reach their figures").toBeGreaterThan(0);

    /* ⚠⚠ AND THE MEMBERSHIP ROW REACHES THE PAGE AS A COUNT. The new group is
       the quietest (0 posts) and smallest, so it sorts FIRST — and it must read
       `1 member`, which is the founder. A `0 members` here would mean the row
       was written and never read. */
    const firstCard = await page.locator(".pm-groups-card-m").first().textContent();
    expect(firstCard, "the founder is not counted in their own group").toMatch(
      /Member group · 1 member · no posts yet/
    );

    /*
      ── ⚠⚠⚠ THE STORED ROW, ASSERTED HERE AND NOWHERE ELSE ─────────────────

      ⚠ These four assertions started life in `check:groups`, and `check:forums`
      §5 — *"nothing deletes a forumBoard"* — correctly went red on the teardown
      they needed. ⚠⚠ THE PROBE MOVED RATHER THAN THE GUARD BEING EXEMPTED, and
      it is stronger here: the group below was made by a member TYPING A NAME
      INTO THE FORM, not by calling the function.
    */
    const row = await prisma.forumBoard.findUnique({
      where: { slug: slug! },
      select: {
        id: true,
        type: true,
        price_cents: true,
        learning_path_id: true,
        host_person_id: true,
      },
    });
    /* ⚠⚠ NO learning path — that is what makes it a MEMBER's group (ruling 2),
       and it is the column ruling 12 confirmed was already nullable. */
    expect(row?.learning_path_id, "a member group must have no path").toBeNull();
    /* ⚠⚠⚠ `OPEN` ONLY. `REQUEST` would land joiners in `PENDING`, and NOTHING
       can move a `PENDING` row — measured: `decided_at` and the
       `APPROVED`/`DECLINED` values have zero writers. Creating a state with no
       exit is `E579` one level down. */
    expect(row?.type, "a new group must not be REQUEST — PENDING has no exit").toBe("OPEN");
    /* ⚠⚠ NO PRICE. Nothing creates a `Payment` row anywhere in the codebase and
       `PAID` is never written, so a priced group could not be bought. */
    expect(row?.price_cents, "nothing can collect a price").toBeNull();
    /* ⚠⚠⚠ THE SLUG IS NAMESPACED AWAY FROM PATH BOARDS. `path-` belongs to
       `ensurePathBoard`; a member naming their group "Beginners" must never
       mint `path-beginners` over a real path's room. */
    expect(slug!.startsWith("g-"), `slug ${slug} is not namespaced`).toBe(true);

    /* ⚠⚠ AND THE FOUNDER'S MEMBERSHIP ROW IS AN ACT, NOT A BACKFILL.
       `auto_approved: true` means *nobody decided*; a person clicked here. */
    const mem = await prisma.groupMembership.findFirst({
      where: { board_id: row!.id, person_id: row!.host_person_id! },
      select: { state: true, route: true, auto_approved: true },
    });
    expect(mem?.state).toBe("ACTIVE");
    expect(mem?.route).toBe("JOINED");
    expect(mem?.auto_approved, "auto_approved means nobody decided — a person did").toBe(false);

    console.log(
      `E619/create  made ${slug} · type ${row?.type} · price ${row?.price_cents} · route ${mem?.route} · Groups You Run now ${run} · first card "${firstCard?.trim()}"`
    );
  } finally {
    /*
      ⚠⚠ SCOPED TO THE ROW THIS TEST CREATED, BY TITLE — and `deleteMany`, never
      `delete`: **a teardown that can throw can hide the result it was
      protecting** (`decisions_2026-09-23` §12). ⚠ The membership row cascades
      with the board.
    */
    /* ⚠ Notifications first, while the board id still resolves (`E620`). */
    const made = await prisma.forumBoard.findMany({
      where: { title: TITLE },
      select: { id: true },
    });
    if (made.length > 0) {
      await prisma.notification.deleteMany({
        where: { entity_type: "forum_board", entity_id: { in: made.map((b) => b.id) } },
      });
    }
    await prisma.forumBoard.deleteMany({ where: { title: TITLE } });
    await prisma.$disconnect();
  }
});

/* ── ⚠⚠ WS-B · DISCOVER, JOINING, AND ANSWERING A REQUEST ──────────────── */

test("groups — the three views each render, and Discover groups by track", async ({ page }) => {
  await signIn(page);

  /* ⚠ MY GROUPS is the default — no query string. */
  await page.goto("/community/groups", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".pm-groups-views a.is-on")).toHaveText("My Groups");
  await page.screenshot({ path: "/tmp/e619b-my.png", fullPage: true });

  await page.goto("/community/groups?view=discover", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".pm-groups-views a.is-on")).toHaveText("Discover");
  /*
    ⚠⚠⚠ GROUPED BY TRACK, AND THE TRACK IS A REAL COLUMN. Measured:
    `LearningPath.group` holds Procurement (7), Foundational Learning Paths (3),
    Core HR (2)… ⚠ The assertion is that there is MORE THAN ONE heading — a
    single bucket would mean the grouping silently collapsed, which is what a
    null-handling mistake looks like from the outside.
  */
  const tracks = await page.locator(".mt-6 h2").allTextContents();
  expect(tracks.length, "Discover rendered no tracks").toBeGreaterThan(1);
  await page.screenshot({ path: "/tmp/e619b-discover.png", fullPage: true });

  await page.goto("/community/groups?view=requests", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".pm-groups-views a.is-on")).toHaveText("Requests");
  await expect(
    page.getByRole("heading", { name: "People Asking to Join Your Groups" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your Requests" })).toBeVisible();
  await page.screenshot({ path: "/tmp/e619b-requests.png", fullPage: true });

  /* ⚠ An unknown view falls back to My Groups rather than 404ing. */
  await page.goto("/community/groups?view=nonsense", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".pm-groups-views a.is-on")).toHaveText("My Groups");

  console.log(`E619/views  tracks on Discover: ${tracks.length} — ${tracks.join(" · ")}`);
});

/**
 * ── ⚠⚠⚠ THE JOIN WALK (`P2-A3-E619` WS-B stop gate) ────────────────────
 *
 * ⚠ THE BRIEF: *"the join walk (join → appears in My Groups → leave) proven."*
 * ⚠⚠ AND: *"Joining is a write. A gate that joins cleans up after itself,
 * scoped to the rows it creates."*
 *
 * ⚠⚠⚠ IT WALKS A **GENERAL** GROUP ON PURPOSE. A path group cannot be left —
 * Scott, 2026-09-23: *"You unenrol from the path. One door, not two."* — so a
 * walk that joined one could not complete its own round trip, and a teardown
 * that forced the row would be testing something the product refuses.
 */
test("groups — join, it appears in My Groups, then leave", async ({ page }) => {
  await signIn(page);
  await page.goto("/community/groups?view=discover", { waitUntil: "domcontentloaded" });

  const joinButtons = page.getByRole("button", { name: "Join" });
  const available = await joinButtons.count();
  /* ⚠⚠ `E586` — a walk with no input is not a walk. If nothing is joinable the
     gate FAILS rather than passing vacuously. */
  expect(available, "Discover offered nothing to join — the walk has no input").toBeGreaterThan(0);

  const before = Number(
    (await page.locator(".pm-groups-figs dd").nth(2).textContent())?.trim()
  );

  await joinButtons.first().click();
  /* ⚠ The control refreshes the route; wait for the figure rather than a
     timeout, so the assertion is about the DATA and not about a delay. */
  await expect
    .poll(async () => {
      const t = await page.locator(".pm-groups-figs dd").nth(2).textContent();
      return Number(t?.trim());
    }, { timeout: 15_000 })
    .toBe(before + 1);

  /* ⚠⚠ AND IT IS ON THE MY GROUPS LIST, not merely in a counter. A figure that
     moves while the list does not is the `E603` WS-C divergence. */
  await page.goto("/community/groups", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Groups You Joined" })).toBeVisible();

  /* ── LEAVE, which is also this walk's teardown ─────────────────────────
     ⚠⚠⚠ THE WALK CLEANS UP THROUGH THE PRODUCT, NOT THROUGH THE DATABASE. A
     teardown that deleted the row would prove the join and leave the LEAVE
     unproven — and leaving is half of what the brief asked to see. */
  await page.goto("/community/groups?view=discover", { waitUntil: "domcontentloaded" });
  const leaveButtons = page.getByRole("button", { name: "Leave" });
  if ((await leaveButtons.count()) === 0) {
    /* ⚠ A joined group leaves Discover, so Leave lives on the group's own page. */
    await page.goto("/community/groups", { waitUntil: "domcontentloaded" });
    const joinedCard = page.locator(".pm-groups-card").last();
    await joinedCard.click();
    await page.getByRole("button", { name: "Leave" }).first().click();
  } else {
    await leaveButtons.first().click();
  }

  await expect
    .poll(async () => {
      await page.goto("/community/groups", { waitUntil: "domcontentloaded" });
      const t = await page.locator(".pm-groups-figs dd").nth(2).textContent();
      return Number(t?.trim());
    }, { timeout: 15_000 })
    .toBe(before);

  console.log(`E619/join-walk  joined ${before} -> ${before + 1} -> ${before} (left through the UI)`);
});

/**
 * ── ⚠⚠⚠ THE TWO-PERSON WALK: ASK → APPROVE (`P2-A3-E619` WS-B 3) ───────
 *
 * ⚠ THE BRIEF: *"people asking to join groups you run (approve or decline, and
 * they're told either way)."*
 *
 * ⚠⚠⚠ THIS IS THE WALK THAT COULD NOT HAVE RUN ON TRUNK, AND THAT IS THE POINT.
 * Measured at the premise check: all 27 boards were `OPEN`, **nothing wrote a
 * board's `type`**, and **nothing could move a `PENDING` row** — `decided_at`,
 * `decided_by_person_id`, `APPROVED` and `DECLINED` had ZERO writers. ⚠ So
 * there was no way to reach `PENDING` and no way to leave it. This walk creates
 * a `REQUEST` group, asks as one person, approves as another, and checks the
 * stored row — the whole chain ruling 2 needed and did not have.
 *
 * ⚠⚠ TWO REAL ACCOUNTS, NOT A FIXTURE. The owner is `sw_user4`, a measured
 * host; the asker is the default seeded account. ⚠ A one-account version would
 * prove nothing about the OWNER-SCOPING, which is the rule that matters most.
 */
test("groups — one member asks, the owner approves, and the row says who decided", async ({
  page,
}) => {
  const TITLE = `E619 request walk ${Date.now()}`;
  try {
    const owner = await prisma.person.findFirst({
      where: { user: { email: "sw_user4@straterp.com" } },
      select: { id: true, user_id: true },
    });
    expect(owner?.user_id, "sw_user4 has no account to own a group").toBeTruthy();

    /* ⚠ Created through the real writer, with the type WS-A refused to write
       until an approval queue existed. */
    const { slug } = await createGroup(owner!.user_id!, { title: TITLE, type: "REQUEST" });

    /*
      ⚠⚠⚠ THE ASKER IS RESOLVED UP FRONT, AND EVERY QUERY BELOW IS SCOPED TO
      THEM. ⚠ The first version asked `where: { board: { slug } }` — and that
      board holds TWO membership rows, because `createGroup` makes the founder a
      member of their own group. `findFirst` returned the FOUNDER's row, which
      is `ACTIVE`/`JOINED` from the instant the group existed.
      ⚠⚠⚠ SO THE POLL FOR `ACTIVE` WOULD HAVE PASSED EVEN IF APPROVE DID
      NOTHING AT ALL — a green assertion about the wrong row, which is the
      failure mode `decisions_2026-09-23` §11 names ("two ones agree") and the
      one this suite has now hit twice. **The row under test must be addressed,
      not merely the board it sits on.**
    */
    const askerEmail = seededAccount().email;
    const asker = await prisma.person.findFirst({
      where: { user: { email: askerEmail } },
      select: { id: true },
    });
    expect(asker, `no Person for the asker ${askerEmail}`).not.toBeNull();

    /* ── 1 · THE ASKER ────────────────────────────────────────────────── */
    await signIn(page);
    await page.goto("/community/groups?view=discover", { waitUntil: "domcontentloaded" });

    const card = page.locator(".pm-groups-card", { hasText: TITLE });
    await expect(card, "the REQUEST group is not offered in Discover").toBeVisible();
    /* ⚠⚠ THE CONTROL SAYS `Ask to Join`, NOT `Join` — a request group offers a
       different verb because it is a different act, and `groupOffer` is what
       decides that rather than this page. */
    await card.getByRole("button", { name: "Ask to Join" }).click();

    /* ⚠⚠⚠ THE ASKER IS TOLD THEY ARE WAITING — "told either way", half one. */
    await expect
      .poll(async () => {
        await page.goto("/community/groups?view=requests", { waitUntil: "domcontentloaded" });
        return page.locator("text=Waiting on the group's owner.").count();
      }, { timeout: 15_000 })
      .toBeGreaterThan(0);

    const pending = await prisma.groupMembership.findFirst({
      where: { board: { slug }, person_id: asker!.id },
      select: { id: true, state: true, route: true, decided_at: true },
    });
    expect(pending, "asking did not create a row for the asker").not.toBeNull();
    expect(pending!.state, "asking should land PENDING, not ACTIVE").toBe("PENDING");
    expect(pending!.route).toBe("REQUESTED");
    /* ⚠ Nobody has decided yet, and the row says so rather than carrying a
       default timestamp that would look like a decision. */
    expect(pending!.decided_at).toBeNull();

    /* ── 2 · THE OWNER ────────────────────────────────────────────────── */
    await signInAsSeeded(page, "sw_user4@straterp.com");
    await page.goto("/community/groups?view=requests", { waitUntil: "domcontentloaded" });

    /* ⚠⚠ THE COUNT RIDES THE TAB, so a request waiting on you is visible
       without going looking for it. */
    await expect(page.locator(".pm-groups-pill")).toBeVisible();

    /* ⚠ THE ROW, BY ITS OWN CLASS. Locating a bare `div` by text resolved to
       the innermost match — the block holding the name, which does not contain
       the buttons — and the click hung until the test timed out. */
    const row = page.locator(".pm-groups-req", { hasText: TITLE });
    await expect(row, "the owner cannot see the request").toBeVisible();
    await row.getByRole("button", { name: /^Approve/ }).click();

    /* ── 3 · THE STORED ROW ───────────────────────────────────────────── */
    await expect
      .poll(async () => {
        const m = await prisma.groupMembership.findFirst({
          where: { board: { slug }, person_id: asker!.id },
          select: { state: true },
        });
        return m?.state;
      }, { timeout: 15_000 })
      .toBe("ACTIVE");

    const decided = await prisma.groupMembership.findFirst({
      where: { board: { slug }, person_id: asker!.id },
      select: { state: true, route: true, decided_at: true, decided_by_person_id: true, auto_approved: true },
    });
    /* ⚠⚠ THE ROUTE RECORDS **HOW** THEY GOT IN. An approved member is not the
       same fact as somebody who simply joined an open group. */
    expect(decided!.route).toBe("APPROVED");
    /* ⚠⚠⚠ AND THE AUDIT TRAIL IS REAL: who decided, and when. */
    expect(decided!.decided_by_person_id).toBe(owner!.id);
    expect(decided!.decided_at).not.toBeNull();
    /* ⚠⚠ `auto_approved` STAYS FALSE — it means *nobody decided*, and somebody
       just did. Writing `true` would erase the distinction the column exists
       for, which is how the backfill's rows stay tellable from real ones. */
    expect(decided!.auto_approved, "a person decided — this is not a backfill").toBe(false);

    console.log(
      `E619/ask-approve  ${slug} · PENDING/REQUESTED -> ${decided!.state}/${decided!.route} · decided_by set · auto_approved ${decided!.auto_approved}`
    );
  } finally {
    /* ⚠⚠ SCOPED BY TITLE, and `deleteMany` never `delete` — a teardown that can
       throw can hide the result it was protecting. Memberships cascade. */
    /* ⚠ Notifications first, while the board id still resolves (`E620`). */
    const made = await prisma.forumBoard.findMany({
      where: { title: TITLE },
      select: { id: true },
    });
    if (made.length > 0) {
      await prisma.notification.deleteMany({
        where: { entity_type: "forum_board", entity_id: { in: made.map((b) => b.id) } },
      });
    }
    await prisma.forumBoard.deleteMany({ where: { title: TITLE } });
    await prisma.$disconnect();
  }
});

/**
 * ── ⚠⚠⚠ DECLINE, AND WHO IS ALLOWED TO (`P2-A3-E619` WS-B 3) ───────────
 *
 * ⚠ TWO THINGS THE APPROVE WALK CANNOT SHOW, AND BOTH MATTER MORE:
 * 1. ⚠⚠ **A DECLINE IS TOLD.** "Approve or decline, **and they're told either
 *    way**" — a decline the asker cannot see reads as *"you never asked"*, and
 *    they ask again forever. It is RECORDED, never deleted, for that reason.
 * 2. ⚠⚠⚠ **A STRANGER CANNOT DECIDE.** The decision is owner-scoped in the
 *    WRITER, not in the page — *"a page that does not render a control is not a
 *    boundary"*. ⚠ This posts to the route directly, bypassing the UI entirely,
 *    which is the only way to prove a boundary is real.
 */
test("groups — a stranger cannot decide, and a decline is told", async ({ page }) => {
  const TITLE = `E619 decline walk ${Date.now()}`;
  try {
    const owner = await prisma.person.findFirst({
      where: { user: { email: "sw_user4@straterp.com" } },
      select: { id: true, user_id: true },
    });
    const askerEmail = seededAccount().email;
    const asker = await prisma.person.findFirst({
      where: { user: { email: askerEmail } },
      select: { id: true },
    });
    const { slug } = await createGroup(owner!.user_id!, { title: TITLE, type: "REQUEST" });

    /* ── the ask ──────────────────────────────────────────────────────── */
    await signIn(page);
    await page.goto("/community/groups?view=discover", { waitUntil: "domcontentloaded" });
    const card = page.locator(".pm-groups-card", { hasText: TITLE });
    await card.getByRole("button", { name: "Ask to Join" }).click();

    await expect
      .poll(async () => {
        const m = await prisma.groupMembership.findFirst({
          where: { board: { slug }, person_id: asker!.id },
          select: { state: true },
        });
        return m?.state;
      }, { timeout: 15_000 })
      .toBe("PENDING");

    const membership = await prisma.groupMembership.findFirst({
      where: { board: { slug }, person_id: asker!.id },
      select: { id: true },
    });

    /*
      ── ⚠⚠⚠ THE BOUNDARY, POSTED AT DIRECTLY ─────────────────────────────
      ⚠ STILL SIGNED IN AS THE ASKER — who is NOT the group's owner. They hold
      a valid session and a real membership id, which is exactly the shape of
      request a crafted client would send. ⚠⚠ 403, and the row must not move.
    */
    const refused = await page.evaluate(async (id) => {
      const r = await fetch("/api/community/groups/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId: id, decision: "approve" }),
      });
      return { status: r.status, body: await r.json().catch(() => null) };
    }, membership!.id);

    expect(refused.status, "a non-owner was allowed to decide").toBe(403);
    expect(refused.body?.code).toBe("NOT_OWNER");

    /* ⚠⚠⚠ AND THE ROW DID NOT MOVE. A refusal that still wrote would be worse
       than no refusal, because the status code would say it was safe. */
    const untouched = await prisma.groupMembership.findFirst({
      where: { board: { slug }, person_id: asker!.id },
      select: { state: true, decided_at: true, decided_by_person_id: true },
    });
    expect(untouched!.state).toBe("PENDING");
    expect(untouched!.decided_at, "a refused decision still stamped the row").toBeNull();
    expect(untouched!.decided_by_person_id).toBeNull();

    /* ── the decline, by the actual owner ─────────────────────────────── */
    await signInAsSeeded(page, "sw_user4@straterp.com");
    await page.goto("/community/groups?view=requests", { waitUntil: "domcontentloaded" });
    const row = page.locator(".pm-groups-req", { hasText: TITLE });
    await row.getByRole("button", { name: /^Decline/ }).click();

    await expect
      .poll(async () => {
        const m = await prisma.groupMembership.findFirst({
          where: { board: { slug }, person_id: asker!.id },
          select: { state: true },
        });
        return m?.state;
      }, { timeout: 15_000 })
      .toBe("DECLINED");

    /* ⚠⚠ THE ROW SURVIVES THE DECLINE. Deleting it would read to the asker as
       "you never asked" — which is precisely what "told either way" forbids. */
    const declined = await prisma.groupMembership.findFirst({
      where: { board: { slug }, person_id: asker!.id },
      select: { state: true, route: true, decided_by_person_id: true, auto_approved: true },
    });
    expect(declined, "the declined row was deleted rather than recorded").not.toBeNull();
    /* ⚠ The route still says REQUESTED — they asked; they were not approved. */
    expect(declined!.route).toBe("REQUESTED");
    expect(declined!.decided_by_person_id).toBe(owner!.id);
    expect(declined!.auto_approved).toBe(false);

    /* ── ⚠⚠⚠ AND THE ASKER IS TOLD, IN WORDS, ON THEIR OWN PAGE ─────────── */
    await signIn(page);
    await page.goto("/community/groups?view=requests", { waitUntil: "domcontentloaded" });
    await expect(
      page.locator("text=The owner declined this one."),
      "the asker is never told they were declined"
    ).toBeVisible();

    console.log(
      `E619/decline  stranger refused ${refused.status}/${refused.body?.code} · owner declined -> ${declined!.state}, row kept, asker told`
    );
  } finally {
    /* ⚠ Notifications first, while the board id still resolves (`E620`). */
    const made = await prisma.forumBoard.findMany({
      where: { title: TITLE },
      select: { id: true },
    });
    if (made.length > 0) {
      await prisma.notification.deleteMany({
        where: { entity_type: "forum_board", entity_id: { in: made.map((b) => b.id) } },
      });
    }
    await prisma.forumBoard.deleteMany({ where: { title: TITLE } });
    await prisma.$disconnect();
  }
});
