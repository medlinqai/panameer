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
 * FOCUSED CHROME, NO MARKETING NAV. `WizardShell` brings its own frame — logo
 * top-left and nothing else — which is the same rule the signup wizards follow
 * (NAV_MODEL_LOCKED "Exceptions"): a nav bar full of exits is wrong on a page
 * whose entire job is to be finished.
 */
export const metadata: Metadata = {
  title: "Where can AI help my business? — Panameer",
  description:
    "A free AI maturity assessment. Answer for one process in about eight minutes and get a report sized in your own dollars.",
};

export default async function AssessPage() {
  /*
    THE SAME SOURCE `/admin/industries` READS. Fetched here in the Server
    Component and passed down, because AssessmentWizard is a Client Component
    and /assess is public — there is no session to authorise an API call, and
    the list is public catalog data anyway.
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
