/**
 * Panameer's policy documents (J2.4 WS-E / E011).
 *
 * PLACEHOLDERS, and declared in one place so they are honest placeholders
 * rather than dead links. The brief defers the real legal text; what it does
 * not defer is the account-health page linking somewhere. Linking to a
 * competitor's guidelines — which is what the surface this replaces did — is
 * worse than linking to a page that says the document is being written.
 *
 * `summary` is what we can already state truthfully about each one, so a
 * provider who clicks through learns something rather than hitting a stub.
 */
export type Policy = {
  slug: string;
  title: string;
  summary: string;
};

export const POLICIES: Policy[] = [
  {
    slug: "community-guidelines",
    title: "Community Guidelines",
    summary:
      "How providers, recruiters and buyers are expected to behave on Panameer: honest profiles, work delivered as described, and conversations kept professional.",
  },
  {
    slug: "trust-and-safety",
    title: "Trust & Safety",
    summary:
      "How Panameer protects both sides of a transaction — what we verify, what we monitor, and what happens when something goes wrong.",
  },
];

export function findPolicy(slug: string): Policy | undefined {
  return POLICIES.find((p) => p.slug === slug);
}
