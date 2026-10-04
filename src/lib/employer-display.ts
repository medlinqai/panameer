
export const NO_EMPLOYER_LABEL = "Independent";

export function employerDisplayName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  return trimmed === "" ? NO_EMPLOYER_LABEL : trimmed;
}

/** `true` when there is a real company name to show. */
export function hasEmployerName(name: string | null | undefined): boolean {
  return (name ?? "").trim() !== "";
}
