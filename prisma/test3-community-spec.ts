import { createHash } from "node:crypto";

/**
 * ── ⚠⚠ THE WALK ACCOUNT'S COMMUNITY, AS DATA (`P2-J3-E591`) ───────────────
 *
 * ⚠⚠⚠ SCOTT AUTHORISED THIS SEED EXPLICITLY, 2026-09-20, NAMING `E564`. That
 * rule — *"never seed to make a surface demonstrable"* — is what normally
 * forbids exactly this file, and rule 13 says Scott's newest dated word is the
 * live one. ⚠ **This is an authorised exception, not a precedent.** Nothing
 * else may be seeded on the strength of it.
 *
 * ── ⚠ WHY IT WAS NEEDED ────────────────────────────────────────────────────
 *
 * ⚠⚠ `test3@panameer.com` — the account EVERY signed-in gate signs in as — had
 * ZERO colleagues and ZERO invitations. So `E591`'s community web could only be
 * walked empty, and its populated case had to be proved by doubling the API
 * route in Playwright. ⚠ A route double proves the RENDER; it cannot prove the
 * QUERIES, the joins, or that a second degree exists in this schema at all.
 *
 * ⚠⚠ THE OTHER ROUTE WAS CLOSED ON PURPOSE: the 27 seeded rows sit on
 * `iamscottwalls@outlook.com`, whose seed password does not match its stored
 * hash (`E580`), and **resetting it is forbidden by name.** This touches no
 * password and no `User` row.
 *
 * ── ⚠ IT CONNECTS PEOPLE WHO ALREADY EXIST. IT MINTS NOBODY ────────────────
 *
 * ⚠⚠ NO `User`, NO `Person`, NO `ProviderProfile` IS CREATED. Row counts are
 * quoted by other gates and briefs (`E569` says so in terms), and a seed that
 * invents people moves numbers nobody expected to move. ⚠ Every name below is
 * resolved from the database BY EMAIL, and a missing one FAILS LOUDLY rather
 * than being skipped — a partially-seeded graph is worse than none, because it
 * looks like a result.
 */

export const WALK_EMAIL = "test3@panameer.com";
export const MANIFEST_PATH = "prisma/seed-data/test3-community-manifest.json";

/**
 * ⚠ The six first-degree colleagues. All six carry a photo AND a title — chosen
 * so the JOINED node state (*photo inside a magenta halo*) is what actually
 * renders, since that is the state a photo-less pool could not demonstrate.
 * ⚠⚠ MEASURED 2026-09-20: only twelve distinct people in the whole database
 * have both, so this is most of them and the list cannot grow much.
 */
export const COLLEAGUES = [
  "test25@panameer.com", // Joe Flacco (25) — Oracle Cloud Supply Chain Expert
  "test26@panameer.com", // Jamal Lewis (26) — Oracle Cloud Expert
  "test29@panameer.com", // Rick Allen (29) — App-Specific - HCM
  "test10@panameer.com", // Layne Staley (10) — Rockstar of Oracle HCM
  "test_user8@medlinq.ai", // Tommy Lee (8) — Head of Sourcing
  "test_user5@medlinq.ai", // Test User 5 — Director of Procurement
] as const;

/**
 * ⚠⚠ THE SECOND DEGREE — a colleague's colleague, which is the `reachable` tier
 * and the one `E591` WS-B had to write a new graph read for.
 *
 * ⚠⚠⚠ `test11` APPEARS TWICE, DELIBERATELY. They are reachable through BOTH
 * `test25` and `test_user8`, which is the case that proves the web draws ONE
 * node rather than one per path — *"somebody reachable three ways is still one
 * person"*. ⚠ Without a duplicate in the data that rule is untested.
 *
 * ⚠ NOBODY HERE IS A COLLEAGUE OF THE WALK ACCOUNT, which is what makes them
 * second degree rather than first.
 */
export const SECOND_DEGREE: readonly (readonly [string, string])[] = [
  ["test25@panameer.com", "test11@panameer.com"],
  ["test25@panameer.com", "test19@panameer.com"],
  ["test26@panameer.com", "test21@panameer.com"],
  ["test26@panameer.com", "test24@panameer.com"],
  ["test29@panameer.com", "test30@panameer.com"],
  ["test10@panameer.com", "iamscottwalls@outlook.com"],
  ["test_user8@medlinq.ai", "test11@panameer.com"], // ⚠ the shared one
] as const;

/**
 * ── ⚠⚠ TWO INVITATIONS, AND ONE OF THEM HAS LAPSED ON PURPOSE ─────────────
 *
 * ⚠⚠⚠ THE LAPSED ROW IS THE POINT. `ColleagueInviteStatus` has an `EXPIRED`
 * value and **nothing in the application ever writes it** (measured
 * 2026-09-20), so `community-web.ts` filters on `expires_at > now` instead. ⚠ A
 * row that is `PENDING` with a date in the past is the ONLY thing that can tell
 * a correct filter from one that trusts `status` — and without it, the bug
 * would ship green.
 *
 * ⚠⚠ THE ADDRESSES ARE `example.com` ON PURPOSE. That domain is in
 * `UNDELIVERABLE_DOMAINS`, so the transport REFUSES it — which means a `Resend`
 * or `Nudge` control clicked during a walk can never put mail in a stranger's
 * inbox. ⚠ Localhost has sent real mail to real addresses since 2026-09-11; a
 * seeded invitation carrying a deliverable address would be one misplaced click
 * from exactly that.
 * ⚠ This file WRITES ROWS DIRECTLY and never calls `inviteColleague`, so no
 * mail is sent by seeding either.
 */
export const INVITES = [
  {
    email: "dana.whitfield@example.com",
    firstName: "Dana",
    lastName: "Whitfield",
    /** ⚠ Live: it still has three weeks to run. */
    expiresInDays: 21,
  },
  {
    email: "marcus.oyelaran@example.com",
    firstName: "Marcus",
    lastName: "Oyelaran",
    /** ⚠⚠ LAPSED — three days PAST its expiry, still `PENDING`. */
    expiresInDays: -3,
  },
] as const;

/**
 * ⚠ A deterministic, namespaced token hash. `token_hash` is `@unique`, so it
 * needs a value; making it a hash of a FIXED string keyed to this seed means
 * re-running is an upsert rather than a duplicate-key crash.
 * ⚠⚠ IT IS NOT A USABLE TOKEN AND MUST NOT BECOME ONE — the pre-image is this
 * literal, which is in the repository. A seeded invitation is for LOOKING at,
 * not for accepting; `lookupColleagueInvite` hashes a raw token from a URL and
 * nothing here can produce one.
 */
export function seedTokenHash(email: string): string {
  return createHash("sha256").update(`p2-j3-e591-seed:${email}`).digest("hex");
}

/** ⚠ Every address this spec touches, so the seed can resolve them in one query. */
export function allEmails(): string[] {
  return [
    WALK_EMAIL,
    ...COLLEAGUES,
    ...SECOND_DEGREE.flatMap(([a, b]) => [a, b]),
  ].filter((v, i, a) => a.indexOf(v) === i);
}

export type ManifestRow = {
  id: string;
  /** ⚠⚠ Whether THIS SEED created the row, or found one already there. */
  created: boolean;
};

export type Manifest = {
  writtenAt: string;
  connections: ManifestRow[];
  invites: ManifestRow[];
};
