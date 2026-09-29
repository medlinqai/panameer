import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";

/**
 * ── ⚠⚠⚠ COMPANY SETTINGS ALREADY SHIPPED — ON `/company` (`P2-ALL-E708`) ────
 *
 * ⚠⚠ **`E661` BUILT THE EDITING CAPABILITY THIS PAGE WAS A PLACEHOLDER FOR, AND PUT
 * IT ON `/company`.** `company.ts:534` records why, in Scott's words: walking
 * `/company` he said ***"I cannot edit any of the data."*** The page rendered `name`,
 * `tax_type` and `email_domain` as text and offered **no control at all**.
 * ⚠ That comment names this very file as the placeholder it was working around:
 * *"`/company/settings` is a placeholder whose own docblock says 'only the content is
 * pending.'"*
 *
 * ⚠⚠⚠ **SO THE CONTROL EXISTS: `CompanyDetailsForm` RENDERS AT
 * `company/page.tsx:253`, FOR `binding.isAdmin && binding.status === "APPROVED"` —
 * WHICH IS A STRICTER GATE THAN THIS PAGE HAD.** This file checked `isAdmin` alone,
 * so **a `PENDING` joiner passed it**; `/company` additionally requires approval,
 * which is the rule `updateCompanyDetails` enforces server-side anyway (*"APPROVED
 * AND ADMIN"*).
 * ⚠⚠ **BUILDING A FORM HERE WOULD BE A SECOND HOME FOR ONE WRITER (`E585`), AND THE
 * TWO WOULD DRIFT** — this one starting with the weaker gate it already had.
 *
 * ── ⚠ EVERYBODY WAS ALREADY GOING TO `/company` ────────────────────────────
 *
 * ⚠ The old file sent non-admins to `/company` and its login `callbackUrl` was
 * **already `%2Fcompany`, not this route** — so the only person it did not forward
 * was an admin, and an admin is exactly who the form is for. ⚠⚠ **The redirect does
 * not change where anyone ends up except the one member who was being shown a
 * Coming-Soon card instead of the control they asked for.**
 * ⚠ `redirect`, not `permanentRedirect`: Scott may still rule that company admin
 * belongs on its own page, and a 308 cached in his browser would make that reversal
 * look broken.
 * ⚠⚠ **THE `callbackUrl` IS KEPT AS `%2Fcompany` VERBATIM** rather than switched to
 * `guardPage`, so the sign-in round trip lands where it always did.
 *
 * ⚠⚠ **REPORTED, NOT FIXED:** `nav.ts:1121` still labels this *"Company Settings"*
 * while `/company`'s heading is *"Company"*, so ruling 95's check 1 is not satisfied
 * by the redirect. **Menu names are Scott's** (`E533`) — either the item points at
 * `/company` directly or the destination takes the name.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — what this file was:
 * //   export const metadata = { title: "Company Settings · Panameer" };
 * //   const binding = await getCompanyBinding(viewer);
 * //   if (!binding?.isAdmin) redirect("/company");
 * //   return <ComingSoon title="Company Settings" />;
 * ⚠⚠ **`getCompanyBinding` IS NO LONGER IMPORTED HERE, AND THAT IS THE POINT:** the
 * binding decision now happens in exactly one place, on the page that owns the form.
 */
export default async function Page() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcompany");
  redirect("/company");
}
