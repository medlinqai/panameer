/**
 * The requester wizard's step list — deliberately in its own module with NO
 * server imports.
 *
 * The wizard is a client component and needs the order and the type; the rest
 * of `requester-onboarding.ts` imports Prisma, so importing the list from there
 * dragged `pg` into the browser bundle and the build failed on `Can't resolve
 * 'dns'`. Client-safe constants live apart from the server logic that uses them.
 */
export const REQUESTER_STEPS = [
  "company",
  "requester_info",
  "buyer_approver",
  "work_location",
  "review",
] as const;

export type RequesterStep = (typeof REQUESTER_STEPS)[number];
