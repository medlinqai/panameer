import type { Metadata } from "next";
import { AssessmentWizard } from "@/components/assessment/AssessmentWizard";

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

export default function AssessPage() {
  return <AssessmentWizard />;
}
