import { prisma } from "@/lib/prisma";

/**
 * ── ⚠⚠⚠ LEARN KEYS ON THE ACCOUNT. SOURCING KEYS ON THE PERSON. ─────────────
 *
 * `P2-A4-E711`, and it exists because of ruling **102c**.
 *
 * ⚠⚠ **`User.id` AND `Person.id` ARE BOTH `String @db.Uuid`, SO THE WRONG ONE COMPILES,
 * RUNS, AND RETURNS AN HONEST-LOOKING EMPTY RESULT.** ⚠⚠⚠ In this corner of the product
 * the empty result is not a blank screen — it is **`ALREADY_PASSED` collapsing into
 * `CAN_REQUEST`, so the platform asks a provider to re-sit a test it already witnessed
 * them pass.** ⚠ That is the exact harm `brief_certification_requirement` exists to
 * prevent, and passing the wrong uuid causes it **silently**.
 *
 * ── ⚠⚠⚠ A TYPE, NOT A GATE, AND THAT IS DELIBERATE ─────────────────────────
 *
 * ⚠⚠ **SCOTT'S OWN RULE, RECORDED IN `CLAUDE.md`:** *"A forgetful sender being a compile
 * error rather than a silent gap is worth more than any check we could write after the
 * fact… Reach for a required type before reaching for a gate."*
 * ⚠⚠⚠ **SO THE IDS ARE BRANDED. A `PersonId` HANDED TO SOMETHING EXPECTING A `UserId` IS
 * A COMPILE ERROR — NOT A RUNTIME EMPTY, NOT A GATE FINDING, NOT A CODE REVIEW HOPE.**
 * ⚠ The brand is a phantom property that exists only in the type system; at runtime these
 * are plain strings and nothing is wrapped, allocated or serialised differently.
 * ⚠⚠ A gate still exists (`check:learn-identity`) for the things a type cannot hold — that
 * the resolver is the ONE place the two id spaces meet, and that it refuses rather than
 * returning null on a mismatch.
 *
 * ── ⚠⚠ WHY THE RESOLVER REFUSES INSTEAD OF RETURNING NULL ──────────────────
 *
 * ⚠⚠⚠ **A `null` HERE IS INDISTINGUISHABLE FROM "THIS PERSON HAS NOT PASSED", WHICH IS
 * THE BUG WEARING A RETURN VALUE.** ⚠ So a person with no account **throws**: the caller
 * is asking a question that cannot be answered, and answering *"no"* would be a false
 * statement about a real provider (`90b` — a false value in a true column is worse than
 * an absent one).
 * ⚠ `E585`: one place resolves `Person` → `User`, and the pairing is asserted there rather
 * than assumed at each call site.
 */

/**
 * ⚠ A `User.id` — the ACCOUNT. Learn, tests and attempts key on this.
 *
 * ⚠⚠ The brand makes it unassignable from a bare `string`, so an id that arrived from
 * somewhere untyped has to be named as one deliberately.
 */
export type UserId = string & { readonly __brand: "UserId" };

/**
 * ⚠ A `Person.id` — the PERSON. Sourcing, offers, work requests and profiles key on this.
 */
export type PersonId = string & { readonly __brand: "PersonId" };

/**
 * ⚠⚠ NAME A RAW STRING AS AN ACCOUNT ID.
 *
 * ⚠ Use it where the value provably came from `User.id` — a session, a `user_id` column.
 * ⚠⚠⚠ **IT IS NOT A CONVERSION AND IT CHECKS NOTHING. Calling it on a `Person.id` is
 * exactly the defect this module exists to stop**, which is why `check:learn-identity`
 * asserts the call sites and why the resolver below is the only way to cross over.
 */
export const asUserId = (id: string): UserId => id as UserId;

/** ⚠ The same, for a `Person.id`. The same warning applies in the other direction. */
export const asPersonId = (id: string): PersonId => id as PersonId;

/** Thrown when a person has no account, so no Learn question can be answered about them. */
export class LearnIdentityError extends Error {
  constructor(
    message: string,
    readonly code: "NO_ACCOUNT"
  ) {
    super(message);
    this.name = "LearnIdentityError";
  }
}

/**
 * ⚠⚠⚠ THE ONE PLACE THE TWO ID SPACES MEET (`E585`).
 *
 * ⚠ Given the PERSON a sourcing surface holds, return the ACCOUNT that Learn keys on.
 * ⚠⚠ **IT THROWS WHEN THERE IS NO ACCOUNT RATHER THAN RETURNING `null`** — see the
 * docblock: a null would be read as *"has not passed"* and the product would ask for a
 * test the provider may already hold.
 * ⚠ A `Person` whose `user_id` is null is a real shape (a person can exist before an
 * account does), so this is a genuine refusal and not a defensive impossibility.
 */
export async function userIdForPerson(personId: PersonId): Promise<UserId> {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { user_id: true },
  });
  if (!person) {
    throw new LearnIdentityError(`No person with id ${personId}.`, "NO_ACCOUNT");
  }
  if (!person.user_id) {
    /*
      ⚠⚠ THE REFUSAL THAT MATTERS. A provider with no account cannot have sat a test, but
      *"has not passed"* and *"cannot be asked"* are different answers, and only the
      caller knows which it needs. ⚠⚠⚠ Collapsing them here is how `ALREADY_PASSED`
      silently becomes `CAN_REQUEST`.
    */
    throw new LearnIdentityError(
      `Person ${personId} has no account, so no Learn result can be read for them.`,
      "NO_ACCOUNT"
    );
  }
  return asUserId(person.user_id);
}
