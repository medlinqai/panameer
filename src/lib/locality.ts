/**
 * ── ⚠⚠ ONE WAY TO WRITE WHERE SOMEBODY IS (`P1-A1.4-E412` WS-4) ─────────────
 *
 * PRESENTATION ONLY. ⚠ Scott confirmed the data behind the walk's
 * *"Ponte Vedra Beach, England, United Kingdom"* was test noise — *"that was me
 * just typing things in to get moving"* — so `E412` says in terms: **do not add
 * address validation in this brief.** Nothing here rejects, corrects or
 * questions a value; it only decides how the parts are written out.
 *
 * ⚠⚠ THE COUNTRY IS DELIBERATELY NOT IN THE LINE. `LocationBody` has always
 * accepted `country` as its own prop and printed it on a second, quieter line —
 * and both callers defeated that by joining the country into `location`, at
 * which point the component's own `!location.includes(country)` guard
 * suppressed the second line. The component was right; the callers were
 * feeding it a string that had already made the decision.
 *
 * ⚠ AND IT IS A SHARED HELPER BECAUSE THE JOIN EXISTED TWICE — identically, in
 * `provider-profile-view.ts:186` and on the wizard's review screen. Two copies
 * of one format is how the review stops matching the profile it claims to be
 * *"exactly what buyers will see."*
 *
 * ⚠ PLAIN TS, NO REACT. It is imported by a SERVER module (`provider-profile-
 * view.ts`) and by a `"use client"` page, so it must pull neither direction's
 * runtime in behind it — the failure `E406` shipped as a 500 when the wizard
 * imported `lib/onboarding` and dragged `dns`/`fs`/`net`/`tls` into the browser
 * bundle.
 */
import { displayPlacePart } from "@/lib/location";

/** The address parts this formatter reads. All optional, all possibly blank. */
export type LocalityParts = {
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
};

/*
  ── ⚠⚠⚠ THE CASING RULE APPLIES HERE TOO, AND IT REACHED THIS FILE LAST ────

  ⚠ Scott's rule (`E591` rider): title-case only when the stored value is
  entirely lowercase; otherwise render as stored, so a code like `FL` survives.
  ⚠⚠ THE RIDER WAS APPLIED TO `explore.ts` AND `community-page.ts` — the two
  callers an inventory of `formatLocation` pointed at — AND MISSED THIS ONE
  ENTIRELY, because this is a DIFFERENT FORMATTER with a different name.
  ⚠⚠⚠ SO THE PROFILE'S IDENTITY CARD WENT ON RENDERING `saint augustine, FL`
  for another day. **An inventory of CALLERS cannot find a second
  IMPLEMENTATION** — that is the lesson, and it is the same shape as the
  grep-inside-a-comment family: the measurement answered the question asked,
  and the question was too narrow.

  ⚠ `p.location` is built here, so fixing it here fixes every consumer at once —
  the identity card, the wizard review, and anything that later reads either.
  ⚠⚠ STILL PRESENTATION ONLY. `E412` bars validation in this file and that
  stands: nothing here rejects, corrects or questions a value. Casing is how the
  parts are WRITTEN OUT, which is exactly what this module already decides.
  ⚠ AND THE STORED VALUE IS NEVER REWRITTEN.
*/
const trimmed = (v: string | null | undefined) => displayPlacePart(v);

/**
 * The city/region line, without the country.
 *
 * ⚠⚠ HOW A MISSING COMPONENT IS HANDLED, which is the thing `E412` asks to be
 * reported: **every part is dropped before the join, never after**, so a
 * missing city cannot leave a leading comma and a missing region cannot leave a
 * trailing one. `join` only ever sees parts that exist.
 *
 * ⚠ THE POSTAL CODE JOINS ITS REGION WITH A SPACE, NOT A COMMA — `FL 32095`,
 * the way an address is actually written, rather than `FL, 32095`. ⚠ WITH NO
 * REGION IT BECOMES ITS OWN PART rather than being dropped: `Ponte Vedra Beach,
 * 32082` is ungainly but it is what the person typed, and silently discarding
 * a field somebody filled in is worse than printing it plainly.
 *
 * Returns `null`, never `""`, so a caller's `location || country` fallback
 * behaves.
 */
export function formatLocality(parts: LocalityParts): string | null {
  const city = trimmed(parts.city);
  const state = trimmed(parts.state);
  const postalCode = trimmed(parts.postalCode);

  const region = [state, postalCode].filter(Boolean).join(" ");
  return [city, region || null].filter(Boolean).join(", ") || null;
}
