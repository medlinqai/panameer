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

export function domainMatches(
  userEmail: string | null | undefined,
  companyDomain: string | null | undefined
): boolean {
  const a = emailDomain(userEmail);
  const b = (companyDomain ?? "").trim().toLowerCase() || null;
  return !!a && !!b && a === b && isWorkDomain(a);
}

export const CLAIM_TERMS_NOTICE =
  "Claiming your results creates your Panameer account and accepts the Terms of Use and Privacy Policy.";

