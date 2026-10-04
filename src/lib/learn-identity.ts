import { prisma } from "@/lib/prisma";

export type UserId = string & { readonly __brand: "UserId" };

export type PersonId = string & { readonly __brand: "PersonId" };

export const asUserId = (id: string): UserId => id as UserId;

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
