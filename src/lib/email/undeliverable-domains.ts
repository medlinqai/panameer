
export const UNDELIVERABLE_DOMAINS: readonly string[] = [
  "example.com", // RFC 2606 — reserved, never resolves. 64 rows hold one.
  "example.net", // RFC 2606 — same family, listed so it cannot be the next gap.
  "example.org", // RFC 2606 — same.
  "example.seed", // OURS — the seed fixtures. 25 rows.
  ".test", // RFC 6761 — reserved for testing. `*.test`.
  ".invalid", // RFC 6761 — reserved, guaranteed invalid. `*.invalid`.
  ".example", // RFC 6761 — reserved for documentation. `*.example`.
  "fakeemail.com", 
];

export function undeliverableRule(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  const domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain) return null;
  for (const rule of UNDELIVERABLE_DOMAINS) {
    if (rule.startsWith(".")) {
      if (domain.endsWith(rule) || domain === rule.slice(1)) return rule;
    } else if (domain === rule) {
      return rule;
    }
  }
  return null;
}
