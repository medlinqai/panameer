export function jobKey(
  employer: string | null | undefined,
  roleTitle: string | null | undefined
): string {
  return `${employer ?? ""}|${roleTitle ?? ""}`.toLowerCase().trim();
}
