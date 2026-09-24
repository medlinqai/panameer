import { test, expect } from "@playwright/test";
import { signIn, seededAccount } from "./_auth";
import { prisma } from "@/lib/prisma";
import { createGroup, joinGroup } from "@/lib/group-membership";

/**
 * ── ⚠⚠⚠ THE BELL, THE LIST AND THE WORKLIST (`P2-A3-E620` WS-C) ─────────
 *
 * ⚠ SCOTT'S WALK NOTE `E025`: *"We still have NOTHING in the notifications
 * bell… I have asked at least twice."*
 *
 * ⚠⚠⚠ THE ROWS THIS WALKS ARE **REAL**, NOT SEEDED. It creates a `REQUEST`
 * group and has another member actually ask to join it, so the notification
 * comes out of `joinGroup` — the same writer a member triggers. ⚠ A seeded row
 * would prove the PAGE renders; this proves the whole chain fires, which is the
 * half that was missing. ⚠⚠ And it cleans up through the database afterwards,
 * scoped to exactly what it made.
 *
 * ⚠⚠ THE PERSONAS ARE MEASURED: the default seeded account is the group's
 * OWNER (it is who `signIn` signs in as, so it is who sees the bell), and
 * `sw_user4` — a real host, measured — is the one who asks.
 */

/**
 * ⚠⚠ REMOVE EVERYTHING A PROBE MADE, IN THE RIGHT ORDER: the notifications
 * first (while their board ids still resolve), then the boards.
 * ⚠⚠⚠ IT MATCHES ON THE **ENTITY**, never on a person or an event key — this
 * runs against the ONE shared database, and a sweep by event key would delete
 * real members' notifications of the same kind.
 */
async function sweepProbe(titlePrefix: string) {
  const boards = await prisma.forumBoard.findMany({
    where: { title: { startsWith: titlePrefix } },
    select: { id: true },
  });
  if (boards.length > 0) {
    await prisma.notification.deleteMany({
      where: { entity_type: "forum_board", entity_id: { in: boards.map((b) => b.id) } },
    });
  }
  await prisma.forumBoard.deleteMany({ where: { title: { startsWith: titlePrefix } } });
}

const PHONE = { width: 390, height: 900 };
test.use({ viewport: PHONE });

/* ⚠⚠ A TEARDOWN THAT SURVIVES A TIMEOUT. A `finally` inside a test does not run
   when Playwright KILLS it — measured on `E619`, where one probe group survived
   into the shared database. ⚠ Scoped by two conditions that both encode this
   suite's own naming, because this runs against the ONE shared database. */
test.afterAll(async () => {
  /*
    ── ⚠⚠⚠ NOTIFICATIONS DO **NOT** CASCADE WITH THE BOARD ─────────────────

    ⚠ `Notification` has no foreign key to `ForumBoard` — it carries
    `entity_type` / `entity_id` as loose references, deliberately, so one table
    can point at anything. ⚠⚠ THE CONSEQUENCE IS THAT DELETING THE PROBE GROUP
    LEAVES ITS NOTIFICATIONS BEHIND, and the first version of this teardown did
    exactly that: **13 rows against a baseline of 1**, found by counting rather
    than by anything failing.
    ⚠⚠⚠ SO THE ROWS GO FIRST, WHILE THEIR BOARD IDS ARE STILL RESOLVABLE. After
    the board is gone there is nothing precise left to match on, and a teardown
    reduced to guessing by title is a teardown that will one day delete a
    member's real notification.
  */
  const boards = await prisma.forumBoard.findMany({
    where: { AND: [{ slug: { startsWith: "g-e620-" } }, { title: { startsWith: "E620 " } }] },
    select: { id: true },
  });
  if (boards.length > 0) {
    await prisma.notification.deleteMany({
      where: { entity_type: "forum_board", entity_id: { in: boards.map((b) => b.id) } },
    });
  }
  const swept = await prisma.forumBoard.deleteMany({
    where: { AND: [{ slug: { startsWith: "g-e620-" } }, { title: { startsWith: "E620 " } }] },
  });
  if (swept.count > 0) console.log(`E620/teardown  swept ${swept.count} probe group(s)`);
  await prisma.$disconnect();
});

test("notifications — a real event reaches the bell, the panel and the list", async ({
  page,
}) => {
  const TITLE = `E620 bell walk ${Date.now()}`;
  let ownerPersonId: string | null = null;
  try {
    /* ── SETUP — a real ask, through the real writer ──────────────────── */
    const ownerEmail = seededAccount().email;
    const owner = await prisma.person.findFirst({
      where: { user: { email: ownerEmail } },
      select: { id: true, user_id: true },
    });
    expect(owner?.user_id, `no account for ${ownerEmail}`).toBeTruthy();
    ownerPersonId = owner!.id;

    const asker = await prisma.person.findFirst({
      where: { user: { email: "sw_user4@straterp.com" } },
      select: { user_id: true },
    });
    expect(asker?.user_id, "sw_user4 has no account").toBeTruthy();

    const { slug } = await createGroup(owner!.user_id!, { title: TITLE, type: "REQUEST" });
    const board = await prisma.forumBoard.findUniqueOrThrow({
      where: { slug },
      select: { id: true },
    });

    /* ⚠⚠⚠ THE EVENT FIRES HERE, from the writer a member actually triggers. */
    await joinGroup(asker!.user_id!, board.id);

    const made = await prisma.notification.findFirst({
      where: { person_id: owner!.id, event_key: "group.join_requested" },
      orderBy: { created_at: "desc" },
      select: { id: true, requires_action: true, resolved_at: true, delivered_in_app_at: true, read_at: true },
    });
    expect(made, "asking to join wrote no notification").not.toBeNull();
    /* ⚠⚠ IT IS A WORKLIST ITEM AND IT IS UNRESOLVED — the two facts that put it
       on the list and keep it there until the owner decides. */
    expect(made!.requires_action, "a join request must be a worklist item").toBe(true);
    expect(made!.resolved_at).toBeNull();
    expect(made!.delivered_in_app_at, "it was never delivered, so it cannot badge").not.toBeNull();

    /* ── THE BELL ─────────────────────────────────────────────────────── */
    await signIn(page);
    await page.goto("/community", { waitUntil: "domcontentloaded" });

    const bell = page.getByRole("button", { name: "Notifications" });
    await expect(bell, "the bell is not in the band").toBeVisible();
    /* ⚠ The badge is ABSENT at zero, so its presence is itself the assertion
       that the count is real — a `0` badge could never have proved this. */
    await expect(page.locator('[aria-label$="unread notifications"]')).toBeVisible();

    /* ⚠⚠⚠ OPENING THE BELL MUST NOT MARK ANYTHING READ. This is the assertion
       the brief asked for in so many words, and it is checked against the
       DATABASE rather than the badge, because a badge could lag. */
    await bell.click();
    const panel = page.getByRole("menu", { name: "Notifications" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText(TITLE.slice(0, 20), { exact: false }).first()).toBeVisible();
    /* ⚠ The worklist item says so IN WORDS, not by colour alone. */
    await expect(panel.getByText("Needs You").first()).toBeVisible();
    /* ⚠ WS-C stop gate: phone screenshots of the bell, the list and the
       worklist. 390px is this suite's default viewport. */
    await page.screenshot({ path: "/tmp/e620-bell.png" });

    /*
      ── ⚠⚠⚠ THE PANEL FITS ON THE SCREEN ────────────────────────────────

      ⚠ CAUGHT IN THE 390px SCREENSHOT, NOT BY AN ASSERTION: the panel read
      *"otifications"* — anchored to the BELL with `right-0`, a 360px panel
      hanging off a button near the right edge put its left side **34px
      off-screen**, taking the heading's first letter with it.
      ⚠⚠ AND MY OWN COMMENT CLAIMED IT WAS *"pinned to the viewport edges
      rather than the button"* — I wrote the reasoning and did not build it.
      ⚠⚠⚠ A COMMENT THAT DESCRIBES A FIX THAT IS NOT THERE IS WORSE THAN NO
      COMMENT, because the next reader believes it (`decisions_2026-09-23` §6).

      ⚠ THIS MEASURES THE PANEL'S OWN BOX against the viewport, which is the
      thing that was actually wrong — a page-scroll check cannot see it,
      because an absolutely-positioned box off the left edge does not widen
      the document.
    */
    const box = await panel.boundingBox();
    expect(box, "the panel has no box").not.toBeNull();
    expect(box!.x, "the panel hangs off the LEFT edge").toBeGreaterThanOrEqual(0);
    expect(
      box!.x + box!.width,
      "the panel hangs off the RIGHT edge"
    ).toBeLessThanOrEqual(PHONE.width);

    const afterOpen = await prisma.notification.findUnique({
      where: { id: made!.id },
      select: { read_at: true },
    });
    expect(
      afterOpen!.read_at,
      "opening the bell marked a notification read — the brief forbids it"
    ).toBeNull();

    /* ── SEE ALL ──────────────────────────────────────────────────────── */
    await panel.getByRole("link", { name: "See All" }).click();
    await page.waitForURL(/\/notifications/);
    await expect(page.getByRole("heading", { name: "Needs Your Attention" })).toBeVisible();
    await page.screenshot({ path: "/tmp/e620-list.png", fullPage: true });

    /* ── THE FILTERS ──────────────────────────────────────────────────── */
    const labels = await page
      .locator('nav[aria-label="Filter notifications"] a')
      .allInnerTexts();
    expect(labels.map((l) => l.trim().split("\n")[0])).toEqual([
      "All",
      "Unread",
      "Work",
      "Community",
    ]);

    /* ⚠⚠ A JOIN REQUEST IS COMMUNITY, NOT WORK — and the two filters are a
       partition, so it must appear under exactly one of them. ⚠⚠⚠ ASSERTING
       BOTH DIRECTIONS IS THE POINT: a filter that shows everything would pass
       the first check alone. */
    await page.goto("/notifications?filter=community", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(TITLE.slice(0, 20), { exact: false }).first()).toBeVisible();

    await page.goto("/notifications?filter=work", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText(TITLE.slice(0, 20), { exact: false })
    ).toHaveCount(0);
    /* ⚠ AND THE FILTERED-EMPTY STATE IS NOT THE EMPTY-FEED STATE. Telling a
       member "nothing yet" while rows sit one tab away is the defect. */
    await expect(page.getByText("Nothing under this filter.")).toBeVisible();

    /* ── ⚠⚠ AND IT IS ON THE BAND'S HOME TOO (WS-C item 3) ──────────────
       ⚠ The brief puts the worklist in both places, and the two must show the
       same thing — they share `lib/worklist.ts`'s predicate precisely so they
       cannot disagree about what a member owes. */
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Waiting on You" }),
      "the worklist is not on the band's home"
    ).toBeVisible();
    await expect(page.getByText(TITLE.slice(0, 20), { exact: false }).first()).toBeVisible();
    await page.screenshot({ path: "/tmp/e620-worklist-home.png", fullPage: true });

    /*
      ── ⚠⚠⚠ ACTING ON IT CLEARS IT (WS-C stop gate) ─────────────────────

      ⚠ RULING 34e: *"an item disappears when the thing is DONE, not when it is
      read."* ⚠⚠ Everything above proved the item ARRIVES; this is the half that
      proves it can LEAVE — and an item that cannot leave is worse than one that
      never arrived, because it accumulates on a real member's list forever.
      ⚠⚠⚠ THE ACTION IS THE REAL ONE: the owner approves through the Requests
      view, exactly as `E619` built it, and `decideJoinRequest` resolves the
      notification as part of recording the decision.
    */
    await page.goto("/community/groups?view=requests", { waitUntil: "domcontentloaded" });
    const row = page.locator(".pm-groups-req", { hasText: TITLE });
    await expect(row, "the owner cannot see the request").toBeVisible();
    await row.getByRole("button", { name: /^Approve/ }).click();

    await expect
      .poll(
        async () => {
          const n = await prisma.notification.findUnique({
            where: { id: made!.id },
            select: { resolved_at: true },
          });
          return n?.resolved_at === null ? "still waiting" : "resolved";
        },
        { timeout: 15_000 }
      )
      .toBe("resolved");

    /* ⚠⚠ AND IT IS OFF BOTH SURFACES — the page and the band's home. They share
       one predicate precisely so this cannot pass on one and fail on the other. */
    await page.goto("/notifications", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Needs Your Attention" }),
      "the worklist section survived its last item being done"
    ).toHaveCount(0);

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Waiting on You" }),
      "the home's worklist survived its last item being done"
    ).toHaveCount(0);

    console.log(
      `E620/walk  join request -> worklist item · bell badged · panel showed it · opening marked nothing read · community=yes work=no · on /dashboard too · APPROVED -> resolved and gone from both`
    );
  } finally {
    /* ⚠⚠ BY ENTITY, NOT BY EVENT KEY ON ONE PERSON. The approve step notifies
       the ASKER as well as the owner, so a per-person sweep missed half of
       what this test created — which is how the count drifted 1 -> 13. */
    await sweepProbe(TITLE);
  }
});

test("notifications — reading ONE marks only that one", async ({ page }) => {
  const TITLE = `E620 read-one ${Date.now()}`;
  try {
    const ownerEmail = seededAccount().email;
    const owner = await prisma.person.findFirst({
      where: { user: { email: ownerEmail } },
      select: { id: true, user_id: true },
    });
    const asker = await prisma.person.findFirst({
      where: { user: { email: "sw_user4@straterp.com" } },
      select: { user_id: true },
    });
    /*
      ⚠⚠ TWO groups, so TWO notifications — because the claim is *"reading one
      marks **only** that one"*, and with a single row that sentence cannot
      fail. ⚠⚠⚠ "TWO ONES AGREE" (`decisions_2026-09-23` §11): a fixture must
      make the compared values different, and one notification would leave this
      assertion unable to tell a correct implementation from mark-all-read.
    */
    const a = await createGroup(owner!.user_id!, { title: `${TITLE} A`, type: "REQUEST" });
    const b = await createGroup(owner!.user_id!, { title: `${TITLE} B`, type: "REQUEST" });
    for (const slug of [a.slug, b.slug]) {
      const board = await prisma.forumBoard.findUniqueOrThrow({
        where: { slug },
        select: { id: true },
      });
      await joinGroup(asker!.user_id!, board.id);
    }

    const before = await prisma.notification.count({
      where: { person_id: owner!.id, event_key: "group.join_requested", read_at: null },
    });
    expect(before, "two asks should make two unread rows").toBeGreaterThanOrEqual(2);

    await signIn(page);
    await page.goto("/community", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Notifications" }).click();
    const panel = page.getByRole("menu", { name: "Notifications" });
    await expect(panel).toBeVisible();

    /* ⚠ Click the FIRST row — reading it marks it and navigates. */
    await panel.getByRole("menuitem").first().click();

    /* ⚠⚠ EXACTLY ONE FEWER. Not zero, which would be mark-all-read wearing a
       different name; and not the same, which would be a link that does not
       mark at all. */
    await expect
      .poll(
        async () =>
          prisma.notification.count({
            where: { person_id: owner!.id, event_key: "group.join_requested", read_at: null },
          }),
        { timeout: 15_000 }
      )
      .toBe(before - 1);

    console.log(`E620/read-one  unread ${before} -> ${before - 1} — exactly one`);
  } finally {
    await sweepProbe(TITLE);
  }
});
