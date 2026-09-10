import { redirect } from "next/navigation";

/**
 * `/settings/company` → `/company` (`P1-A1.4-E408` WS-2).
 *
 * ── ⚠⚠ SIX LINKS POINTED AT A PAGE THAT DID NOT EXIST ──────────────────────
 *
 * `identity-bar.ts:265/270/275` and `work-request-identity.ts:260/266/272` all
 * send a blocked person here, and `src/app/(app)/settings/` had no `company`
 * directory. ⚠ **A buyer refused a work-request post for a missing company
 * name or country was sent to a 404** — the escape hatch for the exact block
 * the identity bar had just applied.
 *
 * ⚠ IT IS A REDIRECT, NOT A SECOND FORM, AND THAT IS THE SMALLER FIX. `/company`
 * already renders `CompanyStepInline`, which `check:company-binding` GUARD 3
 * pins as reusing `CompanyStep` rather than forking it. A new page here would be
 * a second company form — the precise shape that guard exists to prevent.
 *
 * ⚠ ACCESS IS IDENTICAL, WHICH IS WHY THE REDIRECT IS SAFE. Measured:
 * `route-access.ts:84` gates the `/settings` prefix on `"authenticated"`, and
 * `(app)/company/page.tsx:41-42` does its own `getSessionViewer()` and redirects
 * to `/login` when there is none. ⚠ Neither is role-scoped, so nobody who could
 * reach `/settings/company` is refused at `/company`.
 *
 * ⚠ THE PATTERN IS ALREADY IN THIS TREE — `(app)/settings/tax/page.tsx` is a
 * redirect to `/settings/withdrawals` for the same reason: *"a 404 on a URL that
 * worked yesterday reads as a regression rather than a restructure."* Here the
 * URL never worked, which is worse.
 */
export default function SettingsCompanyRedirect() {
  redirect("/company");
}
