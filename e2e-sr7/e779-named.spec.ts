import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";

/**
 * ── ⚠⚠ THE NAMED PROFILE BLURS RATES AND CONTACT (`P2-A1.1-E779`) ──────────
 *
 * ⚠ Scott: show name, photo and work — *"but blur rates and contact"*.
 *
 * ⚠⚠⚠ **IT IS PRESENTATION ONLY, AND THE MEASUREMENT SAYS SO.** The page already
 * withheld both: `NamedProfile` is `MaskedProfile` plus a name object, and
 * `MaskedProfile` has **no rate field and no contact field**. There has never
 * been a figure here to leak. ⚠ So the leak assertions below are a REGRESSION
 * GUARD, not the closing of an exposure — and they are paired with a positive
 * assertion so they cannot pass against a page that renders nothing.
 *
 * ⚠⚠ **ZERO PROFILES HAVE `public_name_at` SET**, so this surface has no live
 * population. The test turns it on for one profile and restores it in a
 * `finally` — the pattern `e2e-e738` already uses, for the same reason: a failed
 * assertion must not leave a real member's name published.
 */
const prisma = db();

test.describe("P2-A1.1-E779 — the named public profile", () => {
  test("⚠⚠⚠ it names the person, and blurs the rate and the contact", async ({ page, request }) => {
    const target = await prisma.providerProfile.findFirst({
      where: { person: { last_name: { equals: "Walls", mode: "insensitive" } } },
      select: { id: true, public_name_at: true, person: { select: { first_name: true, last_name: true } } },
    });
    expect(target, "no profile to exercise the named page with").not.toBeNull();

    const slugRow = await prisma.providerProfileSlug.findFirst({
      where: { profile_id: target!.id, is_current: true },
      select: { slug: true },
    });
    expect(slugRow, "no slug minted yet — open /profile as the owner once").not.toBeNull();

    const original = target!.public_name_at;
    try {
      await prisma.providerProfile.update({
        where: { id: target!.id },
        data: { public_name_at: new Date() },
      });

      const res = await request.get(`/pro/${slugRow!.slug}`);
      expect(res.status(), "the named page did not render").toBe(200);
      const body = await res.text();
      await page.goto(`/pro/${slugRow!.slug}`, { waitUntil: "domcontentloaded" });

      /* ⚠⚠ THE POSITIVE HALF FIRST — without it every absence below is vacuous. */
      expect(body.includes(target!.person.last_name ?? ""), "the named page is not showing the name")
        .toBe(true);
      expect(body, "the blurred rate placeholder is missing").toContain("$000 / hr");
      expect(body, "the blurred contact placeholder is missing").toContain("name@example.com");
      expect(body, "Scott's lock wording is missing").toContain("Join free to see rates and contact");

      /* ⚠⚠⚠ AND THE GUARD: no real rate figure reaches the page. `MaskedProfile`
         carries no rate, so this asserts the shape stays that way. */
      /* ⚠ The columns are `onsite_rate_cents` / `remote_rate_cents` — CENTS, not
         dollars. My first version named `rate_min`/`rate_max`, which do not exist,
         and typescript caught it before the gate could assert against nothing. */
      const rates = await prisma.providerProfile.findUnique({
        where: { id: target!.id },
        select: { onsite_rate_cents: true, remote_rate_cents: true },
      });
      const cents = [rates?.onsite_rate_cents, rates?.remote_rate_cents].filter(
        (v): v is number => typeof v === "number"
      );
      /*
        ⚠⚠⚠ THE DOLLAR FIGURE IS CHECKED IN THE RENDERED TEXT, NOT THE RAW BODY,
        AND THAT CORRECTION IS THE POINT. React's RSC payload serialises chunk
        references as `$<hex>` — the raw HTML contains `123:D"$125"` — so a bare
        `$125` needle matched React's own internals and reported a rate leak that
        did not exist. ⚠ I chased it before spotting it.
        ⚠⚠ The raw CENTS value has no such collision, so that one IS checked
        against the whole body, where a value reachable by any means would show.
      */
      const shown = await page.evaluate(() => document.body.innerText);
      for (const c of cents) {
        const dollars = String(Math.round(c / 100));
        expect(shown.includes(`$${dollars}`), `the real rate $${dollars} is VISIBLE on the named page`)
          .toBe(false);
        expect(body.includes(String(c)), `the raw cents value ${c} reached the named page`).toBe(false);
      }
      console.log(
        `  /pro/${slugRow!.slug} — named · ${cents.length} real rate value(s) checked absent · placeholders present`
      );
    } finally {
      /* ⚠⚠ ALWAYS PUT IT BACK. A failed assertion must not leave a real member's
         name published on a live site. */
      await prisma.providerProfile.update({
        where: { id: target!.id },
        data: { public_name_at: original },
      });
    }
  });

  test("⚠ and the flag is back off afterwards", async () => {
    const n = await prisma.providerProfile.count({ where: { public_name_at: { not: null } } });
    expect(n, "a profile was left publicly named").toBe(0);
  });
});
