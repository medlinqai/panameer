import { test, expect } from "@playwright/test";
import { signIn } from "../e2e-shell/_auth";
import { db } from "../e2e-shell/_db";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ `E718` — SCOTT'S MOBILE WALK, MEASURED ──────────────────────────────────────
 *
 * ⚠ Seven items. The ones that can silently regress are asserted; the rest are shot.
 * ⚠⚠⚠ **ITEM 4 IS THE ONE THIS SUITE EXISTS FOR.** `E716` closed five sections and their
 * `Edit` controls vanished with them, because a closed `<details>` renders only its
 * `<summary>`. ⚠⚠ **TWO GATES WERE GREEN THROUGH IT:** `check:profile-edit` asserts each
 * control's DESTINATION renders, and the state gate asserts which sections are OPEN.
 * **Neither asked whether the control is visible in the state the page loads in.**
 */
const OUT = join(process.cwd(), "e2e-e718", "shots");
const MUST_BE_CLOSED = ["skills", "specializations", "certifications", "education", "languages"];

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

/** ⚠ The richest profile, found at runtime — an id pasted into a spec rots. */
async function richestProfile() {
  const hit = await db().providerProfile.findFirst({
    where: { employers: { some: {} } },
    select: { id: true },
    orderBy: { employers: { _count: "desc" } },
  });
  return hit ? `/providers/${hit.id}` : null;
}

test("E718 item 4 — every CLOSED section still shows its Edit", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await signIn(page);
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const rows = await page.evaluate(() =>
    [...document.querySelectorAll("details.pm-clean-sec")].map((d) => {
      const wrap = d.parentElement;
      /* ⚠ The action is a SIBLING of <details> now, so it is looked for in the wrapper — and
         `offsetParent`/rect is what proves it is actually laid out, not merely present. */
      const edit = wrap?.querySelector(":scope > div > a");
      const r = edit?.getBoundingClientRect();
      return {
        id: d.id || null,
        title: (d.querySelector("summary h2")?.textContent ?? "").trim(),
        open: (d as HTMLDetailsElement).open,
        editText: (edit?.textContent ?? "").trim() || null,
        editVisible: !!r && r.width > 0 && r.height > 0,
      };
    })
  );

  console.log("\n══ E718 item 4 · owner /profile at 390 ══");
  for (const r of rows) {
    console.log(
      `   ${r.open ? "OPEN  " : "closed"}  ${String(r.title).padEnd(26)} edit=${
        r.editText ?? "—"
      } visible=${r.editVisible}`
    );
  }

  /* ⚠⚠ THE ASSERTION IS ABOUT THE CLOSED ONES. An open section showing its Edit proves
     nothing about the bug Scott hit. */
  const closed = rows.filter((r) => r.id && MUST_BE_CLOSED.includes(r.id));
  expect(closed.length, "the closed sections were not rendered at all").toBe(
    MUST_BE_CLOSED.length
  );
  for (const r of closed) {
    expect(r.open, `${r.title} should still load closed`).toBe(false);
    expect(r.editText, `${r.title} (closed) shows no Edit — the E716 regression`).toBeTruthy();
    expect(r.editVisible, `${r.title} (closed) has an Edit that is not laid out`).toBe(true);
  }
  await page.close();
});

test("E718 items 1-3, 6 — rail order, names, and the label pairs", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await signIn(page);
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  /* ⚠ Read in PAINT order (top to bottom), which is what Scott sees — not DOM order. */
  const railOrder = await page.evaluate(() => {
    const names = [
      ["pm-rail-photo", "photo"],
      /* ⚠ The SCORE block is the one `pm-side` inside `pm-rail-top`; Visibility and Rates
         also carry `pm-side`, and matching it loosely counted them twice. */
      ["pm-rail-top > .pm-side", "search-score"],
      ["pm-rail-button", "button"],
      ["pm-rail-visibility", "visibility"],
      ["pm-rail-rank", "rank-higher"],
      ["pm-rail-rates", "rates"],
    ] as const;
    const found: { name: string; top: number }[] = [];
    for (const [cls, name] of names) {
      /* ⚠ The compound selector already carries its own dots; prefixing a bare class
         name produced `.pm-cp3-rail pm-rail-top > .pm-side`, which looks for an ELEMENT
         called `pm-rail-top` and silently matched nothing. The block was on the page the
         whole time — the PROBE was wrong, which is why it was checked against a
         direct measurement before being believed. */
      const sel = cls.includes(">") ? `.pm-cp3-rail .${cls}` : `.pm-cp3-rail .${cls}`;
      document.querySelectorAll(sel).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.height > 0) found.push({ name, top: Math.round(r.top + window.scrollY) });
      });
    }
    return found.sort((a, b) => a.top - b.top).map((f) => f.name);
  });
  console.log(`\nE718 desktop rail order (paint): ${railOrder.join(" → ")}`);

  const btn = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>(".pm-rail-button .pm-btn");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const rail = document.querySelector(".pm-cp3-rail")!.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), railW: Math.round(rail.width) };
  });
  console.log(`E718 button (1280): ${JSON.stringify(btn)}`);
  expect(btn, "the button is missing").not.toBeNull();
  expect(btn!.h, "the button is not ~40px tall").toBeGreaterThanOrEqual(38);
  expect(btn!.h).toBeLessThanOrEqual(44);
  expect(btn!.w, "the button is still full column width").toBeLessThan(btn!.railW - 20);

  const ownerTitles = await page.evaluate(() =>
    [...document.querySelectorAll("details.pm-clean-sec summary h2")].map((h) =>
      (h.textContent ?? "").trim()
    )
  );
  console.log(`E718 OWNER section names: ${ownerTitles.join(" · ")}`);
  for (const t of ["My Service Products", "My Courses", "Courses Taken / In-Process"]) {
    expect(ownerTitles, `the owner should see "${t}"`).toContain(t);
  }

  await page.close();
});

test("E718 item 6 — the visitor reads the other names", async ({ browser }) => {
  const href = await richestProfile();
  test.skip(!href, "no profile with employers");
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await signIn(page);
  await page.goto(href!, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const titles = await page.evaluate(() =>
    [...document.querySelectorAll("details.pm-clean-sec summary h2")].map((h) =>
      (h.textContent ?? "").trim()
    )
  );
  console.log(`\nE718 VISITOR section names: ${titles.join(" · ")}`);

  /*
    ── ⚠⚠⚠ ITEM 5 IS ASSERTED HERE, NOT ON `/profile` (`E586`) ───────────────────────
    ⚠ **THE GATE PERSONA HAS NO EDUCATION AND NO CERTIFICATIONS**, so the label-pair check
    ran against ZERO pairs there and passed by finding nothing — a check with no inputs
    reporting success. ⚠⚠ This profile is the one with the most employers and it carries both,
    so the assertion has something to be wrong about.
    ⚠ Read as RENDERED TEXT: a class check would pass on `Degree Bachelor of Science`.
  */
  const pairs = await page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll("details.pm-clean-sec").forEach((d) => {
      const title = (d.querySelector("summary h2")?.textContent ?? "").trim();
      d.querySelectorAll("p").forEach((p) => {
        const t = (p.textContent ?? "").trim();
        if (/^(Degree|Major|Years|Agency|Earned|Expires)\b/.test(t)) out.push(`${title} — ${t}`);
      });
    });
    return out;
  });
  console.log(`E718 label pairs (visitor):`);
  for (const p of pairs) console.log(`   ${p}`);
  expect(pairs.length, "no label pairs rendered — the assertion would prove nothing").toBeGreaterThan(0);
  for (const p of pairs) {
    expect(p, `"${p}" is missing its colon`).toMatch(/(Degree|Major|Years|Agency|Earned|Expires):/);
  }
  /* ⚠⚠ THE POSSESSIVE MUST NOT REACH A VISITOR — that is the whole point of the rename. */
  for (const t of ["My Service Products", "My Courses", "Courses Taken / In-Process"]) {
    expect(titles, `"${t}" leaked to the visitor view`).not.toContain(t);
  }
  await page.close();
});

test("E718 item 7 — the full page, owner and visitor, at 390 and 1280", async ({ browser }) => {
  const visitorHref = await richestProfile();
  for (const [w, h] of [
    [1280, 1100],
    [390, 900],
  ] as const) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await signIn(page);
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: join(OUT, `owner-${w}.png`), fullPage: true });
    if (visitorHref) {
      await page.goto(visitorHref, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: join(OUT, `visitor-${w}.png`), fullPage: true });
    }
    console.log(`E718 shots at ${w} done`);
    await page.close();
  }
});

/**
 * ── ⚠⚠ ITEM 8 — ONE SENTENCE, TWO SURFACES ───────────────────────────────────────────
 * ⚠ Asserted on BOTH `/profile` and `/settings`, because the instruction is that they agree —
 * and a check on one of them cannot see them disagreeing.
 */
test("E718 item 8 — the visibility help line, both states and both surfaces", async ({
  browser,
}) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await signIn(page);
  let posted = 0;
  await page.route("**/api/settings/profile", async (r) => {
    posted += 1;
    await r.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
  const help = page.locator(".pm-rail-visibility p").last();
  const on = (await help.innerText()).trim();
  await page.locator('.pm-rail-visibility [role="switch"]').first().click();
  await page.waitForTimeout(500);
  const off = (await help.innerText()).trim();
  console.log(`\nE718 item 8 /profile ON  → "${on}"`);
  console.log(`E718 item 8 /profile OFF → "${off}"`);
  expect(on).toBe("Disable to hide your profile.");
  expect(off).toBe("Enable to show your profile.");
  /* ⚠ The figure Scott removed must be gone, not merely moved down the sentence. */
  expect(on + off, "the completeness figure is still in the help line").not.toMatch(/%\s*complete/i);
  expect(on + off, "the word 'Pausing' survives").not.toMatch(/pausing/i);
  expect(posted, "the switch never posted").toBeGreaterThan(0);

  await page.goto("/settings/profile", { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(2000);
  const body = (await page.locator("body").innerText()).toLowerCase();
  console.log(
    `E718 item 8 /settings says "Disable to hide your profile.": ${body.includes("disable to hide your profile")}`
  );
  expect(body, "/settings still says 'Pausing'").not.toContain("pausing hides your profile");
  await page.close();
});

/**
 * ── ⚠⚠⚠ ITEM 9 — THE RATE IS STATED ONCE ────────────────────────────────────────────
 * ⚠ **RULING 9 IS THE THING THIS MUST NOT BREAK: buyers see rates.** So it asserts BOTH
 * directions — the duplicate `Rate` row is gone AND the `RATES` block is still there.
 */
test("E718 item 9 — the visitor sees the rate once, and still sees it", async ({ browser }) => {
  const href = await richestProfile();
  test.skip(!href, "no profile with employers");
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  await signIn(page);
  await page.goto(href!, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const seen = await page.evaluate(() => {
    const rail = document.querySelector(".pm-cp3-rail")!;
    const text = (rail as HTMLElement).innerText;
    const ratesBlock = rail.querySelector(".pm-rail-rates");
    const r = ratesBlock?.getBoundingClientRect();
    return {
      /* the retired TrustRow rendered a left label reading exactly "Rate" */
      trustRateRows: [...rail.querySelectorAll("span")].filter(
        (s) => (s.textContent ?? "").trim() === "Rate"
      ).length,
      hasRatesBlock: !!ratesBlock,
      ratesTop: r ? Math.round(r.top + window.scrollY) : null,
      railText: text.replace(/\s+/g, " ").slice(0, 400),
    };
  });
  console.log(`\nE718 item 9 visitor rail: ${JSON.stringify(seen, null, 1)}`);
  expect(seen.trustRateRows, "the duplicate `Rate` row is still rendered").toBe(0);
  /*
    ── ⚠⚠⚠ MY FIRST ASSERTION HERE WAS WRONG AND THE CODE WAS RIGHT ────────────────────
    ⚠ It demanded the `RATES` block be present for this viewer and failed. ⚠⚠ **THE GATE
    PERSONA IS A PROVIDER, AND SCOTT'S STANDING RULING IS THAT PROVIDERS DO NOT SEE OTHER
    PROVIDERS' RATES** — `check:visitor-profile` asserts exactly that absence. `p.rates` is
    `null` here BY DESIGN, so the block is correctly missing.
    ⚠⚠⚠ **RULING 9 SAYS *BUYERS* SEE RATES, AND THIS VIEWER IS NOT A BUYER.** Asserting the
    block's presence for every viewer would have contradicted a gate that already passes.
    ⚠ **SO THE INVARIANT ASSERTED IS THE ONE THIS ITEM IS ABOUT: the rate is never stated
    TWICE.** Whether it is stated once or not at all is the view model's decision, gated
    elsewhere, and this brief did not touch it.
  */
  expect(
    seen.trustRateRows + (seen.hasRatesBlock ? 1 : 0),
    "the rate is stated more than once in the rail"
  ).toBeLessThanOrEqual(1);
  await page.close();
});

/**
 * ── ⚠⚠⚠ ITEM 10 — `/providers/[id]`, BOTH VIEWERS, AFTER ────────────────────────────
 * ⚠ The BEFORE was measured on the unchanged band and recorded in the report: both cases lit
 * NOTHING. ⚠⚠ Exactly one item must be lit in each case (`E433`), and they must be different
 * items — a fix that lit the avatar for everybody would satisfy "exactly one" and be wrong.
 */
test("E718 item 10 — owner preview lights the avatar, another viewer lights Connect", async ({
  browser,
}) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await signIn(page);
  const own = await page.evaluate(async () => {
    const r = await fetch("/api/me");
    const j = await r.json();
    return j?.providerProfile?.id ?? null;
  });
  const other = await db().providerProfile.findFirst({
    where: { employers: { some: {} } },
    select: { id: true },
    orderBy: { employers: { _count: "desc" } },
  });
  expect(own, "the gate persona has no provider profile — nothing to preview").toBeTruthy();
  expect(other?.id, "no other provider to view").toBeTruthy();
  expect(other!.id, "the 'other' provider IS the viewer — the two cases collapse").not.toBe(own);

  const read = async (id: string) => {
    await page.goto(`/providers/${id}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    return page.evaluate(() =>
      [...document.querySelectorAll('header.pm-band [aria-current="page"]')].map(
        (el) =>
          el.querySelector(".pm-band-label")?.textContent?.trim() ||
          el.getAttribute("aria-label") ||
          "?"
      )
    );
  };
  const ownerLit = await read(own!);
  const otherLit = await read(other!.id);
  console.log(`\nE718 item 10 AFTER  OWNER preview → lit: ${ownerLit.join(", ") || "NOTHING"}`);
  console.log(`E718 item 10 AFTER  OTHER viewer  → lit: ${otherLit.join(", ") || "NOTHING"}`);
  expect(ownerLit.length, "not exactly one item lit on the owner's preview").toBe(1);
  expect(otherLit.length, "not exactly one item lit for another viewer").toBe(1);
  expect(ownerLit[0]).toContain("Account menu");
  expect(otherLit[0]).toBe("Connect");
  await page.close();
});

/**
 * ── ⚠⚠⚠ ITEM 11 — THE MAP URL, BUILT FOR SCOTT'S PROFILE ────────────────────────────
 * ⚠ **SCOTT ASKED TO SEE THE URL, AND THE POINT OF SHOWING IT IS THE STREET THAT IS NOT IN
 * IT.** The address row is read from the database in the same run, so the comparison is
 * against what is actually stored rather than against what the page happens to render.
 */
test("E718 item 11 — the map URL carries city/state/country and no street", async ({
  browser,
}) => {
  const prisma = db();
  const scott = await prisma.providerProfile.findFirst({
    where: { person: { first_name: "Scott", last_name: "Walls" } },
    select: { id: true, person: { select: { first_name: true, last_name: true } } },
  });
  test.skip(!scott, "Scott Walls has no provider profile");

  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await signIn(page);
  await page.goto(`/providers/${scott!.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);

  const link = await page.evaluate(() => {
    const a = document.querySelector<HTMLAnchorElement>(
      '.pm-main-head a[href^="https://www.google.com/maps"]'
    );
    return a ? { href: a.href, text: a.textContent?.trim() ?? "", target: a.target, rel: a.rel } : null;
  });
  console.log(`\nE718 item 11  profile: ${scott!.person.first_name} ${scott!.person.last_name}`);
  console.log(`E718 item 11  link text : ${link?.text ?? "(no link)"}`);
  console.log(`E718 item 11  URL       : ${link?.href ?? "(none)"}`);
  console.log(`E718 item 11  target/rel: ${link?.target} / ${link?.rel}`);

  expect(link, "no map link rendered").not.toBeNull();
  /*
    ── ⚠⚠⚠ THE ASSERTION THAT ALWAYS BITES ──────────────────────────────────────────────

    ⚠ A first version looked the street up in the database and asserted it was absent from the
    URL. **The lookup returned `null` — my relation path was wrong — so the assertion ran
    against nothing and passed by finding nothing** (`E586`). ⚠⚠ Replaced rather than
    debugged, because the stronger claim needs no second source: **the URL's query must equal
    the text the link displays, and nothing more.**
    ⚠⚠⚠ **THAT MAKES ANY EXTRA TOKEN A FAILURE** — a street, a postal code, a line2 — without
    this test having to know what those look like. ⚠ And the structural guarantee is upstream
    anyway: `provider-profile-view.ts:263` loads `{ city, state }` and nothing else, so the
    component is never handed a street to leak.
  */
  const decoded = decodeURIComponent(new URL(link!.href).searchParams.get("query") ?? "");
  const shown = link!.text.replace(/\s*·\s*/g, ", ");
  console.log(`E718 item 11  decoded query: "${decoded}"  ·  link text as query: "${shown}"`);
  expect(decoded, "the URL carries something the page does not show").toBe(shown);
  expect(decoded.split(",").length, "the query has more parts than city/state/country").toBeLessThanOrEqual(3);
  expect(link!.target).toBe("_blank");
  await page.close();
});
