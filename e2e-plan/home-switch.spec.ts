import { expect, test } from "@playwright/test";
import { adminAccount, signInAs } from "../e2e-tracker/_admin";
import { planDb } from "./_plan-state";

/**
 * ── ⚠⚠⚠ THE FOLLOWER TABLE IS LIVE PRODUCTION DATA, AND THIS FILE LEARNED IT
 *        THE HARD WAY ──────────────────────────────────────────────────────────
 *
 * ⚠ The first version of the test below asserted `count() === 0`, taken from a
 * baseline measured hours earlier in the same run.
 * ⚠⚠⚠ **IT FAILED BECAUSE A REAL PERSON FOLLOWED THE BUILD ON `status.panameer.com`
 * WHILE THE RUN WAS IN PROGRESS** — one row, a real third-party address, written
 * at 14:38 UTC. `status.panameer.com` is live and strangers are using it.
 * ⚠⚠ **A `deleteMany` TO "CLEAN UP" WOULD HAVE REMOVED THAT PERSON'S FOLLOW.**
 *
 * ⚠ So followers are SNAPSHOTTED AND COMPARED AS A SET, never counted against a
 * remembered number. A hard-coded count on a table that production writes to is
 * wrong the moment somebody uses the product — which is the point of shipping it.
 */

/**
 * ── `E787` — THE FRONT DOOR, THE RUNTIME HALF ───────────────────────────────
 *
 * ⚠⚠ **THE SWITCH ITSELF IS PROVEN BY `check:home-switch`, NOT HERE.** It is a
 * decision `next.config.ts` makes when a server starts, so a running server can
 * only ever show one side of it — and this one runs with the switch OFF, which
 * is the state that must keep working unchanged.
 * ⚠ What only a browser can prove is that `/home` actually serves the marketing
 * home to a stranger, and that the band carries the way back to it.
 */

test.describe("the marketing home has its own address", () => {
  test("/home is public and renders the marketing home, signed out", async ({ page }) => {
    const res = await page.goto("/home", { waitUntil: "domcontentloaded" });
    expect(res?.status(), "the default is DENY — /home must be registered public").toBe(200);
    /** ⚠ Not a login wall: the sign-in form must not be what answered. */
    expect(new URL(page.url()).pathname).toBe("/home");
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    /** ⚠⚠ And it is the real home, not an empty shell — `HomeSections` first
     *  section carries the hero copy. */
    await expect(page.locator("main, body").first()).toContainText(/Optimize Your Business with AI/i);
  });

  test("with the switch off, `/` still serves that same page", async ({ page }) => {
    const res = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(res?.status()).toBe(200);
    /** ⚠⚠⚠ NO REDIRECT. Turning the switch off has to restore today's behaviour
     *  exactly, or it is not a switch — it is a one-way door. */
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page.locator("main, body").first()).toContainText(/Optimize Your Business with AI/i);
  });

  test("the two pages render the same component", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const rootH1 = await page.locator("h1").first().innerText();
    await page.goto("/home", { waitUntil: "domcontentloaded" });
    const homeH1 = await page.locator("h1").first().innerText();
    /** ⚠ A re-export, not a copy — two homes that drift apart would be `E585`
     *  on the most-walked page on the site. */
    expect(homeH1).toBe(rootH1);
  });
});

test.describe("the pink band is context-aware", () => {
  /**
   * ⚠⚠ Scott, 2026-10-03: on the tracker the band offers `Join free` (signed-out
   * only) and `See the full site →`; **everywhere else, including inside the
   * signed-in app, it offers `Follow the build →`.** ⚠⚠⚠ `Join free` is never
   * shown to a signed-in member.
   */
  const band = (page: import("@playwright/test").Page) => page.locator("[data-dev-banner]");

  test("the pitch line is on every surface", async ({ page }) => {
    for (const path of ["/status", "/home", "/"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(band(page), `no band on ${path}`).toBeVisible();
      await expect(band(page)).toContainText("Panameer is the Oracle Cloud marketplace");
      await expect(band(page)).toContainText(/Public beta opens November\s*15/);
    }
  });

  test("ON the tracker, signed out: Join free · See the full site, and NO Follow", async ({ page }) => {
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    const b = band(page);
    await expect(b.getByRole("link", { name: "Join free" })).toHaveAttribute("href", "/join");
    await expect(b.getByRole("link", { name: /See the full site/ })).toHaveAttribute("href", "/home");
    /** ⚠⚠⚠ On the tracker, `Follow the build →` would be a link to the page you
     *  are already on. That is why it is absent, and asserting its ABSENCE is
     *  the half that stops it drifting back. */
    await expect(b.getByRole("link", { name: /Follow the build/ })).toHaveCount(0);
  });

  test("ON the tracker, signed in: NO Join free, but the way out stays", async ({ page }) => {
    const { email, password } = adminAccount();
    await signInAs(page, email, password);
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    const b = band(page);
    /** ⚠ Waited for, not read once: the session resolves a tick after mount, so
     *  an immediate read would pass before `Join free` could have appeared —
     *  which would make this assertion vacuous (ruling 11). */
    await expect(b.getByRole("link", { name: /See the full site/ })).toBeVisible();
    await expect(b.getByRole("link", { name: "Join free" })).toHaveCount(0);
    await expect(b.getByRole("link", { name: /Follow the build/ })).toHaveCount(0);
  });

  test("OFF the tracker, signed out: Follow the build, and NO Join free", async ({ page }) => {
    await page.goto("/home", { waitUntil: "domcontentloaded" });
    const b = band(page);
    const follow = b.getByRole("link", { name: /Follow the build/ });
    await expect(follow).toHaveAttribute("href", "https://status.panameer.com");
    /** ⚠ It crosses to another host, so it keeps the page the visitor was on. */
    await expect(follow).toHaveAttribute("target", "_blank");
    await expect(b.getByRole("link", { name: "Join free" })).toHaveCount(0);
    await expect(b.getByRole("link", { name: /See the full site/ })).toHaveCount(0);
  });

  test("INSIDE the signed-in app: Follow the build, and never Join free", async ({ page }) => {
    const { email, password } = adminAccount();
    await signInAs(page, email, password);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const b = band(page);
    await expect(b.getByRole("link", { name: /Follow the build/ })).toBeVisible();
    /** ⚠⚠ THE RULE SCOTT NAMED, on the surface where it matters most: a member
     *  who is signed in must never be offered an account. */
    await expect(b.getByRole("link", { name: "Join free" })).toHaveCount(0);
  });

  test("Dismiss still closes it", async ({ page }) => {
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    await expect(band(page)).toBeVisible();
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(band(page)).toHaveCount(0);
  });

  test("the tracker's link actually lands on the marketing home", async ({ page }) => {
    await page.goto("/status", { waitUntil: "domcontentloaded" });
    await band(page).getByRole("link", { name: /See the full site/ }).click();
    await page.waitForURL((u) => u.pathname === "/home");
    await expect(page.locator("main, body").first()).toContainText(/Optimize Your Business with AI/i);
  });
});

/**
 * The follower rows as they stood before this file ran. ⚠ A SET, not a count:
 * the question is "are the same people following?", not "how many".
 *
 * ⚠⚠⚠ **THIS DECLARATION WAS SILENTLY DELETED ONCE AND THE SUITE FAILED WITH
 * `ReferenceError: followersBefore is not defined`.** A later edit replaced the
 * region ENDING at the test below, and these lines sat immediately above it — so
 * they were inside the replaced span. ⚠ Recorded because the failure read like a
 * test bug and was an editing bug.
 */
let followersBefore: string[] = [];

test.beforeAll(async () => {
  followersBefore = (
    await planDb.workTrackerFollower.findMany({ select: { person_id: true } })
  )
    .map((r) => r.person_id)
    .sort();
});

test("E781 still holds — ?follow=1 survives and the URL ends clean", async ({ page }) => {
  /**
   * ⚠⚠ RE-ASSERTED HERE BECAUSE LANE 5 CHANGES THE FRONT DOOR AND `E781`'s
   * round trip is the one journey that crosses it. ⚠ The redirect is host-aware:
   * on the status host it lands on `/`, everywhere else on `/status`. On
   * localhost that is `/status`.
   */
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
  const me = await planDb.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { person: { select: { id: true } } },
  });
  const personId = me?.person?.id ?? null;
  /** ⚠⚠ Resolved from the SNAPSHOT, so "was this person already following?" is
   *  answered without a second query that could race a live visitor. */
  const alreadyFollowing = personId !== null && followersBefore.includes(personId);
  /** ⚠⚠⚠ If the admin has no `person`, the follow still writes a row and this
   *  test cannot clean it up — so it refuses to run rather than leaving one
   *  behind on a live table. */
  expect(personId, "no person for the admin account — this test would leak a follower row").not.toBeNull();

  try {
    await page.goto("/status?follow=1", { waitUntil: "domcontentloaded" });
    /** ⚠⚠⚠ THE PARAM MUST BE GONE. With `?follow=1` still in the URL, the
     *  Unfollow button's refresh re-fired the intent and re-followed the person
     *  — unfollowing was impossible (`E781`). */
    await page.waitForURL((u) => u.pathname === "/status" && u.search === "");
    expect(new URL(page.url()).search).toBe("");
    expect(
      await planDb.workTrackerFollower.count({ where: { person_id: personId! } }),
      "the follow must have been recorded",
    ).toBe(1);
  } finally {
    /** ⚠⚠⚠ IT REMOVES EXACTLY THE ROW IT ADDED — scoped to this one person, and
     *  only when that person was not already following. ⚠ Never a `deleteMany`
     *  over the table: a real member followed the build DURING this run, and a
     *  broad delete would have taken them with it. */
    if (personId && !alreadyFollowing) {
      await planDb.workTrackerFollower.deleteMany({ where: { person_id: personId } });
    }
  }
});

test("the same people are following as before this file ran", async () => {
  /**
   * ⚠ Asserted separately so a teardown that silently failed cannot pass as a
   * clean run — the `E765` lesson.
   * ⚠⚠⚠ **AS A SET DIFFERENCE, NOT A COUNT.** It asks whether this file removed
   * anyone or left anyone behind. ⚠ A live visitor following mid-run ADDS a row
   * this file never touched, and that must not fail the gate — asserting a
   * remembered total made a stranger using the product look like a defect.
   */
  const now = (await planDb.workTrackerFollower.findMany({ select: { person_id: true } }))
    .map((r) => r.person_id)
    .sort();
  const removed = followersBefore.filter((id) => !now.includes(id));
  const leftBehind = now.filter((id) => !followersBefore.includes(id));
  expect(removed, "this file removed someone else's follow").toEqual([]);
  expect(leftBehind, "this file left a follower row behind").toEqual([]);
});
