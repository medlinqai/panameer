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
      "How providers and buyers are expected to behave on Panameer: honest profiles, work delivered as described, and conversations kept professional.",
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
