import { headers } from "next/headers";

/**
 * ── ⚠⚠ A SCRAPE BRAKE FOR THE PUBLIC TALENT SURFACES (`P2-A1.1-E738` WS-C) ──
 *
 * ⚠ THE BRIEF: *"Rate-limit the public grid and profile (no bulk scraping of
 * the masked set)."*
 *
 * ── ⚠⚠⚠ WHAT IT IS, STATED PLAINLY, SO NOBODY LATER BELIEVES THE APP IS
 *        PROTECTED BY IT ────────────────────────────────────────────────────
 *
 * ⚠⚠ **IT IS AN IN-MEMORY, PER-INSTANCE, BEST-EFFORT BRAKE AND IT IS
 * KNOWN-WEAK** — the same shape, and the same four admissions, as `E528`'s
 * per-IP reset limit, recorded in `CLAUDE.md` at Scott's instruction:
 *   · ⚠ **IT DOES NOT SURVIVE A REDEPLOY.** The counters are process memory.
 *   · ⚠ **IT DOES NOT SPAN INSTANCES.** Vercel Fluid compute runs more than
 *     one, so a scraper spread across them gets the limit N times over.
 *   · ⚠ **A DURABLE ONE NEEDS A TABLE** (nothing in this app stores a request
 *     IP) **AND IS NOT AUTHORISED.**
 *   · ⚠⚠⚠ **SO IT RAISES THE COST OF BULK COLLECTION; IT DOES NOT PREVENT IT.**
 *
 * ⚠⚠ **THE REAL PROTECTION IS THE MASK, NOT THIS.** Every page this throttles
 * has already had the name, photo, employer, client, school and rate removed
 * **server-side, from the payload**, so a scraper who defeats the brake collects
 * titles, skills and scores — which is exactly what the page is FOR. ⚠ That is
 * the load-bearing point: a rate limit is a courtesy here, and if it were the
 * thing standing between a visitor and a surname, the design would be wrong.
 *
 * ⚠ IT FAILS **OPEN**, deliberately: a visitor with no attributable address is
 * allowed. A public funnel page that refuses real buyers to deter a scraper has
 * the trade backwards.
 */

/** ⚠ Generous on purpose — a human comparing experts opens many previews. */
export const BROWSE_LIMIT_PER_MINUTE = 40;

const hits = new Map<string, number[]>();

/** ⚠ The usual proxy headers. Vercel sets `x-forwarded-for`. */
async function callerKey(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  /* ⚠ The FIRST entry is the client; the rest are proxies that appended
     themselves, and trusting the last one lets a caller forge the key. */
  const ip = fwd?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim();
  return ip || null;
}

/**
 * ⚠⚠ True when this caller may be served. Records the hit as a side effect, so
 * it is called exactly once per page render.
 */
export async function browseAllowed(): Promise<boolean> {
  const key = await callerKey();
  if (!key) return true; // ⚠ fail open — see the header note
  const now = Date.now();
  const minute = 60 * 1000;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < minute);
  if (recent.length >= BROWSE_LIMIT_PER_MINUTE) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  /* ⚠ Bound the map so a long-lived instance cannot grow it without limit —
     the same guard `password-reset.ts` carries, for the same reason. */
  if (hits.size > 5_000) {
    for (const k of [...hits.keys()].slice(0, 1_000)) hits.delete(k);
  }
  return true;
}
