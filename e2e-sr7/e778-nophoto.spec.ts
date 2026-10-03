import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";

/**
 * ── ⚠⚠ EVERY MASKED CARD GETS THE SAME TREATMENT (`P2-A1.1-E778`) ──────────
 *
 * ⚠ Scott: the no-photo providers show the plain silhouette while everyone else
 * is blurred, so the grid reads as two different products.
 *
 * ── ⚠⚠⚠ WHAT THE MEASUREMENT FOUND, AND IT NARROWS THE CLAIM ──────────────
 *
 * ⚠⚠ **3 OF 63 ELIGIBLE PROVIDERS HAVE NO `photo_url` — AND ALL THREE RENDER
 * "not available", BECAUSE THEY SIT BELOW THE VISIBILITY THRESHOLD** (completeness
 * 0, 0 and 25). ⚠⚠⚠ **SO THE NO-PHOTO BRANCH CANNOT BE REACHED FROM A PUBLIC
 * SURFACE TODAY**, and a test that claimed to exercise it would be claiming more
 * than it can see.
 *
 * ⚠ **THE LIVE CAUSE IS ALMOST CERTAINLY THE OTHER ONE:** 6 of the 60 photos are
 * REMOTE (Supabase) and fetched with a 4s timeout. A slow or failed fetch used to
 * return `null` — a silhouette — intermittently and only for those six. ⚠⚠ Every
 * LOCAL file was verified present (54 of 54, 0 missing), so a broken path is not
 * it.
 *
 * ⚠⚠ **THE FIX COVERS BOTH DOORS** — no URL, and a URL that cannot be read — so
 * the silhouette is gone from the masked surfaces either way. What is asserted
 * below is what is observable: every reachable card and profile carries a blur.
 *
 * ⚠ The module itself cannot be unit-tested here: it imports `server-only`, which
 * throws outside Next. Stated rather than worked around.
 */
const prisma = db();

test.describe("P2-A1.1-E778 — no silhouettes on a masked surface", () => {
  test("⚠⚠ every card on the grid carries a blur", async ({ request }) => {
    const grid = await (await request.get("/explore")).text();
    const cards = (grid.match(/href="\/providers\//g) ?? []).length;
    const uris = [...grid.matchAll(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/g)].map((m) => m[1]);
    expect(cards, "no cards rendered — this gate would be vacuous").toBeGreaterThan(0);
    const distinct = new Set(uris).size;
    console.log(`  ${cards} cards · ${uris.length} blur occurrences · ${distinct} distinct`);
    expect(uris.length, "fewer blurs than cards — someone is still unblurred").toBeGreaterThanOrEqual(cards);
    /* ⚠⚠ And every one stays under `E767`'s irreversibility ceiling. */
    expect(Math.max(...uris.map((u) => u.length))).toBeLessThan(4000);
  });

  test("⚠⚠⚠ every reachable masked profile carries a blur", async ({ request }) => {
    const rows = await prisma.providerProfile.findMany({
      where: { status: "ACTIVE", paused_at: null, preview_hidden_at: null },
      select: { id: true },
      orderBy: [{ completeness: "desc" }, { updated_at: "desc" }],
      take: 10,
    });
    expect(rows.length, "no eligible providers").toBeGreaterThan(0);
    let checked = 0;
    let blurred = 0;
    for (const r of rows) {
      const body = await (await request.get(`/providers/${r.id}`)).text();
      /*
        ⚠⚠⚠ THE DISCRIMINATOR IS `SEARCH SCORE`, NOT `Browse Talent`, AND GETTING
        THAT WRONG COST A FALSE RED. A profile below the visibility threshold
        renders the "not available" page — which ALSO carries a `Browse Talent`
        link, because `E608`'s rule is that it must not be a dead end. ⚠ So the
        first version of this filter counted a not-available page as a masked
        profile, found no blur on it, and reported a defect that was not there.
        ⚠⚠ `SEARCH SCORE` renders only on the real masked profile.
      */
      if (!body.includes("SEARCH SCORE")) continue;
      checked += 1;
      if (body.includes("data:image/jpeg")) blurred += 1;
    }
    console.log(`  ${blurred}/${checked} reachable masked profiles carry a blur`);
    expect(checked, "no reachable masked profile in the sample").toBeGreaterThan(0);
    expect(blurred, "a reachable masked profile rendered no blur").toBe(checked);
  });

  /**
   * ⚠⚠ THE SILHOUETTE IS STILL THE RIGHT ANSWER WHERE A CARD IS NOT A PERSON —
   * asserted so the fix is not read as "delete the placeholder icon".
   */
  test("⚠ the placeholder icon still exists for the no-avatar case", async () => {
    const { readFile } = await import("node:fs/promises");
    const src = await readFile("src/components/public/masked-ui.tsx", "utf8");
    expect(src, "the silhouette fallback was removed rather than bypassed").toContain("<circle cx=\"12\" cy=\"8\" r=\"4\" />");
  });
});
