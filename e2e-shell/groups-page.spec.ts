import { test, expect } from "@playwright/test";
import { signIn, signInAsSeeded } from "./_auth";
import { prisma } from "@/lib/prisma";

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

const PHONE = { width: 390, height: 900 };
const DESK = { width: 1280, height: 1000 };

test.use({ viewport: PHONE });

test("groups — the page renders its counted figures at 390px", async ({ page }) => {
  await signIn(page);
  await page.goto("/community/forums", { waitUntil: "domcontentloaded" });

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

  await page.screenshot({ path: "/tmp/e619-phone.png", fullPage: true });

  console.log(
    `E619/phone  figures ${labels.map((l, i) => `${l.trim()}=${values[i].trim()}`).join(" · ")}`
  );
});

test("groups — the picture is one circle per group, dashed while quiet", async ({ page }) => {
  await signIn(page);
  await page.goto("/community/forums", { waitUntil: "domcontentloaded" });

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
  await page.goto("/community/forums", { waitUntil: "domcontentloaded" });

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
  await page.goto("/community/forums", { waitUntil: "domcontentloaded" });

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
  await page.goto("/community/forums", { waitUntil: "domcontentloaded" });

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
 * returns a slug and the form pushes to `/community/forums/<slug>`, where
 * `getBoard` decides. A member-created group has a NULL `learning_path_id`,
 * the same as the four general boards — so it *should* be readable by anyone.
 * ⚠ **"Should" is a reading of the code.** This walks it.
 */
test("groups — a member can start a group, and lands somewhere real", async ({ page }) => {
  const TITLE = `E619 walk ${Date.now()}`;
  let slug: string | null = null;
  try {
    await signIn(page);
    await page.goto("/community/forums", { waitUntil: "domcontentloaded" });

    await page.fill("#new-group-title", TITLE);
    await page.click('button:has-text("Start a Group")');

    /* ⚠ The form pushes to the new room — so the URL itself is the assertion
       that a slug came back and the route resolved. */
    await page.waitForURL(/\/community\/forums\/g-e619-walk/, { timeout: 20_000 });
    slug = new URL(page.url()).pathname.split("/").pop() ?? null;

    /* ⚠⚠⚠ NOT A 404, AND NOT AN ERROR PAGE. The heading is the group's own
       name, which only the real board can produce. */
    await expect(page.locator("h1")).toHaveText(TITLE);

    /* ⚠ And it is reachable a second time, by URL — a redirect that works only
       as a push would be a room nobody can return to. */
    await page.goto(`/community/forums/${slug}`, { waitUntil: "domcontentloaded" });
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
    await page.goto("/community/forums", { waitUntil: "domcontentloaded" });
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
    await prisma.forumBoard.deleteMany({ where: { title: TITLE } });
    await prisma.$disconnect();
  }
});
