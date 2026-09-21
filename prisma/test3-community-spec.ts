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

/**
 * ⚠⚠ THE WALK ACCOUNT IS NOW THE GATE PERSONA, AND IT IS IMPORTED, NOT TYPED.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 *     export const WALK_EMAIL = "test3@panameer.com";
 * ⚠⚠⚠ `test3@panameer.com` is a RECRUITER in `Users.xlsx` and therefore cannot
 * satisfy `providerMeetsRequired` — see `prisma/gate-persona.ts` for the whole
 * reasoning. ⚠ The FILE NAMES here still say `test3` and that is left alone
 * deliberately: renaming four files and two npm scripts inside a data fix is
 * churn that would hide the one line that actually changed.
 */
export { GATE_PROVIDER_EMAIL as WALK_EMAIL } from "./gate-persona";
import { GATE_PROVIDER_EMAIL } from "./gate-persona";
export const MANIFEST_PATH = "prisma/seed-data/test3-community-manifest.json";

/**
 * ⚠ The six first-degree colleagues. All six carry a photo AND a title — chosen
 * so the JOINED node state (*photo inside a magenta halo*) is what actually
 * renders, since that is the state a photo-less pool could not demonstrate.
 * ⚠⚠ MEASURED 2026-09-20: only twelve distinct people in the whole database
 * have both, so this is most of them and the list cannot grow much.
 */
export const COLLEAGUES = [
  /*
    ── ⚠⚠⚠ THE WHOLE CAST WAS RE-POINTED AT `P0-E595` WS-B ───────────────────

    ⚠⚠ EVERY ONE OF THE SIX ORIGINAL ADDRESSES WAS DELETED BY THE RESET, and
    this spec FAILS LOUDLY on a missing name by design — so the seed could not
    run at all. ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   "test25@panameer.com",   // Joe Flacco (25) — Oracle Cloud Supply Chain Expert
    //   "test26@panameer.com",   // Jamal Lewis (26) — Oracle Cloud Expert
    //   "test29@panameer.com",   // Rick Allen (29) — App-Specific - HCM
    //   "test10@panameer.com",   // Layne Staley (10) — Rockstar of Oracle HCM
    //   "test_user8@medlinq.ai", // Tommy Lee (8) — Head of Sourcing
    //   "test_user5@medlinq.ai", // Test User 5 — Director of Procurement

    ⚠⚠ THE REPLACEMENTS ARE ROSTER PEOPLE FROM `Users.xlsx`, WHICH IS THE POINT:
    the old cast were survivors of older seeding passes that nothing recreates,
    so the graph rested on rows no script owned. These six are `spec` rows with a
    stated headline, rate and location, rebuilt by `seed:test-data` on every run.

    ── ⚠⚠⚠ AND THE CONSTRAINT THAT SHAPED THIS FILE IS GONE ──────────────────

    ⚠ SUPERSEDED, quoted not deleted (`E164`): *"exactly ONE person in the entire
    database has a `ProviderProfile` AND a photo AND a title"*, and *"only twelve
    distinct people have both [a photo and a title]"*.
    ⚠⚠ MEASURED 2026-09-21, AFTER THE RESEED: **58 people qualify.** Every
    colleague below now has a provider profile, so all six cards render as LINKS.
    ⚠ THE UNLINKED BRANCH IS THEREFORE NO LONGER COVERED HERE — `E591` WS-C item
    5's counter-case (a card that correctly does NOT link) has lost its subject
    and needs a deliberately profile-less colleague if it is to stay proven.
    ⚠⚠ REPORTED, NOT PAPERED OVER: adding one would mint a person, and this file
    mints nobody.
  */
  "sw_user22@straterp.com", // Marcus Reed — Workday HCM & Payroll Lead
  "sw_user23@straterp.com", // Dana Whitfield — Salesforce Order-to-Cash Consultant
  "sw_user24@straterp.com", // Tomas Herrera — SAP Record-to-Report Specialist
  "sw_user25@straterp.com", // Karen Boyd — Integration & Data Migration Architect
  "sw_user26@straterp.com", // Eli Rosen — Data & AI Governance Lead
  "sw_user27@straterp.com", // Maritza Gil — AI Automation & Agents Specialist
  /* ⚠ The one survivor in the cast, kept: a protected lesson holder with a real
     photo and a real title, so the graph is not made entirely of seed rows. */
  "iamscottwalls@outlook.com", // Scott Walls — AI Enabled Oracle Cloud Procurement Expert
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
  /*
    ⚠ RE-POINTED WITH THE COLLEAGUES ABOVE — every original address was deleted
    by the `E595` reset. ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   ["test25@panameer.com",   "test11@panameer.com"],
    //   ["test25@panameer.com",   "test19@panameer.com"],
    //   ["test26@panameer.com",   "test21@panameer.com"],
    //   ["test26@panameer.com",   "test24@panameer.com"],
    //   ["test29@panameer.com",   "test30@panameer.com"],
    //   ["test_user8@medlinq.ai", "test11@panameer.com"],  // the shared one
    ⚠ And before that, quoted at the previous pass:
    //   ["test10@panameer.com", "iamscottwalls@outlook.com"],
  */
  ["sw_user22@straterp.com", "sw_user28@straterp.com"],
  ["sw_user22@straterp.com", "sw_user29@straterp.com"],
  ["sw_user23@straterp.com", "sw_user30@straterp.com"],
  ["sw_user23@straterp.com", "test4@panameer.com"],
  ["sw_user24@straterp.com", "test5@panameer.com"],
  /* ⚠⚠ THE SHARED ONE, CARRIED FORWARD. `sw_user28` is reachable through BOTH
     `sw_user22` above and `sw_user25` here — the case that proves the web draws
     ONE node rather than one per path. ⚠ Without a duplicate in the data that
     rule is untested, which is why the re-point kept it rather than tidying it. */
  ["sw_user25@straterp.com", "sw_user28@straterp.com"],
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
    /* ⚠ RENAMED AT `E595` WS-B. SUPERSEDED, quoted not deleted (`E164`):
       //   email: "dana.whitfield@example.com", firstName: "Dana", lastName: "Whitfield",
       ⚠⚠ `sw_user23@straterp.com` IS Dana Whitfield and is now a first-degree
       COLLEAGUE, so an INVITATION in the same name would put one person in two
       states on one screen — read as a bug during a walk, and rightly. */
    email: "ines.duarte@example.com",
    firstName: "Ines",
    lastName: "Duarte",
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
    GATE_PROVIDER_EMAIL,
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
