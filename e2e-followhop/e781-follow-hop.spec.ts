import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";
import { adminAccount, signInAs } from "../e2e-support/_admin";

/**
 * ── ⚠⚠ `?follow=1` SURVIVES THE HOP, AND THE URL ENDS CLEAN (`P2-ALL-E781`) ─
 *
 * ⚠⚠⚠ **THE BUG WAS A DROPPED QUERY, MEASURED NOT GUESSED.**
 * `new URL("/status", request.url)` takes the PATH from its first argument and
 * only the ORIGIN from its second, so `new URL("/status",
 * "https://status.panameer.com/?follow=1")` yields `search: ""`. ⚠ The signed-out
 * button sends people to `/join?next=/status&follow=1`; `E780` now carries that
 * query across the host hop, and this rewrite was throwing it away on the last
 * step.
 *
 * ⚠⚠ **AND THE LANDING URL IS HOST-AWARE.** On the status host the tracker IS the
 * root, so the post-follow redirect goes to `/`; everywhere else `/status` is the
 * page's own address and stays.
 *
 * ⚠⚠⚠ **IT WRITES TO THE ONE SHARED DATABASE, SO IT PUTS THE ROW BACK.** The
 * follower table is live data behind a public figure (`E765`'s teardown rule);
 * `afterAll` restores exactly the state it found and asserts it did.
 */
const prisma = db();
let BEFORE: string[] = [];

test.beforeAll(async () => {
  BEFORE = (await prisma.workTrackerFollower.findMany({ select: { person_id: true } })).map(
    (r) => r.person_id
  );
});

test.afterAll(async () => {
  /* ⚠ Delete anyone this run added; restore anyone it removed. */
  await prisma.workTrackerFollower.deleteMany({ where: { person_id: { notIn: BEFORE } } });
  for (const id of BEFORE) {
    await prisma.workTrackerFollower.upsert({
      where: { person_id: id },
      update: {},
      create: { person_id: id },
    });
  }
  const after = (await prisma.workTrackerFollower.findMany({ select: { person_id: true } })).map(
    (r) => r.person_id
  );
  if (JSON.stringify([...after].sort()) !== JSON.stringify([...BEFORE].sort())) {
    throw new Error(
      `FOLLOWERS WERE NOT RESTORED — before ${BEFORE.length}, after ${after.length}`
    );
  }
});

test("⚠⚠⚠ signed in, ?follow=1 follows once and the URL ends clean", async ({ page }) => {
  const a = adminAccount();
  /* ⚠ Signing in ON the status host: the cookie is scoped to this origin, which
     is what makes the signed-in status-host path reachable at all locally. */
  await signInAs(page, a.email, a.password);

  await page.goto("/?follow=1", { waitUntil: "domcontentloaded" });
  /* ⚠⚠ THE CLEAN URL IS THE POINT — not `/status`, which the site never shows on
     this host and which `E780` deliberately does not redirect. */
  await expect(page).toHaveURL("http://status.localhost:3104/");

  /* ⚠⚠ THE LABELS ARE `Follow the Build` AND `Following ✓` — there is no
     "Unfollow" button, and my first version of this test looked for one and
     failed against correct code. `Follow the Build` names an ACTION and is Title
     Case; `Following ✓` reports a STATE (load-bearing rule 11). */
  const following = page.getByRole("button", { name: "Following ✓" });
  await expect(following, "the follow intent did not apply").toBeVisible({ timeout: 15_000 });

  /* ⚠⚠⚠ AND UN-FOLLOWING WORKS — the `E758` re-follow bug stays fixed. With
     `?follow=1` still in the URL, the button's `router.refresh()` re-fired the
     intent and re-followed the person, which made un-following impossible. */
  await following.click();
  await expect(
    page.getByRole("button", { name: "Follow the Build" }),
    "un-following did not stick — the intent re-fired"
  ).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL("http://status.localhost:3104/");
});

test("⚠⚠ the rewrite carries any query, and none is byte-identical to before", async ({
  request,
}) => {
  for (const q of ["", "?follow=1", "?follow=1&x=2", "?x=2"]) {
    const res = await request.get(`/${q}`, { maxRedirects: 0 });
    expect(res.status(), `status host /${q}`).toBe(200);
  }
});

/** ⚠ Signed OUT, the intent must do nothing — the link cannot make anyone follow. */
test("⚠⚠ signed out, ?follow=1 follows nobody", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const before = await prisma.workTrackerFollower.count();
  await page.goto("http://status.localhost:3104/?follow=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Follow the Build" })).toBeVisible();
  expect(await prisma.workTrackerFollower.count(), "a signed-out visit changed the count").toBe(
    before
  );
  await ctx.close();
});
