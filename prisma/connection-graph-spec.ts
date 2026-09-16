/**
 * THE SEEDED CONNECTION GRAPH — THE SPEC BOTH SCRIPTS READ.
 *
 * ⚠⚠ THIS FILE IS THE REASON THE WIPE IS EXACT. `seed-connection-graph.ts` and
 * `wipe-connection-graph.ts` both import it, so the set of rows the wipe removes
 * is the same set the seed creates BY CONSTRUCTION — not by a tag, a naming
 * convention, or a timestamp window.
 *
 * ⚠ `Connection` HAS NO COLUMN TO TAG A ROW WITH. Its columns are
 * `id · from_user_id · to_user_id · kind · status · created_at · responded_at`
 * (`schema.prisma`, model `Connection`) — no `source`, no `note`, no `seeded`
 * flag. Adding one would be a schema change, and this work is data-only. So
 * identity comes from the (from, to, kind) triples enumerated below, which are
 * unique per the model's own `@@unique([from_user_id, to_user_id, kind])`.
 *
 * ⚠⚠ NOTHING HERE IS "take the first N people". Every participant is named by
 * EMAIL. A seed that picks rows by `take: 12` seeds a different graph every time
 * the table changes, and then the wipe cannot know what it removed.
 *
 * ── ⚠ WHAT IS DELIBERATELY NOT SEEDED ────────────────────────────────────────
 *
 * **People You May Know.** `getColleagueSuggestions` derives from `Employer`
 * overlap, shared `Project` clients, and specialization+region — and `Employer`
 * hangs off `ProviderProfile`, not `Person`. The walk account has ONE employer
 * (Ceres Insurance, 2026) and zero specializations, and of the whole seeded
 * cast only `admin@panameer.com` has a `ProviderProfile` at all. Making that
 * block fire would mean CREATING ProviderProfiles for the cast, which collides
 * with the ONE-RECORD-PER-PROVIDER rule in `security_architecture.md`. That is a
 * product decision, not a seeding one, so this script does not touch it.
 */

/** ⚠ The account the graph is centred on. Scott walks the app as this user. */
export const WALK_EMAIL = "iamscottwalls@outlook.com";

/**
 * ⚠⚠ THE TITLE IS DATA THIS SCRIPT OWNS AND MUST GIVE BACK. Scott, 2026-09-16:
 * *"set a title on that Person so my own card doesn't render thin"*. The wipe
 * restores whatever was there before (it was `null`), which is why the manifest
 * records the previous value rather than assuming it.
 */
export const WALK_TITLE = "Oracle Cloud Procurement Lead";

/** ⚠ ACCEPTED colleagues of the walk account. Order is the mutual-count design. */
export const COLLEAGUES = [
  "test_user8@medlinq.ai", // C1 Tommy Lee (8) — Head of Sourcing
  "test10@panameer.com", // C2 Layne Staley (10) — Rockstar of Oracle HCM
  "test19@panameer.com", // C3 Renae Requester (19) — Project Manager
  "test24@panameer.com", // C4 Ronnie Requester (24) — Contingent Labor Requester
  "test25@panameer.com", // C5 Joe Flacco (25) — Oracle Cloud Supply Chain Expert
  "test26@panameer.com", // C6 Jamal Lewis (26) — Oracle Cloud Expert
  "test_user5@medlinq.ai", // C7 Test User 5 — Director of Procurement
] as const;

/** ⚠ PENDING, sent TO the walk account → "Requests waiting on you" fires. */
export const INBOUND_PENDING = [
  "test30@panameer.com", // Stevie Clarke (30)
  "test29@panameer.com", // Rick Allen (29)
] as const;

/** ⚠ PENDING, sent BY the walk account → "Waiting on them" fires. */
export const OUTBOUND_PENDING = [
  "test21@panameer.com", // Bobby Da Buyer (21)
  "test11@panameer.com", // Layne Staley (11)
  "test32@panameer.com", // Phil Collins (32)
] as const;

/**
 * ⚠ DECLINED, one in each direction.
 * ⚠⚠ NEITHER RENDERS ANYWHERE — `declinedCount` is returned by `getMyCommunity`
 * and drawn on no surface, by design (the lib: *"putting '3 people said no' on
 * somebody's own page would be cruelty with no purpose"*). They are seeded so
 * the count is provably non-zero and so the DECLINED state is exercised.
 */
export const DECLINED_OUTBOUND = "test27@panameer.com"; // Ray Lewis (27) — they said no to me
export const DECLINED_INBOUND = "test28@panameer.com"; // Ed Reed (28) — I said no to them

/** ⚠ MENTOR rows FROM the walk account → "Your mentors" fires. */
export const MENTORS_I_FOLLOW = [
  "test18@panameer.com", // Nicko McBrain (18)
  "test15@panameer.com", // Bruce Dickinson (15)
] as const;

/**
 * ⚠⚠ MENTOR rows TO the walk account → the magenta panel fires.
 * ⚠ THIS IS THE ONLY PLACE IN THE PRODUCT WHERE A MEMBER LEARNS THEY ARE A
 * MENTOR. Scott, 2026-09-03: *"everyone CAN be. the determining factor is if
 * anyone wants you to be...and therefore makes a request from you."* Seeding
 * two is what makes that panel walkable at all.
 */
export const MENTORS_WHO_FOLLOW_ME = [
  "test14@panameer.com", // Bobby Blotzer (14)
  "test2@panameer.com", // Ringo Starr
] as const;

/**
 * ⚠⚠ COLLEAGUE-TO-COLLEAGUE EDGES — THIS IS WHAT MAKES MUTUALS NON-TRIVIAL.
 *
 * A mutual connection between the walk account and colleague C is a person who
 * is an ACCEPTED COLLEAGUE of BOTH. Since every name below is already a
 * colleague of the walk account, C's mutual count is simply its degree in this
 * list — which is why the counts are designed here rather than discovered.
 *
 * ⚠ Designed spread: C7 shares 1 · C4 and C5 share 2 · C1, C3, C6 share 3 ·
 * C2 shares 4. Scott asked for *"some pairs sharing 1, some sharing 3+"*.
 */
export const COLLEAGUE_EDGES: readonly (readonly [string, string])[] = [
  ["test_user8@medlinq.ai", "test10@panameer.com"], // C1–C2
  ["test_user8@medlinq.ai", "test19@panameer.com"], // C1–C3
  ["test_user8@medlinq.ai", "test24@panameer.com"], // C1–C4
  ["test10@panameer.com", "test19@panameer.com"], // C2–C3
  ["test10@panameer.com", "test25@panameer.com"], // C2–C5
  ["test10@panameer.com", "test26@panameer.com"], // C2–C6
  ["test19@panameer.com", "test24@panameer.com"], // C3–C4
  ["test25@panameer.com", "test26@panameer.com"], // C5–C6
  ["test26@panameer.com", "test_user5@medlinq.ai"], // C6–C7
] as const;

export type Kind = "COLLEAGUE" | "MENTOR";
export type Status = "PENDING" | "ACCEPTED" | "DECLINED";

/** One row, addressed by email so it is readable and diffable. */
export type PlannedRow = {
  fromEmail: string;
  toEmail: string;
  kind: Kind;
  status: Status;
  /** ⚠ Set for every non-PENDING row. See the note in `buildPlan`. */
  responded: boolean;
};

/**
 * ⚠⚠ THE WHOLE GRAPH, DERIVED ONCE, USED BY BOTH SCRIPTS.
 *
 * ⚠ `responded_at` IS NOT DECORATION. `check:community` (E372/1) asserts that no
 * ACCEPTED colleague write lands without one, and `lib/connections.ts` sets it at
 * creation for MENTOR rows so an ACCEPTED mentor row is distinguishable from a
 * colleague row that skipped acceptance. Seeded rows follow the same rule the
 * application follows — a seed that writes shapes the app cannot produce is a
 * seed that tests nothing.
 */
export function buildPlan(): PlannedRow[] {
  const rows: PlannedRow[] = [];

  for (const email of COLLEAGUES) {
    rows.push({
      fromEmail: WALK_EMAIL,
      toEmail: email,
      kind: "COLLEAGUE",
      status: "ACCEPTED",
      responded: true,
    });
  }

  /* ⚠ DIRECTION IS CANONICALISED so a pair can never be emitted twice and trip
     the model's own unique constraint. */
  for (const [a, b] of COLLEAGUE_EDGES) {
    const [from, to] = a < b ? [a, b] : [b, a];
    rows.push({ fromEmail: from, toEmail: to, kind: "COLLEAGUE", status: "ACCEPTED", responded: true });
  }

  for (const email of INBOUND_PENDING) {
    rows.push({ fromEmail: email, toEmail: WALK_EMAIL, kind: "COLLEAGUE", status: "PENDING", responded: false });
  }
  for (const email of OUTBOUND_PENDING) {
    rows.push({ fromEmail: WALK_EMAIL, toEmail: email, kind: "COLLEAGUE", status: "PENDING", responded: false });
  }

  rows.push({ fromEmail: WALK_EMAIL, toEmail: DECLINED_OUTBOUND, kind: "COLLEAGUE", status: "DECLINED", responded: true });
  rows.push({ fromEmail: DECLINED_INBOUND, toEmail: WALK_EMAIL, kind: "COLLEAGUE", status: "DECLINED", responded: true });

  for (const email of MENTORS_I_FOLLOW) {
    rows.push({ fromEmail: WALK_EMAIL, toEmail: email, kind: "MENTOR", status: "ACCEPTED", responded: true });
  }
  for (const email of MENTORS_WHO_FOLLOW_ME) {
    rows.push({ fromEmail: email, toEmail: WALK_EMAIL, kind: "MENTOR", status: "ACCEPTED", responded: true });
  }

  return rows;
}

/** Every address the graph touches, including the walk account. */
export function allEmails(): string[] {
  const plan = buildPlan();
  return [...new Set(plan.flatMap((r) => [r.fromEmail, r.toEmail]))];
}

/** ⚠ Where the seed records exactly what it wrote, for an id-exact wipe. */
export const MANIFEST_PATH = "prisma/seed-data/connection-graph-manifest.json";

export type Manifest = {
  seededAt: string;
  walkEmail: string;
  walkPersonId: string;
  /** ⚠ What `Person.title` held BEFORE the seed, restored verbatim on wipe. */
  previousWalkTitle: string | null;
  titleWasSet: boolean;
  connectionIds: string[];
};
