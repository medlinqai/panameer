/**
 * THE ONBOARDING LIFECYCLE — Scott's four statuses (`P1-J1.1-E269`, 2026-08-30).
 *
 * ⚠⚠ DERIVED, NEVER STORED. There is no `status` column and this brief did not
 * add one. Every value below is computed from state that already exists, which
 * is what makes it impossible for the board to disagree with the product: a
 * requester who finishes the wizard IS Complete the moment `completed_at` is
 * written, with nothing to keep in sync and no backfill to get wrong.
 *
 *   1 Created     BUYER  user exists, no `RequesterProfile`
 *                 SELLER user exists, no `ProviderProfile`
 *   2 In-Process  BUYER  profile exists, `completed_at` null — `onboarding_step`
 *                        says which screen they stopped on
 *                 SELLER profile exists, `ProviderStatus = PENDING`
 *   3 Complete    BUYER  `completed_at` set
 *                 SELLER `ProviderStatus = ACTIVE`
 *   4 Validated   BUYER  `validation_status = VALIDATED`
 *                 SELLER `validation_status = VALIDATED`
 *
 * ⚠ THE BUYER-SIDE `Validated` HAS NO MECHANISM AND THAT IS DELIBERATE. Scott:
 * *"IDK yet... it might annoy the people we are trying to get to pay us... so
 * let's set it up as a status."* `RequesterProfile.validation_status` exists so
 * the board can render the state; nothing in the app sets it, there is no buyer
 * request route and no email. The SELLER side is a real track with
 * `validation_requested_at` / `validated_at` behind it.
 *
 * ⚠ A PERSON CAN HOLD A STATUS ON EACH SIDE. Dual-role accounts are real
 * (Reuben Ellis in the demo sheet), so this returns one status PER SIDE rather
 * than collapsing to a single "the" status and silently hiding half the truth.
 */

/** In Scott's order. The index is the progression, so the strip can sort by it. */
export const ONBOARDING_STATUSES = [
  "Created",
  "In-Process",
  "Complete",
  "Validated",
] as const;

export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];
export type OnboardingSide = "BUYER" | "SELLER";

/**
 * ⚠ CHECKED HIGHEST-FIRST. Validated implies Complete implies In-Process, so
 * evaluating upward would report every validated provider as "In-Process".
 */
export function buyerStatus(rp: {
  completed_at: Date | null;
  validation_status: string;
} | null): OnboardingStatus {
  if (!rp) return "Created";
  if (rp.validation_status === "VALIDATED") return "Validated";
  if (rp.completed_at) return "Complete";
  return "In-Process";
}

export function sellerStatus(pp: {
  status: string;
  validation_status: string;
} | null): OnboardingStatus {
  if (!pp) return "Created";
  if (pp.validation_status === "VALIDATED") return "Validated";
  if (pp.status === "ACTIVE") return "Complete";
  return "In-Process";
}

/**
 * Which sides does this person actually occupy?
 *
 * ⚠ `isRequester` IS "OWNS A `RequesterProfile`", THE SAME EXPRESSION `lib/me.ts`
 * ALREADY USES (`/** USER_JOB Requester, expressed as "owns a RequesterProfile"
 * *​/`). `USER_CLASS` / `USER_JOB` are still not in the schema, and this board's
 * own header used to say Requester "reports as unknown" for that reason. Deriving
 * it from the profile is how the rest of the app answers the question, so the
 * board now answers it the same way instead of inventing a second definition.
 *
 * ⚠ THE BUYER SIDE IS `is_service_buyer` **OR** owning a profile. A person mid-
 * signup carries the flag before the profile exists — that is precisely the
 * `Created` state, and requiring the profile would have hidden every one of them.
 */
export function sidesFor(p: {
  is_service_buyer: boolean;
  is_service_provider: boolean;
  is_service_coordinator: boolean;
  requesterProfile: unknown | null;
  providerProfile: unknown | null;
}): OnboardingSide[] {
  const sides: OnboardingSide[] = [];
  if (p.is_service_buyer || p.requesterProfile) sides.push("BUYER");
  if (p.is_service_provider || p.is_service_coordinator || p.providerProfile)
    sides.push("SELLER");
  return sides;
}
