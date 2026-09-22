import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GATE_PROVIDER_EMAIL } from "../prisma/gate-persona";

/**
 * ── ⚠⚠ ONE SIGN-IN, TWO CALLERS (`P2-J3-E567` WS-A) ───────────────────────
 *
 * ⚠ EXTRACTED FROM `app-shell.spec.ts`, WHERE IT WAS A LOCAL FUNCTION. It is
 * shared because `e2e-shell/` now holds a second spec (the Connect walk), and
 * ⚠⚠ A SECOND COPY OF THE SIGN-IN IS THE `teachesPathWhere` MISTAKE APPLIED TO
 * TEST CODE — the one that has already cost twice in `E558`. One definition,
 * imported; never two that drift.
 *
 * ⚠ THE ORIGINAL IS SUPERSEDED-AND-QUOTED AT ITS OLD SITE (`E164`), not deleted.
 *
 * ⚠ THE ACCOUNT IS READ FROM THE SEED FILE, NOT HARDCODED. `test3@panameer.com`
 * is in `prisma/seed-data/test-users.json`, generated from Scott's Users.xlsx —
 * so a password rotation there changes this helper too, instead of breaking the
 * suite a month later for a reason nobody connects.
 *
 * ⚠⚠ SUPERSEDED 2026-09-21 — THE ACCOUNT IS NO LONGER test3; see the block at
 * `seededAccount` and `prisma/gate-persona.ts`. Quoted not deleted (`E164`), and
 * the DUAL-ROLE POINT BELOW STILL STANDS for the new persona too:
 * `test3@panameer.com` is Michael Star — `is_service_provider: true`,
 * `is_service_coordinator: FALSE`. ⚠ THE SEED HAS NO DUAL-ROLE ACCOUNT, so no
 * browser test here can prove that a person holding BOTH capabilities sees both
 * of Teams' section sets. ⚠ That half is proved STATICALLY instead — see
 * `check:community`'s Teams block. ⚠⚠ DO NOT "FIX" THIS BY ADDING A DUAL-ROLE
 * SEED USER: row counts are quoted by other gates and briefs, including the
 * "10 dual-role" figure itself, and that is a seed decision with its own blast
 * radius.
 */

/**
 * ── ⚠⚠ THE TWO `waitForTimeout` CALLS ARE CARRIED FORWARD DELIBERATELY ─────
 *
 * ⚠ `playwright.config.ts` records that WS-3 FORBIDS `waitForTimeout`: *"A retry
 * turns a real intermittent defect into a green run... the suite has to stay
 * trustworthy or it stops being read."* ⚠⚠ THE TENSION IS REAL AND IT IS
 * RECORDED HERE RATHER THAN RESOLVED.
 *
 * ⚠ THE HYDRATION JUSTIFICATION BELOW IS A REAL ONE — an unhydrated React input
 * takes the value and loses it on the first client render, which posts an empty
 * email and 401s in 5ms. That is not flake; it is a genuine race with a known
 * cause.
 *
 * ⚠⚠ `E567` IS AN EXTRACTION AND DOES NOT RE-LITIGATE IT. Replacing these with a
 * web-first assertion would be a BEHAVIOUR CHANGE INSIDE A MOVE — and it would
 * make "the count did not change" unprovable, which is the only evidence the
 * extraction was clean. ⚠ WHOEVER REPLACES THEM SHOULD DO IT AS ITS OWN CHANGE,
 * with the count held still on either side.
 */

export function seededAccount(): { email: string; password: string } {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "seed-data", "test-users.json"), "utf8")
  ) as Record<string, unknown>;
  const groups = Object.values(raw).filter(Array.isArray) as {
    email: string;
    password: string;
  }[][];
  const all = groups.flat();
  /*
    ── ⚠⚠⚠ THE ACCOUNT MOVED OFF test3 (`P0-E595` WS-B, Scott 2026-09-21) ─────
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const chosen = all.find((u) => u.email === "test3@panameer.com");
    //   if (!chosen) throw new Error("test3@panameer.com is not in prisma/seed-data/test-users.json");
    ⚠⚠ `test3@panameer.com` IS A RECRUITER IN `Users.xlsx`, and `WorkMethod.
    RECRUITER` suppresses the rate — so it can never satisfy
    `providerMeetsRequired`. Scott: *"the roster wins."* ⚠ The address now comes
    from ONE constant, `prisma/gate-persona.ts`, which the community seed reads
    too; the whole reasoning lives there.
  */
  const chosen = all.find(
    (u) => u.email?.toLowerCase() === GATE_PROVIDER_EMAIL.toLowerCase() && u.password
  );
  if (!chosen) {
    throw new Error(
      `${GATE_PROVIDER_EMAIL} is not in prisma/seed-data/test-users.json with a password ` +
        `— see prisma/gate-persona.ts`
    );
  }
  return { email: chosen.email, password: chosen.password };
}

export async function signIn(page: Page) {
  const { email, password } = seededAccount();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"]');
  /* Hydration: an unhydrated React input takes the value and loses it on the
     first client render, which posts an empty email and 401s in 5ms. */
  await page.waitForTimeout(1200);
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', email, { delay: 5 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', password, { delay: 5 });
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
    page.click('button[type="submit"]'),
  ]);
  expect(res.ok(), `sign-in as ${email} returned ${res.status()}`).toBe(true);
  /*
    ── ⚠⚠⚠ `res.ok()` IS NOT PROOF OF SIGN-IN (`P2-A2-E597` WS-D) ────────────

    ⚠ `res.ok()` asks whether the CALLBACK ANSWERED. It does not ask whether a
    SESSION EXISTS, and those are different questions. ⚠⚠ MEASURED AT `E597`
    WS-A: a probe against a torn-down persona reported `res.ok() === true` and
    sat on `/login`, and every downstream assertion then failed describing the
    WIZARD instead of the SESSION — which is the hour this costs.

    ⚠⚠⚠ AND A CORRECTION TO MY OWN EARLIER CLAIM, BECAUSE IT DID NOT SURVIVE
    MEASUREMENT (`E597` WS-D, 2026-09-21). WS-A recorded the mechanism as
    *"NextAuth answers 200 with an error URL, so a failed sign-in and a
    successful one are the same status code."* ⚠ RE-MEASURED AGAINST THIS
    BUILD, BOTH FAILURE MODES ANSWER **401**: a real account with a wrong
    password → 401, an address with no account → 401. Only a genuine sign-in
    returned 200, and it reached `/dashboard`.
    ⚠⚠ SO ON TODAY'S BUILD `res.ok()` WOULD HAVE CAUGHT BOTH, AND THE 200 CASE
    IS NOT REPRODUCIBLE HERE. The assertion below is kept anyway — it is free,
    it asks the question we actually mean, and WS-A's observation was real even
    though its explanation was not. ⚠⚠⚠ IT IS DEFENCE IN DEPTH, NOT A HOLE THIS
    BRIEF CAN DEMONSTRATE, and saying otherwise would be the kind of unverified
    premise `CLAUDE.md` opens with.
    ⚠⚠⚠ THIS HELPER IS EIGHT SUITES' CONTRACT, and it carried the weakness while
    `wizard-contract.spec.ts` had already been hardened against it. It worked
    only because its persona always exists — a property of the seed, not of the
    helper.

    ⚠ AND THE WAIT IS NO LONGER A SLEEP. `waitForTimeout(1500)` raced the
    post-sign-in redirect: the callback answering is not the moment the client
    finishes navigating, and against a DEV server compiling the destination on
    demand that gap runs past 1.5s.
    ⚠⚠ THE `catch` IS DELIBERATE — a timeout must fall through to the `expect`
    below, whose message names the real failure. Playwright's own timeout would
    say *"waitForURL exceeded"*, which is the sentence that misdirects.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   await page.waitForTimeout(1500);

    ⚠⚠ THIS IS THE "OWN CHANGE" THE BLOCK ABOVE ASKED FOR. `E567` declined to
    touch these waits inside an extraction, on the grounds that a behaviour
    change inside a move makes "the count did not change" unprovable. This is
    not a move, and all eight suites are run on both sides of it.
  */
  await page
    .waitForURL((u) => new URL(u).pathname !== "/login", { timeout: 20_000 })
    .catch(() => {});
  expect(
    new URL(page.url()).pathname,
    `sign-in as ${email} did not leave /login — the session was never created`
  ).not.toBe("/login");
}

/**
 * ── ⚠⚠ SIGN IN AS A NAMED SEEDED ACCOUNT (`P2-A2-E598` WS-D) ──────────────
 *
 * ⚠ `signIn` above is the GATE PERSONA and is eight suites' contract. WS-D
 * needs three DIFFERENT viewers of one profile — an owner, a buyer and another
 * provider — to prove the rate rule, and that cannot be done with one account.
 *
 * ⚠⚠ THE PASSWORD STILL COMES FROM THE SEED FILE, never from a literal: a
 * rotation there changes this too, instead of breaking a suite a month later
 * for a reason nobody connects. ⚠⚠⚠ IT THROWS IF THE ADDRESS IS NOT IN THE SEED
 * WITH A PASSWORD, so a renamed persona fails loudly rather than signing in as
 * nobody (`E586`).
 *
 * ⚠ IT SHARES `signIn`'S HARDENING — the session must actually leave `/login`,
 * and the redirect is waited for rather than slept through.
 */
export async function signInAsSeeded(page: Page, email: string) {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "seed-data", "test-users.json"), "utf8")
  ) as Record<string, unknown>;
  const all = (Object.values(raw).filter(Array.isArray) as { email: string; password: string }[][]).flat();
  const chosen = all.find((u) => u.email?.toLowerCase() === email.toLowerCase() && u.password);
  if (!chosen) {
    throw new Error(`${email} is not in prisma/seed-data/test-users.json with a password`);
  }
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"]');
  /* ⚠ Hydration — the same race `signIn` records. */
  await page.waitForTimeout(1200);
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', chosen.email, { delay: 5 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', chosen.password, { delay: 5 });
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
    page.click('button[type="submit"]'),
  ]);
  expect(res.ok(), `sign-in as ${chosen.email} returned ${res.status()}`).toBe(true);
  await page
    .waitForURL((u) => new URL(u).pathname !== "/login", { timeout: 20_000 })
    .catch(() => {});
  expect(
    new URL(page.url()).pathname,
    `sign-in as ${chosen.email} did not leave /login — the session was never created`
  ).not.toBe("/login");
}
