import { test, expect } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";

/**
 * `P2-ALL-E763` — one dark value for `--color-bg-soft`.
 *
 * ⚠⚠ **THE TAG IS `BG_PHASE` IN THE ENVIRONMENT**: run it with `BG_PHASE=before`
 * to capture the current state, make the change, then `BG_PHASE=after`. The
 * screenshots sit side by side under the same six names.
 *
 * ⚠⚠⚠ **IT SAMPLES EVERY `bg-bg-soft` ELEMENT ON EACH PAGE, NOT JUST ONE.** The
 * point of a token change is that it moves many things at once, so a measurement
 * of one element would prove nothing about the other 111 sites.
 */
const PHASE = process.env.BG_PHASE ?? "before";

/*
  ⚠⚠⚠ THE SIX SCOTT NAMED, **PLUS FOUR THAT ACTUALLY RENDER THE TOKEN.**

  ⚠ Measured on the `before` pass: five of the six named pages render **ZERO**
  `bg-bg-soft` elements, and `/profile` renders two (one of them transparent).
  ⚠⚠ **SCREENSHOTS OF PAGES THAT DO NOT USE THE TOKEN PROVE NOTHING** — they would
  be six identical pairs, which reads as "safe" while testing nothing. ⚠ So the
  heaviest real users are sampled too: Learn (`PathSpine`, 5), the work request
  form (`CreateWorkRequest`, 4), the provider wizard (`join/provider`, 4) and the
  marketplace card (`ProviderCard`, 3).
*/
const PAGES: [string, string][] = [
  ["profile", "/profile"],
  ["community", "/connect/community"],
  ["usage", "/usage"],
  ["settings", "/settings/notifications"],
  ["admin-support", "/admin/support"],
  ["learn", "/learn"],
  ["create-work", "/create-work"],
  ["join-provider", "/join/provider"],
  ["talent", "/talent"],
  /* ⚠ `providers/[id]` is resolved at run time from the owner's own link. */
];

test(`E763 ${PHASE} — bg-soft across six pages`, async ({ page }) => {
  await signIn(page);
  await page.goto("/profile");
  const providerHref =
    (await page.getByRole("link", { name: /How Others See My Profile/i }).first().getAttribute("href")) ??
    "/profile";

  const all: string[] = [...PAGES.map(([n, p]) => `${n}|${p}`), `providers|${providerHref}`];
  const report: string[] = [];

  for (const entry of all) {
    const [name, path] = entry.split("|");
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 1280, height: 900 });
      const res = await page.goto(path);
      if (!res || res.status() >= 400) {
        report.push(`${name} ${scheme}: HTTP ${res?.status()} — skipped`);
        continue;
      }
      await page.waitForTimeout(400);
      /* ⚠ Every element whose computed background is the bg-soft value, however
         it got there — class, inline, inherited. */
      const hits = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>("*"))
          .filter((el) => el.className && String(el.className).includes("bg-bg-soft"))
          .map((el) => getComputedStyle(el).backgroundColor)
      );
      const uniq = [...new Set(hits)];
      report.push(`${name.padEnd(14)} ${scheme.padEnd(5)} ${hits.length} bg-soft element(s) → ${uniq.join(", ") || "none"}`);
      if (scheme === "dark") {
        await page.screenshot({ path: `e2e-support/shots/bgsoft-${PHASE}-${name}-dark.png`, fullPage: false });
      } else {
        await page.screenshot({ path: `e2e-support/shots/bgsoft-${PHASE}-${name}-light.png`, fullPage: false });
      }
    }
  }
  console.log(`\n===== E763 ${PHASE.toUpperCase()} =====\n  ` + report.join("\n  ") + "\n");
  expect(report.length).toBeGreaterThan(0);
});
