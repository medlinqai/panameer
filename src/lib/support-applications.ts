import { PROVIDER_NAV, REQUESTER_NAV, type NavItem } from "@/lib/nav";

/**
 * THE `application` DROPDOWN — the reporter's OWN rail, plus two
 * (`P2-J1.1-E032` WS-2).
 *
 * SCOTT, 2026-09-06: *"Medlinq calls the main menu options applications...so we
 * have the same (Learn | Hire | Shop | Orders | Payments)."*
 *
 * ⚠⚠ THOSE FIVE ARE THE BUYER RAIL, AND THE RAIL IS ROLE-DEPENDENT. `nav.ts`:
 * a buyer sees `Learn · Hire · Shop · Orders · Payments · Connect`; a provider
 * sees `Learn · **Work** · **Sell** · Orders · Payments · Connect`. Shipping the
 * five verbatim leaves a provider who hits a bug in `Sell` with nowhere to file
 * it. So the list is built from whichever rail the reporter is looking at.
 *
 * ⚠ DERIVED FROM `nav.ts`, NEVER HAND-WRITTEN. A second copy of the rail drifts
 * the moment one is renamed — the same failure `SettingsNav` and
 * `SettingsHeading` share one definition to avoid.
 *
 * ⚠ `Connect` IS INCLUDED. It is on BOTH rails and Scott's five omit it;
 * Messages, Forums, Mentoring and Teams all live under it, so its absence reads
 * as an oversight rather than a decision. Reported rather than dropped silently.
 */

/**
 * ── ⚠⚠ THE STORED VALUE IS THE JOURNEY, NOT THE LABEL ───────────────────────
 *
 * A ticket filed today must still be readable after a nav rename, so the label
 * cannot be the key. Neither can the href: `/contracts` became `/orders` inside
 * this product's own history (`P1-ALL-E380`).
 *
 * ⚠ SO THE KEY IS `heading` — the JOURNEY's name. `E378` established the model:
 * *the rail says which journey in one word, the tabs say which slice, and the
 * page heading says the journey's name.* The one-word rail label is the volatile
 * half (a VERB, which picks a side); `heading` is the stable half.
 *
 * ⚠⚠ AND IT MAKES THE MIRRORED SLOTS AGREE, WHICH IS THE POINT FOR TRIAGE. The
 * buyer's `Hire` and the provider's `Work` are ONE journey — both `Work
 * Requests` — so both file under `work-requests`. Same for `Shop`/`Sell` →
 * `service-products`. The reporter's own role is on the ticket, so nothing is
 * lost by filing them together, and the admin gets one queue per journey rather
 * than two halves of one.
 */
function journeyKey(item: NavItem): string {
  return (item.heading ?? item.label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type SupportApplication = { value: string; label: string };

/**
 * ⚠ ON NEITHER RAIL, AND THE FIRST ONE IS LOAD-BEARING.
 *
 * `onboarding` — signup and both wizards happen BEFORE the app shell exists, so
 * no rail item covers them. ⚠⚠ WITHOUT IT THE ENTIRE `P2-J1.1` WALK IS
 * UNFILEABLE: the employer-name defect, the Edit path, the verification email
 * and the review card belong to no rail item at all.
 * `other` — the escape hatch, so nobody picks a wrong answer to clear a required
 * field. A mis-filed ticket is worse than an unfiled category.
 */
const EXTRA: SupportApplication[] = [
  { value: "onboarding", label: "Onboarding" },
  { value: "other", label: "Other" },
];

/** The options this reporter should see, in rail order. */
export function supportApplicationsFor(isProvider: boolean): SupportApplication[] {
  const rail = isProvider ? PROVIDER_NAV : REQUESTER_NAV;
  return [
    ...rail.map((i) => ({ value: journeyKey(i), label: i.label })),
    ...EXTRA,
  ];
}

/**
 * Render a STORED value back for the admin list, which reads tickets from both
 * rails at once.
 *
 * ⚠ IT SEARCHES BOTH RAILS because the value is role-independent and the admin
 * is neither a buyer nor a seller. ⚠ AN UNKNOWN VALUE RETURNS ITSELF rather than
 * an empty cell — a ticket filed under a journey that has since been renamed
 * away must still show what it said, not blank.
 */
export function supportApplicationLabel(value: string): string {
  const extra = EXTRA.find((e) => e.value === value);
  if (extra) return extra.label;
  for (const item of [...REQUESTER_NAV, ...PROVIDER_NAV]) {
    if (journeyKey(item) === value) return item.heading ?? item.label;
  }
  return value;
}

/** Every value the API will accept — both rails plus the two extras. */
export function allSupportApplicationValues(): string[] {
  const set = new Set<string>(EXTRA.map((e) => e.value));
  for (const item of [...REQUESTER_NAV, ...PROVIDER_NAV]) set.add(journeyKey(item));
  return [...set];
}
