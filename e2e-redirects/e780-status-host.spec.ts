import { test, expect } from "@playwright/test";

/**
 * ── ⚠⚠ ONE PLACE TO GO (`P2-ALL-E780`) ────────────────────────────────────
 *
 * ⚠ Scott: *"one place to go."* The three app/marketing hosts send `/status` to
 * `https://status.panameer.com/`.
 *
 * ⚠⚠⚠ **THE HOST IS SPOOFED WITH A `Host:` HEADER, WHICH IS EXACTLY WHAT NEXT
 * READS** — `prepare-destination.js` takes `req.headers.host` and strips the
 * port. So these assertions exercise the real matcher, not a simulation of it.
 */
const REDIRECTED = ["panameer.com", "www.panameer.com", "app.panameer.com"];

/**
 * ⚠⚠ THE HOSTS THAT MUST **NOT** REDIRECT, AND WHY EACH ONE IS HERE:
 * · `status.panameer.com` — it is the destination; redirecting it would loop.
 * · `localhost` / `status.localhost` — the dev walk.
 * · a preview host — Vercel previews must keep working.
 * · ⚠⚠⚠ **the two near-miss hosts are the measured defect in the brief's own
 *   proposed value.** Next compiles `has.value` as `^…$`, and alternation binds
 *   loosest, so the ungrouped form anchored only ONE end of each branch and
 *   matched both of these. They are the reason the pattern is grouped.
 */
const NOT_REDIRECTED = [
  "status.panameer.com",
  "localhost",
  "status.localhost",
  "panameer-abc.vercel.app",
  "panameer.com.evil.net",
  "evil-app.panameer.com",
];

test.describe("P2-ALL-E780 — /status lives at status.panameer.com", () => {
  test("⚠⚠ the three hosts 307 to the status host", async ({ request }) => {
    for (const host of REDIRECTED) {
      const res = await request.get("/status", {
        headers: { Host: host },
        maxRedirects: 0,
      });
      expect(res.status(), `${host} should redirect`).toBe(307);
      expect(res.headers()["location"], `${host} destination`).toBe(
        "https://status.panameer.com/"
      );
    }
  });

  /** ⚠⚠ THE QUERY SURVIVES — this is what carries `?follow=1` across the hop. */
  test("⚠⚠⚠ the query string is carried through", async ({ request }) => {
    for (const host of REDIRECTED) {
      const res = await request.get("/status?follow=1&x=2", {
        headers: { Host: host },
        maxRedirects: 0,
      });
      expect(res.status()).toBe(307);
      expect(res.headers()["location"], `${host} kept the query`).toBe(
        "https://status.panameer.com/?follow=1&x=2"
      );
    }
  });

  test("⚠⚠⚠ everything else is left alone", async ({ request }) => {
    for (const host of NOT_REDIRECTED) {
      const res = await request.get("/status", {
        headers: { Host: host },
        maxRedirects: 0,
      });
      expect(res.status(), `${host} must NOT redirect`).toBe(200);
    }
  });

  /** ⚠ `source` is an exact path match, so the API route is untouched. */
  test("⚠ /api/status is untouched on every host", async ({ request }) => {
    for (const host of [...REDIRECTED, "status.panameer.com"]) {
      const res = await request.get("/api/status", { headers: { Host: host }, maxRedirects: 0 });
      expect(res.status(), `${host} /api/status`).toBe(200);
    }
  });

  /**
   * ⚠⚠⚠ AND IT DOES NOT LOOP WITH THE STATUS-HOST REWRITE. The root on the status
   * host still serves the tracker, with no redirect in between.
   */
  test("⚠⚠⚠ the status host root still rewrites to the tracker", async ({ request }) => {
    const res = await request.get("/", { headers: { Host: "status.panameer.com" }, maxRedirects: 0 });
    expect(res.status(), "the status root must not redirect").toBe(200);
    const body = await res.text();
    expect(body, "the status root is not the Work Tracker").toContain("Panameer Work Tracker");
  });
});
