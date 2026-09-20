/**
 * ── ⚠⚠⚠ THE SERVER THESE GATES REUSE MUST BE A **DEV** SERVER ─────────────
 *
 * `P2-J3-E591` WS-B rider, 2026-09-20.
 *
 * ── WHAT HAPPENED ──────────────────────────────────────────────────────────
 *
 * ⚠⚠ FIVE `check:ui` TESTS FAILED AND WERE REPORTED AS *"the 123 baseline is
 * stale"*. ⚠⚠⚠ THEY WERE NOT. The baseline was right and the MEASUREMENT was
 * wrong — a production server (`npm run start`) had been left on port 3100 to
 * run `check:app-shell`, and all three Playwright configs carry
 * `reuseExistingServer: true`, so this suite silently reused it instead of
 * starting `npm run dev`.
 *
 * ⚠ `src/lib/host.ts:71` — `localhost` counts as a MARKETING host only when
 * `NODE_ENV !== "production"`. Under `npm run start` it does not, so
 * `proxy.ts`'s root host-split redirects `/` to `/login`. ⚠⚠ THE HOST SPLIT IS
 * CORRECT AND IS NOT THE DEFECT: `panameer.com` serves marketing, and
 * `app.panameer.com` sends `/` to the app.
 *
 * ⚠ The five failures were four 30-SECOND `waitForSelector` TIMEOUTS plus one
 * attribute miss — i.e. **two and a half minutes of nothing, describing
 * nothing.** ⚠⚠ A GATE THAT FAILS FOR A REASON IT DOES NOT NAME COSTS MORE
 * THAN A GATE THAT DOES NOT RUN, because the failure gets attributed to the
 * branch under test. It nearly re-baselined a correct number.
 *
 * ── WHAT THIS DOES ─────────────────────────────────────────────────────────
 *
 * ⚠ One request, before any test. If `/` does not serve the marketing home, the
 * whole run stops with the sentence a person needs. ⚠⚠ IT DOES NOT AND MUST NOT
 * TRY TO FIX THE SERVER — killing something the developer started is worse than
 * the confusion it would save.
 *
 * ⚠ It is a `globalSetup`, not a test, DELIBERATELY: a failing test is one red
 * line among many and the other failures still print. A failing global setup
 * aborts the run, which is the honest shape for *"you are pointed at the wrong
 * server"*.
 */
export default async function guardDevServer() {
  const base = "http://localhost:3100";

  let res: Response;
  try {
    res = await fetch(base + "/", { redirect: "manual" });
  } catch {
    /* ⚠ Nothing listening is Playwright's own `webServer` problem, not ours —
       it is about to start one. Say nothing and let it. */
    return;
  }

  /*
    ⚠ A 3xx ON `/` IS THE SIGNATURE. Under `npm run dev` the marketing home
    returns 200; under `npm run start` the host split returns 307 to `/login`.
    ⚠⚠ CHECKED BY STATUS, NOT BY SELECTOR — this runs before a browser exists,
    and the point is to be faster and clearer than the thing it replaces.
  */
  if (res.status >= 300 && res.status < 400) {
    const to = res.headers.get("location") ?? "(no location header)";
    throw new Error(
      [
        "",
        "⚠⚠ check:ui IS POINTED AT A PRODUCTION SERVER, NOT A DEV SERVER.",
        "",
        `  GET / returned ${res.status} -> ${to}`,
        "",
        "  This suite tests the PUBLIC MARKETING HOME. `src/lib/host.ts` only",
        "  treats localhost as a marketing host when NODE_ENV !== 'production',",
        "  so under `npm run start` the root host-split in `src/proxy.ts` sends",
        "  `/` to `/login` and every marketing assertion times out.",
        "",
        "  ⚠ This config's webServer is `npm run dev` with",
        "  `reuseExistingServer: true`, so a production server left on port 3100",
        "  (for example from running check:app-shell) is reused silently.",
        "",
        "  FIX: stop the production server, then run `npm run dev` — or just",
        "  let this suite start its own:",
        "",
        "      pkill -f 'next start'; pkill -f next-server",
        "",
        "  ⚠⚠ THE 123 BASELINE IS NOT STALE. It was measured on a dev server and",
        "  it still reads 123. Do not re-baseline on the strength of this run.",
        "",
      ].join("\n")
    );
  }
}
