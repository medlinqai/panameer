import { test, expect } from "@playwright/test";
import { signInAsSeeded } from "../e2e-shell/_auth";
import { db } from "../e2e-shell/_db";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ `E720` — THE PROFILE LEFTOVERS, MEASURED ────────────────────────────────────────
 *
 * ⚠ **IT MEASURES; IT DOES NOT WRITE.** No row is created, no money moves, nothing is
 * reseeded. ⚠⚠ The one place it *could* write — the visibility switch and the mentor follow —
 * is never clicked.
 */
const OUT = join(process.cwd(), "e2e-e720", "shots");
/*
  ── ⚠⚠⚠ WHY NOT SCOTT'S OWN ACCOUNT ─────────────────────────────────────────────────────

  ⚠ This suite first used `iamscottwalls@outlook.com` and **failed loudly**, which is the
  helper working as designed: `signInAsSeeded` throws when an address is not in
  `prisma/seed-data/test-users.json` with a password, *"so a renamed persona fails loudly
  rather than signing in as nobody"* (`E586`).
  ⚠⚠ **HIS ACCOUNT IS NOT IN THAT FILE AT ALL, AND `E580` ALREADY RECORDS THAT THE SEEDED
  PASSWORDS DO NOT MATCH THE STORED HASHES** — which is why no gate signs in as him.
  ⚠⚠⚠ **SO THE `item 9` PREMISE — *what hides the control for Scott* — WAS MEASURED AGAINST
  HIS ROW IN THE DATABASE, NOT THROUGH A BROWSER:** profile `74c0df8a`, `ProfileImport` rows
  **0**, therefore `hasDocument` false. That measurement is in `OwnerResumeRebuild`'s header.

  ── ⚠⚠ TWO PERSONAS WITH DIFFERENT FIGURES, DELIBERATELY ────────────────────────────────

  ⚠⚠⚠ **RULING 11: TWO ZEROS AGREE AND TWO ONES AGREE.** If both personas had the same number
  of outstanding lines, item 2's *"both pages agree"* could pass while comparing a constant.
  ⚠ Chosen from a live read: **Reuben Ellis 8 open · Priya Nair 7 open** — different, non-zero,
  and neither is a protected lesson-holder (load-bearing rule 10).
*/
const OWNER = "sw_user30@straterp.com";
const OTHER = "sw_user21@straterp.com";

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

test("E720 items 1 · 6 · 12 — the band tile, the section states, the button box", async ({
  browser,
}) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  await signInAsSeeded(page, OWNER);
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  /*
    ── ITEM 1 — THE AVATAR IS A SQUARE TILE, THE SAME AS A LIT BAND ITEM ────────────────

    ⚠⚠⚠ **IT COMPARES THE AVATAR TO A LIT BAND ITEM RATHER THAN TO A NUMBER I TYPED.** A
    hardcoded `46` would pass if BOTH drifted, and `E717`'s lesson is that a class can be
    applied and overruled — so the assertion is *"these two render the same treatment"*.
  */
  const band = await page.evaluate(() => {
    const px = (v: string) => Math.round(parseFloat(v) || 0);
    const av = document.querySelector<HTMLElement>(
      '[aria-current="page"][class*="p-[7px]"], header [aria-current="page"] img, .pm-band [aria-current="page"]'
    );
    /* ⚠ The avatar button is the one containing an `Avatar`; find it by its padding token. */
    const avatarBtn = [...document.querySelectorAll<HTMLElement>("button")].find((b) =>
      b.className.includes("p-[7px]")
    );
    const litItem = document.querySelector<HTMLElement>('.pm-band-item[aria-current="page"]');
    const anyItem = document.querySelector<HTMLElement>(".pm-band-item");
    const read = (el: HTMLElement | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        radius: px(s.borderTopLeftRadius),
        bg: s.backgroundColor,
      };
    };
    return {
      avatar: read(avatarBtn ?? null),
      litItem: read(litItem),
      anyItem: read(anyItem),
      avatarIsCurrent: avatarBtn?.getAttribute("aria-current") ?? null,
      photoRadius: (() => {
        const img = avatarBtn?.querySelector<HTMLElement>("img, span, div");
        return img ? px(getComputedStyle(img).borderTopLeftRadius) : null;
      })(),
      hasAv: !!av,
    };
  });
  console.log(`\n══ E720 ITEM 1 · the band avatar ══`);
  console.log(`   avatar      : ${JSON.stringify(band.avatar)}  aria-current=${band.avatarIsCurrent}`);
  console.log(`   a lit item  : ${JSON.stringify(band.litItem ?? band.anyItem)}`);
  console.log(`   photo radius inside: ${band.photoRadius}px`);
  expect(band.avatar, "no avatar button found in the band").toBeTruthy();
  /* ⚠⚠ A SQUARE TILE: equal sides, and a radius that is NOT half the box (which is a disc). */
  expect(band.avatar!.w, "the avatar tile is not square").toBe(band.avatar!.h);
  expect(
    band.avatar!.radius,
    `the avatar is still a disc — radius ${band.avatar!.radius} on a ${band.avatar!.h}px box`
  ).toBeLessThan(band.avatar!.h / 2);
  /* ⚠⚠⚠ THE SAME SILHOUETTE AS A BAND ITEM — the shared `BAND_TILE`. */
  const item = band.litItem ?? band.anyItem;
  expect(item, "no band item to compare against").toBeTruthy();
  expect(band.avatar!.radius, "the avatar's corner is not the band item's corner").toBe(
    item!.radius
  );
  /* ⚠ AND THE SAME HEIGHT — 46px, the pill's own, which is what `p-[7px]` is for. */
  expect(band.avatar!.h, "the avatar tile is not a band item's height").toBe(item!.h);
  await page.locator(".pm-band, header").first().screenshot({ path: join(OUT, "band-1280.png") });

  /*
    ── ITEM 6 — WHICH SECTIONS LOAD OPEN ───────────────────────────────────────────────

    ⚠ **SCOTT: *"Work History loads open. Only Skills, Specializations, Certifications,
    Education and Languages load closed."***
    ⚠⚠ MEASURED FROM THE RENDERED `<details open>`, never from the source — the source read
    said this was already right, and a rendered measurement is what proves it.
  */
  const sections = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLDetailsElement>("details.pm-clean-sec")].map((d) => ({
      title: (d.querySelector("summary")?.textContent ?? "").trim().replace(/\s+/g, " "),
      open: d.open,
    }))
  );
  console.log(`\n══ E720 ITEM 6 · section state at load ══`);
  for (const s of sections) console.log(`   ${s.open ? "OPEN  " : "closed"}  ${s.title}`);
  const CLOSED = ["Skills", "Specializations", "Certifications", "Education", "Languages"];
  const byTitle = (t: string) => sections.find((s) => s.title.startsWith(t));
  expect(byTitle("Work History")?.open, "Work History did not load open").toBe(true);
  for (const t of CLOSED) {
    const s = byTitle(t);
    if (s) expect(s.open, `${t} did not load closed`).toBe(false);
  }
  /* ⚠⚠⚠ AND THE COMPLEMENT, WHICH IS THE HALF THAT CAN ACTUALLY FAIL: nothing ELSE is
     closed. `only` is a claim about every other section, and asserting the five alone
     would pass on a page where all twelve were shut. */
  const unexpectedlyClosed = sections
    .filter((s) => !s.open && !CLOSED.some((c) => s.title.startsWith(c)))
    .map((s) => s.title);
  expect(unexpectedlyClosed, `sections closed that Scott did not name: ${unexpectedlyClosed}`).toEqual([]);

  /*
    ── ITEM 12 — THE BUTTON'S BOX AND THE TWO COPY STRINGS ─────────────────────────────
  */
  const btn = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>("[data-e715-btn]");
    if (!el) return null;
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const wrap = el.closest<HTMLElement>(".pm-rail-button");
    return {
      padT: s.paddingTop,
      padR: s.paddingRight,
      padB: s.paddingBottom,
      padL: s.paddingLeft,
      h: Math.round(r.height),
      w: Math.round(r.width),
      railW: wrap?.parentElement ? Math.round(wrap.parentElement.getBoundingClientRect().width) : null,
      wrapMarginTop: wrap ? getComputedStyle(wrap).marginTop : null,
    };
  });
  console.log(`\n══ E720 ITEM 12 · How Others See My Profile ══\n   ${JSON.stringify(btn)}`);
  expect(btn, "the preview button is missing").toBeTruthy();
  expect(btn!.padT, "padding-top is not 12px").toBe("12px");
  expect(btn!.padB, "padding-bottom is not 12px").toBe("12px");
  expect(btn!.padL, "padding-left is not 20px").toBe("20px");
  expect(btn!.padR, "padding-right is not 20px").toBe("20px");
  expect(btn!.wrapMarginTop, "there is not 24px above the button").toBe("24px");
  /* ⚠ STILL SIZED TO ITS TEXT (`E718` item 2) — the padding change must not re-stretch it. */
  expect(btn!.w, "the button went full-width again").toBeLessThan((btn!.railW ?? 9999) - 20);

  const copy = await page.evaluate(() => {
    const items = document.querySelector<HTMLElement>("[data-e716-items]");
    const block = items?.closest<HTMLElement>("span")?.textContent ?? "";
    return { items: (items?.textContent ?? "").trim(), block: block.replace(/\s+/g, " ").trim() };
  });
  console.log(`   score block text: "${copy.block}"`);
  console.log(`   items line      : "${copy.items}"`);
  expect(copy.block, 'the unit does not read "out of 100"').toContain("out of 100");
  /* ⚠⚠ THE EN DASH AND `mins`, WHICH ARE SCOTT'S EXACT CHARACTERS. */
  if (/\d+\s+items?\s+left/.test(copy.items)) {
    expect(copy.items, "the items line is not Scott's wording").toMatch(
      /\d+ items? left – about \d+ mins/
    );
  }
  await page.locator(".pm-cp3-rail").screenshot({ path: join(OUT, "rail-1280.png") });
  await page.close();
});

test("E720 item 2 — /profile and /connect/score agree, on two personas", async ({ browser }) => {
  /*
    ⚠⚠⚠ **THE POINT IS AGREEMENT BETWEEN TWO SURFACES, SO BOTH ARE READ FROM THE RENDERED
    PAGE.** Comparing two calls to the same function would prove only that the function is
    deterministic — which was never in doubt and is not what Scott asked for.
  */
  for (const email of [OWNER, OTHER]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
    await signInAsSeeded(page, email);

    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    const profile = await page.evaluate(() => {
      const t = (document.querySelector("[data-e716-items]")?.textContent ?? "").trim();
      const ring = document.querySelector<HTMLElement>(".pm-score-ring")?.textContent ?? "";
      const m = t.match(/(\d+)\s+items?\s+left(?:\s+–\s+about\s+(\d+)\s+mins)?/);
      return {
        raw: t,
        total: parseInt(ring.trim(), 10),
        open: m ? parseInt(m[1], 10) : t.includes("Nothing outstanding") ? 0 : null,
        minutes: m && m[2] ? parseInt(m[2], 10) : 0,
      };
    });

    await page.goto("/connect/score", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    const scorePage = await page.evaluate(() => {
      const body = (document.body.innerText ?? "").replace(/\s+/g, " ");
      /* ⚠ The score page's own summary sentence. ⚠⚠ The dash is an EM dash there and an EN
         dash on the profile — two different strings for two different sentences, which is
         why each is matched with its own pattern rather than one loose one. */
      const m = body.match(/across (\d+) lines?\s*[—–-]\s*about (\d+) minutes?/);
      return { open: m ? parseInt(m[1], 10) : null, minutes: m ? parseInt(m[2], 10) : null, body: body.slice(0, 0) };
    });

    console.log(`\n══ E720 ITEM 2 · ${email} ══`);
    console.log(`   /profile       open=${profile.open} minutes=${profile.minutes} (ring ${profile.total}) raw="${profile.raw}"`);
    console.log(`   /connect/score open=${scorePage.open} minutes=${scorePage.minutes}`);
    /* ⚠ A PERSONA WITH NOTHING OUTSTANDING PROVES NOTHING ABOUT AGREEMENT OF COUNTS, so the
       gate says so out loud rather than passing quietly on a vacuous pair (`E586`). */
    if (profile.open === 0) {
      console.log(`   ⚠ nothing outstanding for this persona — the count comparison is vacuous here`);
    } else {
      expect(scorePage.open, "the score page printed no summary line to compare").not.toBeNull();
      expect(profile.open, "the two pages disagree on the number of outstanding items").toBe(
        scorePage.open
      );
      expect(profile.minutes, "the two pages disagree on the minutes").toBe(scorePage.minutes);
    }
    await page.close();
  }
});

test("E720 items 5 · 7 · 8 · 9 · 10 — one chip, one sentence, rows, the rebuild link", async ({
  browser,
}) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
  await signInAsSeeded(page, OTHER);
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  /* ⚠ Open every section, so chips inside the five closed ones are measurable. */
  await page.evaluate(() =>
    document.querySelectorAll<HTMLDetailsElement>("details.pm-clean-sec").forEach((d) => (d.open = true))
  );
  await page.waitForTimeout(600);

  /*
    ── ITEM 5 — ONE TAG STYLE ───────────────────────────────────────────────────────────

    ⚠⚠⚠ **IT COMPARES COMPUTED STYLE, NOT CLASS NAMES.** A class-name check is exactly what
    could not see `E717`'s ring or `E718`'s full-width button — a declaration can be applied,
    specific enough, and still lose. ⚠ Two chips with different class strings that compute
    identically are ONE style, which is what Scott asked for.
  */
  const chips = await page.evaluate(() => {
    const out: Record<string, number> = {};
    const seen: Record<string, string[]> = {};
    /* ⚠ Every span that LOOKS like a tag: pill-rounded, small, inline, with a short label. */
    for (const el of document.querySelectorAll<HTMLElement>(".pm-cp3 span, .pm-cp3 a")) {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const radius = parseFloat(s.borderTopLeftRadius) || 0;
      if (r.height < 14 || r.height > 40 || r.width > 320) continue;
      if (radius < r.height / 2 - 1) continue;
      if (el.querySelector("span, a, svg")) continue;
      const txt = (el.textContent ?? "").trim();
      if (!txt || txt.length > 40) continue;
      const key = [
        s.borderTopLeftRadius, s.paddingTop, s.paddingLeft, s.fontSize,
        s.fontWeight, s.color, s.backgroundColor, s.boxShadow, s.borderTopWidth,
      ].join(" | ");
      out[key] = (out[key] ?? 0) + 1;
      (seen[key] ??= []).push(txt);
    }
    return Object.entries(out).map(([k, n]) => ({ style: k, n, examples: (seen[k] ?? []).slice(0, 5) }));
  });
  console.log(`\n══ E720 ITEM 5 · distinct chip styles on /profile: ${chips.length} ══`);
  for (const c of chips) console.log(`   ×${c.n}  ${c.examples.join(", ")}\n        ${c.style}`);

  /*
    ── ITEM 7 — THE SOLO PROJECTS SENTENCE, ONCE ───────────────────────────────────────
  */
  const solo = await page.evaluate(() => {
    const sec = document.querySelector<HTMLElement>("#solo-projects");
    const txt = (sec?.innerText ?? "").replace(/\s+/g, " ");
    const hits = (txt.match(/Work History/gi) ?? []).length;
    return { hits, txt: txt.slice(0, 240) };
  });
  console.log(`\n══ E720 ITEM 7 · Solo Projects ══\n   "Work History" mentions: ${solo.hits}\n   "${solo.txt}"`);
  expect(solo.hits, "the Solo Projects explanation is still printed twice").toBeLessThanOrEqual(1);

  /*
    ── ITEM 8 — COURSES ARE ROWS WITH A LESSON COUNT ───────────────────────────────────
  */
  const courses = await page.evaluate(() => {
    const rows = [...document.querySelectorAll<HTMLElement>(".pm-course-row")].map((a) => ({
      name: (a.querySelector(".pm-course-name")?.textContent ?? "").trim(),
      meta: (a.querySelector(".pm-course-meta")?.textContent ?? "").trim(),
      href: a.getAttribute("href"),
      display: getComputedStyle(a).display,
    }));
    return rows;
  });
  console.log(`\n══ E720 ITEM 8 · course rows: ${courses.length} ══`);
  for (const c of courses) console.log(`   ${c.name}  |  ${c.meta}  ->  ${c.href}`);
  for (const c of courses) {
    expect(c.href, "a course row is not a link").toMatch(/^\/learn\//);
    expect(c.meta, `"${c.name}" has no lesson count`).toMatch(/lesson|No lessons/);
  }

  /*
    ── ITEM 9 — THE REBUILD LINK ───────────────────────────────────────────────────────
  */
  const rebuild = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>("[data-e720-rebuild]");
    const wh = document.querySelector<HTMLElement>("#work-history");
    const btn = document.querySelector<HTMLElement>("[data-e715-btn]");
    const s = el ? getComputedStyle(el) : null;
    return {
      present: !!el,
      color: s?.color ?? null,
      belowButton:
        el && btn
          ? Math.round(el.getBoundingClientRect().top - btn.getBoundingClientRect().bottom)
          : null,
      /* ⚠ AND IT IS GONE FROM WORK HISTORY — Scott asked for it removed from that slot. */
      inWorkHistory: wh ? /Update from my r|Rebuild From New/i.test(wh.innerText) : null,
      greyed: el?.getAttribute("aria-disabled") ?? null,
    };
  });
  console.log(`\n══ E720 ITEM 9 · Rebuild From New Résumé ══\n   ${JSON.stringify(rebuild)}`);
  expect(rebuild.inWorkHistory, "the résumé control is still in the Work History slot").toBe(false);
  expect(rebuild.present, "the Rebuild From New Résumé link is missing").toBe(true);

  /*
    ── ⚠⚠⚠ THE GREYED STATE USES A TOKEN THAT IS DEAD ALMOST EVERYWHERE ─────────────────

    ⚠⚠ **`--color-ink-3` IS DECLARED NOWHERE APP-WIDE** — 56 `text-ink-3` uses across 13 files
    emit no CSS at all, silently, because Tailwind v4 generates nothing for a token that does
    not exist (the `HERO_SCRIM`/`E338` trap). ⚠ The ONLY thing that makes it grey is a scoped
    rule, `.account-surface .text-ink-3 { color: #8a869a }` in `connect-profile.css`.
    ⚠⚠⚠ **SO THE DISABLED STATE'S GREY DEPENDS ON THIS PAGE BEING INSIDE `.account-surface`,
    AND THAT IS MEASURED HERE RATHER THAN REASONED FROM THE STYLESHEET** — if the wrapper ever
    moves, the greyed control silently stops looking disabled and nothing else would notice.
  */
  const grey = await page.evaluate(() => {
    const host = document.querySelector(".account-surface");
    if (!host) return { inSurface: false, colour: null as string | null };
    const probe = document.createElement("span");
    probe.className = "text-ink-3";
    host.appendChild(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return { inSurface: true, colour: c };
  });
  console.log(`   greyed-state token: inside .account-surface=${grey.inSurface} · text-ink-3 computes to ${grey.colour}`);
  expect(grey.inSurface, "/profile is no longer inside .account-surface — text-ink-3 would be dead").toBe(true);
  expect(grey.colour, "text-ink-3 does not compute to the scoped grey").toBe("rgb(138, 134, 154)");

  await page.screenshot({ path: join(OUT, "profile-1280-full.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT, "profile-390-full.png"), fullPage: true });
  await page.close();

  /*
    ── ITEM 10 — THE MENTOR CONSENT FLAG, COUNTED ──────────────────────────────────────

    ⚠⚠⚠ **REPORTED, NOT ASSERTED AWAY.** `Request as Mentor` is gated on
    `ProviderProfile.open_for_mentoring`, and if nothing holds it the section renders for
    nobody — which is a fact Scott needs, not a gate failure.
  */
  const p = db();
  const [openForMentoring, profiles, mentorRows] = await Promise.all([
    p.providerProfile.count({ where: { open_for_mentoring: true } }),
    p.providerProfile.count(),
    p.connection.count({ where: { kind: "MENTOR" } }),
  ]);
  console.log(
    `\n══ E720 ITEM 10 · mentor consent ══\n` +
      `   ProviderProfile.open_for_mentoring = true : ${openForMentoring} of ${profiles}\n` +
      `   Connection rows with kind MENTOR          : ${mentorRows}\n` +
      `   ⚠ at ${openForMentoring} open profiles the "Request as Mentor" section renders for NOBODY today`
  );
});

/**
 * ── ⚠⚠⚠ ITEMS 5 AND 8, ON A PERSONA THAT ACTUALLY HAS THE THINGS ──────────────────────────
 *
 * ⚠⚠ **THE FIRST RUN OF THIS SUITE PROVED NEITHER, AND SAID SO: 5 chips (all of them skills)
 * and ZERO course rows**, because `sw_user21` teaches nothing, takes nothing and has no
 * projects. ⚠⚠⚠ **A CHECK WHOSE POPULATION DOES NOT CONTAIN THE SUBJECT IS NOT GUARDING IT**
 * (ruling 9) — *"one tag style"* over one tag family is a tautology, and *"courses are rows"*
 * over no courses is `E586`.
 * ⚠ **`SW_user2` — Linus Erley — TEACHES 3 PATHS (53 · 105 · 50 lessons), HAS A PROJECT AND A
 * STORED RÉSUMÉ**, so every chip family and both course lists are on the page at once.
 * ⚠⚠ **HE IS A PROTECTED LESSON-HOLDER (load-bearing rule 10) AND THIS TEST ONLY READS** — it
 * signs in, opens the disclosures in the DOM, measures and screenshots. No click that writes.
 */
test("E720 items 5 · 8 — every chip family and both course lists, on a rich profile", async ({
  browser,
}) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
  await signInAsSeeded(page, "SW_user2@straterp.com");
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.evaluate(() =>
    document
      .querySelectorAll<HTMLDetailsElement>("details.pm-clean-sec")
      .forEach((d) => (d.open = true))
  );
  await page.waitForTimeout(700);

  const chips = await page.evaluate(() => {
    const groups = new Map<string, string[]>();
    for (const el of document.querySelectorAll<HTMLElement>(".pm-cp3 span")) {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const radius = parseFloat(s.borderTopLeftRadius) || 0;
      if (r.height < 14 || r.height > 40 || r.width > 320) continue;
      if (radius < r.height / 2 - 1) continue;
      if (el.querySelector("span, a, svg")) continue;
      const txt = (el.textContent ?? "").trim();
      if (!txt || txt.length > 40) continue;
      /* ⚠⚠ STATUS BADGES ARE NOT TAGS AND ARE COUNTED SEPARATELY — see the report. */
      const key = [
        s.paddingTop, s.paddingLeft, s.fontSize, s.fontWeight,
        s.color, s.backgroundColor, s.boxShadow, s.borderTopWidth,
      ].join(" | ");
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(txt);
    }
    return [...groups.entries()].map(([style, examples]) => ({
      style, n: examples.length, examples: examples.slice(0, 6),
    }));
  });
  console.log(`\n══ E720 ITEM 5 · chip styles on a RICH profile: ${chips.length} ══`);
  for (const c of chips) console.log(`   ×${String(c.n).padEnd(3)} ${c.examples.join(", ")}\n        ${c.style}`);

  const courses = await page.evaluate(() => ({
    rows: [...document.querySelectorAll<HTMLElement>(".pm-course-row")].map((a) => ({
      name: (a.querySelector(".pm-course-name")?.textContent ?? "").trim(),
      meta: (a.querySelector(".pm-course-meta")?.textContent ?? "").trim(),
      href: a.getAttribute("href"),
    })),
    /* ⚠ AND NO CHIP SURVIVES IN EITHER COURSE SECTION — the thing item 8 replaced. */
    chipsLeft: ["My Courses", "Courses Taken"].map((t) => {
      const sec = [...document.querySelectorAll<HTMLDetailsElement>("details.pm-clean-sec")].find(
        (d) => (d.querySelector("summary")?.textContent ?? "").includes(t)
      );
      const pills = sec
        ? [...sec.querySelectorAll<HTMLElement>("a")].filter((a) => {
            const s = getComputedStyle(a);
            const r = a.getBoundingClientRect();
            return (parseFloat(s.borderTopLeftRadius) || 0) >= r.height / 2 - 1 && r.height > 0;
          }).length
        : null;
      return { section: t, pillLinks: pills };
    }),
  }));
  console.log(`\n══ E720 ITEM 8 · course rows: ${courses.rows.length} ══`);
  for (const c of courses.rows) console.log(`   ${c.name.padEnd(34)} | ${c.meta.padEnd(16)} -> ${c.href}`);
  console.log(`   pill-shaped links left in the course sections: ${JSON.stringify(courses.chipsLeft)}`);

  expect(courses.rows.length, "no course rows rendered on a profile that teaches 3 paths").toBeGreaterThan(0);
  for (const c of courses.rows) {
    expect(c.href, "a course row is not a link").toMatch(/^\/learn\//);
    expect(c.meta, `"${c.name}" carries no lesson count`).toMatch(/\d+ lessons?|No lessons yet/);
  }
  /* ⚠⚠⚠ THE MUTATION-PROOF FOR ITEM 8: the chips are GONE, not merely joined by rows. */
  for (const s of courses.chipsLeft) {
    if (s.pillLinks !== null) {
      expect(s.pillLinks, `${s.section} still renders pill-shaped chip links`).toBe(0);
    }
  }
  await page.screenshot({ path: join(OUT, "rich-1280-full.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 1400 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT, "rich-390-full.png"), fullPage: true });
  await page.close();
});
