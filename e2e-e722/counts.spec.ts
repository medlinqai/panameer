import { test, expect } from "@playwright/test";
import { signInAsSeeded } from "../e2e-shell/_auth";
import { db } from "../e2e-shell/_db";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ `E722` — THE COUNT BESIDE EVERY SECTION TITLE ───────────────────────────────────
 *
 * ⚠ **SCOTT: *"The number must come from the same list the section renders (`E585`), not a
 * separate count, so it can't disagree with what's inside."***
 *
 * ⚠⚠⚠ **SO THE ASSERTION IS NOT "A NUMBER IS PRESENT" — IT IS "THE NUMBER EQUALS THE ROWS
 * ACTUALLY IN THE DOM".** A source-level check that `count={x.length}` is passed would pass
 * on a body that renders a capped or filtered subset of `x`, which is exactly the
 * disagreement the item forbids. **This measures the rendered page.**
 *
 * ⚠⚠ **`[data-row]` IS AN INERT ATTRIBUTE ON THE ELEMENT THAT REPEATS ONCE PER COUNTED ITEM.**
 * It carries no styling, so the shared `/join/provider` bodies are unaffected.
 * ⚠⚠⚠ **ONLY TOP-LEVEL ROWS COUNT** — a `ProjectCard` is a row of Solo Projects **and** is
 * nested inside a Work History employer, so a naive `querySelectorAll` would inflate Work
 * History by every project hanging off it. Rows with a `[data-row]` ancestor are skipped.
 */
const OUT = join(process.cwd(), "e2e-e722", "shots");
/** ⚠ Linus teaches 3 paths and holds skills, specs, certs, education and languages. */
const OWNER = "SW_user2@straterp.com";

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

const readSections = () =>
  [...document.querySelectorAll<HTMLDetailsElement>("details.pm-clean-sec")].map((d) => {
    const h2 = d.querySelector("h2")!;
    const badge = h2.querySelector<HTMLElement>("[data-count]");
    const body = d.querySelector(":scope > div.pb-7");
    /* ⚠⚠ TOP-LEVEL ONLY — see the header. */
    const rows = body
      ? [...body.querySelectorAll<HTMLElement>("[data-row]")].filter(
          (el) => el.parentElement?.closest("[data-row]") == null
        ).length
      : 0;
    const titleText = (h2.childNodes[0]?.textContent ?? "").trim();
    const cs = badge ? getComputedStyle(badge) : null;
    const hs = getComputedStyle(h2);
    return {
      title: titleText,
      printed: badge ? Number((badge.textContent ?? "").replace(/[()]/g, "")) : null,
      rows,
      /* ⚠ The whole heading string, so "one space after it" is checkable as written. */
      heading: (h2.textContent ?? "").replace(/ /g, " "),
      colour: cs?.color ?? null,
      size: cs ? parseFloat(cs.fontSize) : null,
      weight: cs?.fontWeight ?? null,
      titleColour: hs.color,
      titleSize: parseFloat(hs.fontSize),
      open: d.open,
    };
  });

async function walk(page: import("@playwright/test").Page, label: string, shot: string) {
  await page.waitForTimeout(2200);
  /* ⚠ The five closed sections must be opened to count their rows. ⚠⚠ THE COUNT ITSELF IS IN
     THE `<summary>`, so it is visible while closed — asserted below. */
  const closedFirst = await page.evaluate(readSections);
  await page.evaluate(() =>
    document.querySelectorAll<HTMLDetailsElement>("details.pm-clean-sec").forEach((d) => (d.open = true))
  );
  await page.waitForTimeout(500);
  const all = await page.evaluate(readSections);

  console.log(`\n══════ ${label} ══════`);
  for (const s of all) {
    const ok = s.printed === s.rows ? "✓" : "✗";
    console.log(`  ${ok} ${s.title.padEnd(28)} printed=${String(s.printed).padStart(3)}  rows=${String(s.rows).padStart(3)}   "${s.heading}"`);
  }
  await page.screenshot({ path: join(OUT, shot), fullPage: true });

  /* ⚠⚠⚠ THE ITEM ITSELF. */
  for (const s of all) {
    expect(s.printed, `${s.title} has no count beside its title`).not.toBeNull();
    expect(
      s.printed,
      `${s.title}: the heading says (${s.printed}) and the section renders ${s.rows} rows`
    ).toBe(s.rows);
  }
  /* ⚠ Scott: grey · a step smaller than the title · one space after it. */
  for (const s of all) {
    expect(s.size!, `${s.title}: the count is not smaller than the title`).toBeLessThan(s.titleSize);
    expect(s.colour, `${s.title}: the count is the title's colour, not grey`).not.toBe(s.titleColour);
    expect(s.weight, `${s.title}: the count inherited the title's weight`).toBe("400");
    expect(s.heading, `${s.title}: not exactly one space before the count`).toMatch(
      new RegExp(`^${s.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\(\\d+\\)$`)
    );
  }
  /* ⚠⚠ AND IT IS READABLE WITH THE SECTION SHUT — the five that load closed still show it. */
  const shut = closedFirst.filter((s) => !s.open);
  console.log(`  sections closed at load: ${shut.length} — all carry their count: ${shut.every((s) => s.printed !== null)}`);
  expect(shut.every((s) => s.printed !== null), "a closed section hides its count").toBe(true);

  return all;
}

test("E722 — owner: every section's count equals the rows it renders", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
  await signInAsSeeded(page, OWNER);
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  const all = await walk(page, "OWNER · /profile", "owner-1280.png");

  /* ⚠⚠ `Bio` MUST NOT CARRY ONE. ⚠⚠⚠ IT NEEDS NO CODE: `Bio` IS NOT A `CleanSection` AT ALL
     — it is a plain `<div id="bio">` in the identity block, and the section version of it is
     an `E164` comment corpse. This asserts that, so a future brief that turns Bio into a
     section is told about this rule rather than discovering it. */
  const bioIsASection = all.some((s) => s.title === "Bio");
  const bioDiv = await page.locator("#bio").count();
  console.log(`\n  Bio: rendered as a CleanSection? ${bioIsASection} · #bio element present? ${bioDiv > 0}`);
  expect(bioIsASection, "Bio became a CleanSection and would now take a count").toBe(false);

  /* ⚠ Scott: "Owner sees (0)." */
  const zeros = all.filter((s) => s.printed === 0).map((s) => s.title);
  console.log(`  sections showing (0) to the owner: ${zeros.length} → ${zeros.join(", ") || "none"}`);
  expect(zeros.length, "no section showed (0) — the owner's empty case is unproven here").toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 1400 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, "owner-390.png"), fullPage: true });
  await page.close();
});

test("E722 — visitor: same invariant on /providers/[id]", async ({ browser }) => {
  /* ⚠ The richest visitor-visible profile, resolved at runtime: most solo projects. */
  const solo = await db().project.groupBy({
    by: ["provider_profile_id"],
    where: { employer_id: null },
    _count: { _all: true },
    orderBy: { _count: { id: "desc" } },
    take: 1,
  });
  const pid = solo[0]!.provider_profile_id;

  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
  await signInAsSeeded(page, OWNER);
  await page.goto(`/providers/${pid}`, { waitUntil: "domcontentloaded" });
  const all = await walk(page, `VISITOR · /providers/${pid.slice(0, 8)}…`, "visitor-1280.png");

  /* ⚠⚠⚠ A VISITOR NEVER SEES `(0)` — an empty section does not render for them at all. THIS
     IS THE COMPLEMENT OF THE OWNER ASSERTION and is what proves the two views differ. */
  const zeros = all.filter((s) => s.printed === 0).map((s) => s.title);
  console.log(`  sections showing (0) to a visitor: ${zeros.length} → ${zeros.join(", ") || "none"}`);
  expect(zeros, "a visitor was shown an empty section").toEqual([]);

  await page.setViewportSize({ width: 390, height: 1400 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, "visitor-390.png"), fullPage: true });
  await page.close();
});
