import type { Metadata } from "next";
import { AssessmentWizard } from "@/components/assessment/AssessmentWizard";
import { getSpecializations } from "@/lib/catalog";

/**
 * ⚠ ISR, NOT DYNAMIC — the whole reason this constant exists.
 *
 * Step 0 now reads the industry list from the catalog. A request-time DB read
 * would turn `/assess` into a dynamic (ƒ) render, putting a cold database round
 * trip in front of the one page the entire funnel opens with. `revalidate`
 * keeps it prerendered and refreshes it in the background instead: the build
 * marks it ● rather than ƒ.
 *
 * 3600s because industries change roughly never — they are a ten-row catalog an
 * admin edits by hand. An hour of staleness on an industry rename is free; a
 * dynamic render on every visit is not.
 */
export const revalidate = 3600;

/**
 * /assess — where "Where Can AI Help My Business?" goes.
 *
 * PUBLIC AND UNGATED. The whole model is that the diagnostic is free and the
 * email is the only thing asked for, so a login wall here would be asking for
 * the account before giving the reason to want one. It is on the public
 * allowlist in route-access.ts alongside the other pre-account surfaces.
 *
 * ⚠⚠ IT NOW CARRIES THE FULL PUBLIC CASING (`P1-J1.1-E246`), BY CONSTRUCTION.
 * ⚠ SUPERSEDED, quoted not deleted: *"FOCUSED CHROME, NO MARKETING NAV.
 * `WizardShell` brings its own frame — logo top-left and nothing else — which is the
 * same rule the signup wizards follow (NAV_MODEL_LOCKED "Exceptions"): a nav bar full
 * of exits is wrong on a page whose entire job is to be finished."*
 *
 * That was true of the signup wizards AND of this page, and BOTH changed together.
 * Scott, 2026-08-29: **"ALL Pages must use a casing."** `E246` put `MarketingHeader`
 * and `MarketingFooter` on `OnboardingFrame`; this page renders `WizardShell`, which
 * renders that frame, so the change reaches here whether or not a brief names it.
 *
 * ⚠ THAT IS `P1-J0.4-E010` BEING HONOURED, NOT REVERSED. Scott's own words there:
 * *"Why would we have one casing for onboarding and a different style for this public
 * solicitation of data? Make this like the casing for user registration/onboarding."*
 * The rule is that `/assess` MATCHES onboarding. The onboarding casing is what moved,
 * so this page follows it. ⚠ Do not re-focus this chrome on the strength of the
 * superseded paragraph above — it is history.
 * ⚠ NOTHING ELSE DEPENDED ON THIS PAGE HAVING NO NAV — checked across `e2e/` and
 * `e2e-shell/` before the change; the app-shell public list is `/`, `/learn`,
 * `/talent`, `/work`, `/shop` and does not include this route.
 */
export const metadata: Metadata = {
  title: "Where can AI help my business? — Panameer",
  description:
    "A free AI maturity assessment. Answer for one process in about eight minutes and get a report sized in your own dollars.",
};

export default async function AssessPage() {
  /*
    THE SAME SOURCE `/admin/industries` READS. Fetched here in the Server
    Component and passed down because the list is public catalog data and
    AssessmentWizard is a Client Component.

    ⚠ THIS USED TO SAY "there is no session to authorise an API call". That was
    wrong, and it was the load-bearing kind of wrong: PUBLIC IS NOT ANONYMOUS. A
    signed-in buyer can take the assessment, and reading them as a stranger is
    what had the wizard asking for an email the app already knew.

    The session is now read — but by the WIZARD, on the client, and not here.
    `revalidate` above keeps this route ○; a server-side session read is a
    cookie read, which bails the route out of static generation and turns it ƒ.
    Measured: it takes the build's static count from 22 to 21.

    Nothing security-bearing rides on the client read. It decides only what the
    visitor is shown; `api/assessment/route.ts` resolves `user_id` and the
    stored email from its own session, per CLAUDE.md rule 3, and ignores
    whatever the browser posted. See the long comment in AssessmentWizard.
  */
  const groups = await getSpecializations();
  const industries = (groups.find((g) => g.kind === "INDUSTRY")?.items ?? [])
    .map((i) => ({ id: i.id, name: i.name }))
    /* Alphabetical: ten items need no typeahead, but they do need an order a
       visitor can scan. `getSpecializations` sorts by sort_order first, which
       is the admin's display order, not a reader's. */
    .sort((a, b) => a.name.localeCompare(b.name));

  return <AssessmentWizard industries={industries} />;
}
