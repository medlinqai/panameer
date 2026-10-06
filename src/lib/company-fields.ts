import { OnboardingError } from "@/lib/onboarding";

// Company Details field checks (2026-10-05): every refusal names its field and says what to type.
export class CompanyFieldError extends OnboardingError {
  constructor(public field: string, message: string) {
    super(message, "INVALID");
  }
}

/** "https://www.StratERP.com/about" → "straterp.com"; null when it isn't a domain. */
export function websiteDomain(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return null;
  const host = v.replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[/?#:]/)[0];
  return /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(host) ? host : null;
}

/** Tax IDs compare by digits only: "12-3456789" = "123456789". */
export const tinDigits = (raw: string | null | undefined) => (raw ?? "").replace(/\D/g, "") || null;

export function checkCompanyFields(input: { name?: string; website?: string | null; ein?: string | null; description?: string | null }, max: number) {
  if (input.name !== undefined && input.name.trim().length < 2) throw new CompanyFieldError("name", "Enter the company name (at least 2 characters).");
  if (input.website && !websiteDomain(input.website)) throw new CompanyFieldError("website", "Enter a website like strateerp.com");
  if (input.ein && (tinDigits(input.ein) ?? "").length < 6) throw new CompanyFieldError("ein", "Enter the tax ID with its digits, like 12-3456789.");
  if (input.description && input.description.trim().length > max) throw new CompanyFieldError("description", `Keep the description to ${max} characters.`);
}
