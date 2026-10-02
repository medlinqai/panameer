import { test, expect } from "@playwright/test";
import { adminAccount, signInAs } from "./_admin";

/**
 * `P2-ALL-E754` lane C — the banner link.
 *
 * ⚠⚠ Asserted on BOTH surfaces, because that is the brief's requirement and
 * because `DevBanner` renders from the ROOT layout: if it had been moved into
 * one of the two shells, one of these would fail and the other would pass, and
 * only running both would show it.
 */

const COPY = "Follow the build →";

test("E754 — the banner link is on the PUBLIC site", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: COPY });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "https://status.panameer.com");
  await expect(link).toHaveAttribute("target", "_blank");
  /* ⚠ A new tab must not carry the referrer of a page the tester is mid-walk on. */
  await expect(link).toHaveAttribute("rel", /noreferrer/);
});

test("E754 — the banner link is in the APP, and Dismiss still works", async ({ page }) => {
  const { email, password } = adminAccount();
  await signInAs(page, email, password);
  await page.goto("/dashboard");

  const link = page.getByRole("link", { name: COPY });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "https://status.panameer.com");

  /* ⚠⚠ DISMISS IS UNCHANGED — the brief says so, and a link added beside a
     control is exactly the kind of change that quietly breaks the control. */
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByRole("link", { name: COPY })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dismiss" })).toHaveCount(0);
});

test("E754 — the copy is exactly as Scott wrote it, arrow included", async ({ page }) => {
  await page.goto("/");
  /* ⚠ `exact` matters: "Follow the build" without the arrow would pass a loose
     matcher, and the arrow is part of the string by decision, not decoration. */
  const text = await page.getByRole("link", { name: COPY }).innerText();
  expect(text.trim()).toBe(COPY);
});
