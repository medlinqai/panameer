/**
 * The requester wizard's step list — deliberately in its own module with NO
 * server imports.
 *
 * The wizard is a client component and needs the order and the type; the rest
 * of `requester-onboarding.ts` imports Prisma, so importing the list from there
 * dragged `pg` into the browser bundle and the build failed on `Can't resolve
 * 'dns'`. Client-safe constants live apart from the server logic that uses them.
 */
/*
  ── ⚠⚠ THREE STEPS, NOT FOUR (`P1-A1.4-E418`, 2026-09-11) ───────────────────

  ⚠ SUPERSEDED, quoted not deleted: this list read
  `company · requester_info · work_location · review` until `E418`, and
  `company · requester_info · buyer_approver · work_location · review` before
  `E263` removed the approver step.

  SCOTT, 2026-09-11: *"Regarding the company… strip it all out."* And on WHY it
  cannot be asked here even as a label: *"For ALL users (buyers and sellers) we
  will get their company information during the work order acceptance. IF you
  are going to accept the WO... on behalf of whom?"*

  ⚠⚠ THE PO IS THE FIRST TIME A COMPANY NAME EXISTS FOR AN ERP CLIENT, so the
  web path must not demand one earlier — the two paths have to agree on when a
  buyer becomes a company. To register, read communities, search talent and
  service products, connect, learn, post a work request, create a service
  product, interview and request a test, Panameer needs ONLY the person's
  details.

  ⚠ THE COMPANY IS CAPTURED EXACTLY ONCE, AT WORK ORDER ACCEPTANCE. That gate is
  NOT BUILT — see the TODO on `acceptOrder` in `lib/orders.ts`, which is the
  single capture point. A gate written anywhere earlier is the defect this
  removed.

  ⚠ `Person.company_id` STILL EXISTS AND IS STILL SEEDED at signup — it is the
  P-Account → Company → Site → Address → Person backbone, not an answer the
  requester gave. `E418` removed the QUESTION, not the column.

  ⚠⚠ THIS LIST IS MIRRORED BY THE `RequesterOnboardingStep` ENUM in
  `schema.prisma` (`E271`) — it stopped being a free String so the admin
  progression strip could count buckets that are actually enumerable. THE TWO
  MUST STAY IN STEP. Adding a value here without adding it there means a resume
  point the database will refuse to store. ⚠ `E418` moved BOTH, and moved the
  column's `@default` off `company` with them.

  Scott: *"we can leave it in the first onboarding page (for now), but it is
  likely to come out at some point."* So the SCREEN is gone and the MODEL is
  not: `buyer_name`, `buyer_email`, `approver_name` and `approver_email` stay
  on `RequesterProfile`, stay `nullish()` in the step route's zod schema, and
  nothing gates on them. Removing a step is not removing a column.

  ⚠ THIS LIST IS MIRRORED BY THE `RequesterOnboardingStep` ENUM in
  `schema.prisma` (`E271`) — it stopped being a free String so the admin
  progression strip could count buckets that are actually enumerable. THE TWO
  MUST STAY IN STEP. Adding a value here without adding it there means a resume
  point the database will refuse to store.
*/
export const REQUESTER_STEPS = [
  "requester_info",
  "work_location",
  "review",
] as const;

export type RequesterStep = (typeof REQUESTER_STEPS)[number];

/**
 * ⚠⚠ SCOTT'S NAMES FOR THE PRE-FLIGHT CARDS (`P1-J1.1-E243` + `E259`).
 *
 * `join/requester/start` used to HARDCODE three cards while the wizard ran
 * five steps, so the intro promised a shape the wizard did not deliver. The
 * cards are now derived from `REQUESTER_STEPS` and read their names from here,
 * which is why the count can never drift again.
 *
 * Scott, 2026-08-30: *"the tile names are not correct based on the data being
 * captured at each of those steps."*
 * ⚠ SUPERSEDED, quoted not deleted — chat's earlier draft was
 * *"Your Company · You · Work Location"*, and the hardcoded cards before that
 * read *"Your company · You and your approver · Where the work happens"*.
 *
 * ⚠ `company: "Company Details"` LEFT THIS MAP WITH THE STEP (`E418`). The cards
 * derive from `REQUESTER_WORK_STEPS`, so the intro page went from three tiles to
 * two WITHOUT ANY HAND-EDITING — which is the property `E243`/`E259` built and
 * the one the acceptance criteria re-assert.
 *
 * ⚠ `review` IS DELIBERATELY ABSENT. It is not work the requester does; it is
 * the wizard showing back what they already answered. The start page filters it
 * out rather than this map carrying a name nobody should render.
 * ⚠ THESE ARE NOT THE STEPPER'S LABELS. The in-wizard stepper keeps its own
 * `LABELS` map in `join/requester/steps/page.tsx` ("Your Company",
 * "Requester Information", "Work Location") — Scott named the TILES, not the
 * stepper, and the difference is reported rather than silently unified.
 */
export const REQUESTER_STEP_LABELS: Record<RequesterStep, string> = {
  requester_info: "Requester Details",
  work_location: "Location Details",
  review: "Review",
};

/** The steps that are actual work — what the pre-flight cards count. */
export const REQUESTER_WORK_STEPS = REQUESTER_STEPS.filter(
  (s) => s !== "review"
) as Exclude<RequesterStep, "review">[];
