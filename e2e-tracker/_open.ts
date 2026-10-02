import type { Page } from "@playwright/test";

/**
 * ── ⚠⚠ OPENING WHAT `P2-ALL-E768` COLLAPSED ────────────────────────────────
 *
 * ⚠ The tracker admin's sections and stages became expanders because Scott could
 * not find a way to add data to them. ⚠⚠⚠ **THE RULES THESE SPECS ASSERT DID NOT
 * CHANGE — only the path to the elements did.** That distinction is the whole
 * point: five tests went red on a correct page, and the honest repair is to
 * navigate, not to weaken an assertion (ruling 14 — when the code a rule names
 * moves, the rule may not).
 *
 * ⚠ Idempotent: each one opens only if it is closed, so a spec can call it
 * without knowing the default.
 */
export async function openSection(page: Page, title: string) {
  const b = page.getByRole("button", { name: new RegExp("^" + title + " \\(\\d+\\)$", "i") });
  if ((await b.count()) === 0) return;
  if ((await b.first().getAttribute("aria-expanded")) === "false") await b.first().click();
}

/** ⚠ A phase row, by name. The chevron is `aria-hidden`, so the name is clean. */
export async function openPhase(page: Page, name: string) {
  await openSection(page, "Phases");
  const b = page.getByRole("button", { name, exact: true });
  if ((await b.count()) === 0) return;
  if ((await b.first().getAttribute("aria-expanded")) === "false") await b.first().click();
}

/** ⚠ A stage inside an already-open phase. */
export async function openStage(page: Page, name: string) {
  const b = page.locator("button[aria-expanded]").filter({ hasText: name }).first();
  if ((await b.count()) === 0) return;
  if ((await b.getAttribute("aria-expanded")) === "false") await b.click();
}
