/**
 * ── ⚠⚠⚠ THE GATE PERSONA. ONE CONSTANT. EVERYTHING READS IT ────────────────
 *
 * ⚠ SCOTT, 2026-09-21, ruling on the `P0-E595` WS-B gate: *"Move every
 * app-shell gate off test3 and onto one named, complete seeded provider (photo,
 * rates, skills), defined in one constant that every gate reads."*
 *
 * ⚠⚠ IT LIVES UNDER `prisma/` RATHER THAN `e2e-shell/` BECAUSE THE SEED NEEDS
 * IT TOO. The walk account's community is seeded by
 * `prisma/seed-test3-community.ts`, and a gate that signs in as one person
 * while the seed builds a community around another is a suite proving nothing.
 * ⚠ One address, read by: `e2e-shell/_persona.ts`, `e2e-shell/_auth.ts` and
 * `prisma/test3-community-spec.ts`.
 *
 * ── ⚠⚠ WHY IT IS NO LONGER `test3@panameer.com` ────────────────────────────
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 *     export const WALK_EMAIL = "test3@panameer.com";
 *
 * ⚠⚠ `test3@panameer.com` IS A RECRUITER IN `Users.xlsx` — Vincent Best,
 * Hollywood Consulting, job `Recruiter`. Scott, 2026-09-21: *"the roster wins.
 * test3@panameer.com stays Vincent Best, Recruiter."*
 * ⚠⚠⚠ A RECRUITER SELLS THE SERVICES OF OTHERS AND `WorkMethod.RECRUITER`
 * SUPPRESSES THE RATE, so that account can NEVER satisfy
 * `providerMeetsRequired`, which requires one. Every gate asserting about
 * rates, a public provider page or a complete profile was asserting it against
 * an account the model says cannot have those things. It passed only because
 * test3 carried a hand-made profile that predated the roster — and the `E595`
 * reset deleted it, which is how this surfaced.
 *
 * ── ⚠ WHY PRIYA NAIR ───────────────────────────────────────────────────────
 *
 * ⚠⚠ `Users.xlsx` FULLY SPECIFIES HER AND NOTHING ABOUT HER IS INVENTED: pid
 * `3.v2-1`, class Provider, lens Application-Specific, headline *"Oracle Cloud
 * Procurement Expert"*, rate $210, New York NY, validated Yes.
 * ⚠ She is the one persona whose completeness is a ROSTER FACT rather than a
 * seeding convenience, which is what a gate should stand on.
 *
 * ⚠⚠ IF THIS ADDRESS CHANGES, the persona it names must still be a COMPLETE,
 * NON-RECRUITER provider — `requireCompleteProvider()` in `e2e-shell/_persona.ts`
 * fails loudly if it is not, and that assertion is the reason this constant is
 * safe to change at all (`E586`: a gate with no inputs must fail).
 */
export const GATE_PROVIDER_EMAIL = "sw_user21@straterp.com";
