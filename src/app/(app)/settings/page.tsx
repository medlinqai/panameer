import { redirect } from "next/navigation";

/**
 * ── ⚠⚠⚠ /settings LANDS ON CONTACT INFO (`P2-A2-E609`) ───────────────────
 *
 * ⚠ SCOTT, 2026-09-23: *"`/settings` must not land on a page nobody can
 * change."*
 * ⚠⚠ MEMBERSHIP WRITES ZERO ROWS — measured, not assumed: the page has no
 * `prisma.*.update` anywhere and no API route behind it. It is a READ. Landing
 * the whole area on a read made the first thing a member met a page their
 * click could not affect.
 *
 * ⚠ MEMBERSHIP KEEPS ITS PLACE, LOWER DOWN, because it does display something
 * real — the membership cycle derived from `onboarding_completed_at ??
 * created_at`, and an honest *"Billing isn't wired up yet"*.
 * ⚠ CONTACT INFO IS THE ONE PEOPLE ARRIVE TO CHANGE: name, phone, location.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   /settings lands on Membership (J2.4 WS-G / E013).
 * //   It used to land on the profile form. Membership answers "what am I paying
 * //   for and what does it get me", which is the question people arrive at
 * //   Settings holding — whereas opening on a form made the whole area read as a
 * //   place you go to fill something in rather than a place you go to check
 * //   something.
 * ⚠⚠ THAT REASONING IS NOT WRONG ABOUT THE QUESTION PEOPLE HOLD — it is wrong
 * about what a LANDING page should be. A page you cannot act on is a poor door.
 */
export default function SettingsIndex() {
  redirect("/settings/contact");
}
