/**
 * ── ⚠⚠⚠ THE SURVIVORS, CONFIRMED BY SCOTT 2026-09-20 (`P0-E595` WS-B) ─────
 *
 * ⚠⚠ FIVE, NOT THREE. The brief said *"the three profiles tied to the Learn
 * courses"*; the QUERY returned FOUR distinct Learn experts, and Scott added
 * the platform admin as the fifth. ⚠ This is exactly why load-bearing rule 10
 * says derive the protected set FROM THE DATABASE, never from a name list —
 * and why the list below is checked against that query before anything runs.
 *
 * ⚠⚠⚠ THE TITLES ARE WRITTEN **BEFORE** `headline` IS DROPPED, AND THE ORDER IS
 * THE WHOLE POINT: three of the four experts have `Person.title = null` and
 * their title exists ONLY as `ProviderProfile.headline`. Dropping the column
 * first would erase the title of the three most visible profiles on the
 * platform, with nothing to restore it from.
 */

export type Survivor = {
  email: string;
  name: string;
  /** ⚠ `null` = leave `Person.title` exactly as it is. */
  title: string | null;
};

/** ⚠ Scott's own words, 2026-09-20, one per survivor. */
export const SURVIVORS: Survivor[] = [
  { email: "sw_user2@straterp.com", name: "Linus Erley", title: "Supply Chain Expert" },
  { email: "sw_user3@straterp.com", name: "Eddie Cairnie", title: "Oracle Cloud Finance Expert" },
  {
    email: "sw_user4@straterp.com",
    name: "Marelise Steenkamp",
    title: "Oracle Cloud P2P/HCM Techno-Functional Consultant",
  },
  {
    email: "iamscottwalls@outlook.com",
    name: "Scott Walls",
    /* ⚠ THE HEADLINE WINS OVER THE EXISTING `Person.title`. Scott chose the
       positioning line (*"AI Enabled Oracle Cloud Procurement Expert"*) over the
       role he had stored (*"Oracle Cloud Procurement Lead"*). ⚠⚠ THIS IS THE
       ONE SURVIVOR WHOSE `Person.title` IS OVERWRITTEN rather than filled. */
    title: "AI Enabled Oracle Cloud Procurement Expert",
  },
  {
    email: "admin@panameer.com",
    name: "Panameer Admin",
    /* ⚠⚠ THE ONLY `is_system_admin`, AND IT SURVIVES BECAUSE DELETING IT LEAVES
       NOBODY ABLE TO REACH `/admin`. ⚠ It is NOT a Learn expert — it is on this
       list by Scott's explicit ruling, not by the query. */
    title: null,
  },
];

/**
 * ⚠⚠ NAMED FOR DELETION BY SCOTT, and both are here rather than left to the
 * general wipe so the report can prove they went:
 *   · `sw_user33@straterp.com` — a STRAY `is_system_admin` nobody intended.
 *     ⚠⚠⚠ IT IS WHY THE SEED MUST NEVER GRANT THAT FLAG TO A TEST PERSONA.
 *   · `scott.walls@straterp.com` — a DUPLICATE `Scott Walls` person row,
 *     distinct from the `iamscottwalls` one and not a Learn expert.
 */
export const EXPLICIT_DELETES = [
  "sw_user33@straterp.com",
  "scott.walls@straterp.com",
];

export const MANIFEST_PATH = "prisma/reset/reset-manifest.json";
