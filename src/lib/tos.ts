/**
 * Terms of Service versions — TWO TIERS (brief_company_model WS6).
 *
 *   User ToS    — each person accepts at signup (User.tos_accepted_at).
 *   Company ToS — the ENTITY's agreement to do business with Panameer,
 *                 accepted by its admin on the company's behalf, recorded on
 *                 the Company, and re-accepted when this version bumps.
 *
 * ⚠ THE DOCUMENTS THEMSELVES ARE NOT WRITTEN. /terms and /privacy were linked
 * from the signup checkbox and returned 404 — people were ticking "I agree to
 * the Terms of Service" against a missing page, and we recorded the acceptance.
 * The routes now exist and say plainly that the legal copy is pending, because
 * an honest placeholder is the only version of this a machine should author.
 * Real terms have to come from Scott and counsel; when they land, bump the
 * version below and every company is asked to re-accept.
 */
export const USER_TOS_VERSION = "2026-08-draft";
export const COMPANY_TOS_VERSION = "2026-08-draft";

/** Has this company accepted the CURRENT company ToS? */
export function companyTosCurrent(company: {
  company_tos_accepted_at: Date | null;
  company_tos_version: string | null;
}): boolean {
  return (
    !!company.company_tos_accepted_at &&
    company.company_tos_version === COMPANY_TOS_VERSION
  );
}

/**
 * Free-mail domains never auto-approve a join (brief default).
 *
 * Sharing gmail.com with somebody is not evidence you work with them, and this
 * is the one place a wrong answer silently hands a stranger a company binding.
 */
const FREE_MAIL = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "example.com",
]);

/** The bare domain of an email, lowercased. Null when there isn't one. */
export function emailDomain(email: string | null | undefined): string | null {
  const at = (email ?? "").trim().toLowerCase().lastIndexOf("@");
  if (at < 0) return null;
  const domain = email!.trim().toLowerCase().slice(at + 1);
  return domain.includes(".") ? domain : null;
}

/** Is this a work domain — i.e. one that may stand in for an employer? */
export function isWorkDomain(domain: string | null): boolean {
  return !!domain && !FREE_MAIL.has(domain);
}

/**
 * v1 domain match: exact, case-insensitive, work domains only.
 *
 * Deliberately not a verification — nobody proved they control the mailbox
 * beyond the signup verification email, and nobody proved the company owns the
 * domain. It is a convenience that skips the admin queue for the obvious case,
 * and the brief scopes it that way explicitly.
 */
export function domainMatches(
  userEmail: string | null | undefined,
  companyDomain: string | null | undefined
): boolean {
  const a = emailDomain(userEmail);
  const b = (companyDomain ?? "").trim().toLowerCase() || null;
  return !!a && !!b && a === b && isWorkDomain(a);
}

/**
 * ⚠⚠ THE TERMS NOTICE FOR THE FRICTIONLESS PATHS (`P1-ALL-E384` WS-1a/1b).
 *
 * SCOTT, 2026-09-04: *"yes, everyone needs to accept ToS...fix."*
 *
 * The assessment-claim flow and OAuth sign-in both create an account WITHOUT a
 * signup form, so neither has a terms checkbox. ⚠ THAT FRICTIONLESSNESS IS
 * DELIBERATE AND HAD TO SURVIVE — the claim flow is the top of the funnel, and a
 * control would add a second step to a one-step flow.
 *
 * ⚠⚠ SO THE CLICK IS THE AFFIRMATIVE ACT, AND WHAT MAKES THAT LEGITIMATE IS
 * THAT THE TERMS ARE NAMED AND REACHABLE. AN AGREEMENT NOBODY COULD READ BEFORE
 * AGREEING IS NOT ONE.
 *
 * ⚠ CC-AUTHORED COPY, from the brief's own wording. Scott can overrule it here,
 * in one place, and both paths change together.
 */
export const CLAIM_TERMS_NOTICE =
  "Claiming your results creates your Panameer account and accepts the Terms of Use and Privacy Policy.";

