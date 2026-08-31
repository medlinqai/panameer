import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { OnboardingError } from "@/lib/onboarding";
import { USER_TOS_VERSION } from "@/lib/tos";
import type { Viewer } from "@/lib/access";

/**
 * REQUESTER onboarding (P1-J1.2, brief_requester_onboarding).
 *
 * Its own module rather than more of `onboarding.ts` — that file is already
 * 1700 lines of provider journey, and the requester shares its SHELL, not its
 * logic.
 *
 * The shape deliberately mirrors the provider: create account → verify email →
 * intro → save-as-you-go steps → review → a "ready" state. Every writer here is
 * OWNER-SCOPED: the requester is resolved from the session, never from a body
 * field, so there is no request shape that edits someone else's record.
 */

/**
 * The step list lives in `requester-steps.ts` (no server imports) and is
 * re-exported here so server callers have one import. The client wizard must
 * import it from there — pulling it through this module drags Prisma, and
 * therefore `pg`, into the browser bundle.
 */
export { REQUESTER_STEPS, type RequesterStep } from "@/lib/requester-steps";
import { REQUESTER_STEPS, type RequesterStep } from "@/lib/requester-steps";

export type AddressInput = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export type CreateRequesterAccountInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  country?: string;
  marketingOptIn?: boolean;
  tosAccepted: boolean;
};

/**
 * Create the requester account + backbone in one transaction.
 *
 * The COMPANY here is a placeholder named after the person, exactly as the
 * provider and buyer signups do it. The real company is the wizard's first
 * step, which either renames this one or moves the Person onto an existing
 * company — the backbone requires a company before the question can be asked,
 * and asking it before the account exists would mean holding a password in the
 * browser across four screens.
 */
export async function createRequesterAccount(
  input: CreateRequesterAccountInput
): Promise<{ userId: string; email: string }> {
  const email = normalizeEmail(input.email);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();

  if (!input.tosAccepted) {
    throw new OnboardingError("You must accept the Terms of Service", "INVALID");
  }
  if (input.password.length < 8) {
    throw new OnboardingError("Password must be at least 8 characters", "INVALID");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new OnboardingError("That email is already registered", "EMAIL_TAKEN");
  }

  const password_hash = await hashPassword(input.password);
  const placeholder = `${firstName} ${lastName}`.trim() || email;

  const userId = await prisma.$transaction(async (tx) => {
    const pAccount = await tx.pAccount.create({
      data: { kind: "BUYER", name: placeholder, status: "ACTIVE" },
    });
    const company = await tx.company.create({
      data: { p_account_id: pAccount.id, name: placeholder },
    });
    const user = await tx.user.create({
      data: {
        email,
        password_hash,
        first_name: firstName,
        last_name: lastName,
        role: "MEMBER",
        tos_accepted_at: new Date(),
        tos_version: USER_TOS_VERSION,
      },
    });
    const person = await tx.person.create({
      data: {
        company_id: company.id,
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        status: "ACTIVE",
        /*
          USER_CLASS SERVICE_BUYER × USER_JOB Requester, expressed in the model
          that exists today. The schema has no USER_CLASS/USER_JOB enums yet —
          that is brief_user_class_job_model, explicitly a separate piece of
          work — so the class rides on the actor flag the whole app already
          gates on (canHireTalent === is_service_buyer) and the JOB is carried
          by owning a RequesterProfile. When the enums land, this is the one
          place that changes.
        */
        is_service_buyer: true,
      },
    });
    await tx.requesterProfile.create({ data: { person_id: person.id } });

    // Sign-up country seeds the requester's address, so step 2 pre-fills the
    // one field they have already answered.
    if (input.country?.trim()) {
      const site = await tx.site.create({
        data: { company_id: company.id, name: "Primary" },
      });
      await tx.address.create({
        data: { site_id: site.id, line1: "", country: input.country.trim() },
      });
      await tx.person.update({ where: { id: person.id }, data: { site_id: site.id } });
    }

    return user.id;
  });

  return { userId, email };
}

/** Resolve the signed-in requester. Throws rather than returning null-ish. */
async function loadRequester(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      /* `E281` — read for the wizard's Requester Details step. */
      photo_url: true,
      title: true,
      phone: true,
      company_id: true,
      site_id: true,
      company: { select: { id: true, name: true, p_account_id: true } },
      /*
        ⚠ THE MEMBERSHIPS ARE WHAT "HAS A COMPANY" MEANS (P1-J1.2-E003).

        `Person.company_id` above is the SIGNUP PLACEHOLDER — every account gets
        one automatically — and `requesterGaps` used to accept its `name` as
        proof. `getCompanyBinding` and `checkTransact` read memberships instead,
        so a person could satisfy onboarding forever and never satisfy the
        transact gate. This select is what lets both ask the same question.

        Ordered the way `getCompanyBinding` orders: APPROVED first (status sorts
        alphabetically before PENDING and REJECTED), newest decision first within
        a status, so `[0]` is the binding that matters.
      */
      companyMemberships: {
        orderBy: [{ status: "asc" }, { updated_at: "desc" }],
        select: {
          status: true,
          company: { select: { id: true, name: true, tax_type: true } },
        },
      },
      site: {
        select: {
          id: true,
          name: true,
          addresses: { take: 1, orderBy: { created_at: "asc" } },
        },
      },
      user: { select: { email: true, email_verified: true } },
      requesterProfile: {
        select: {
          id: true,
          employee_id: true,
          buyer_name: true,
          buyer_email: true,
          approver_name: true,
          approver_email: true,
          work_site_id: true,
          onboarding_step: true,
          completed_at: true,
          workSite: {
            select: {
              id: true,
              name: true,
              addresses: { take: 1, orderBy: { created_at: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!person?.requesterProfile) {
    throw new OnboardingError("This account isn't a requester", "NOT_A_REQUESTER");
  }
  return person;
}

export type RequesterState = Awaited<ReturnType<typeof getRequesterState>>;

/** The wizard's resume + prefill payload. */
export async function getRequesterState(viewer: Viewer) {
  const p = await loadRequester(viewer);
  const rp = p.requesterProfile!;
  const addr = p.site?.addresses[0] ?? null;
  const work = rp.workSite?.addresses[0] ?? null;

  const toAddress = (a: typeof addr) =>
    a
      ? {
          line1: a.line1,
          line2: a.line2,
          city: a.city,
          state: a.state,
          postalCode: a.postal_code,
          country: a.country,
        }
      : null;

  /*
    ── ⚠ THE BINDING, ON THE PAYLOAD (P1-J1.2-E003 / E005) ────────────────────

    Added here rather than fetched a second way by the client, because two reads
    of "does this person have a company" is how the two answers diverged in the
    first place. `pitfalls.md`: a new field has to reach the TYPE and every
    caller that builds one — `RequesterState` is inferred from this return and
    the only caller is `/api/onboarding/requester/status`, which passes the whole
    object through, so both are satisfied by adding it once, here.

    `bound` is deliberately "ANY membership", not "an APPROVED one". Onboarding
    needs a membership to EXIST; transacting needs it APPROVED. Two different
    bars, both correct — see `requesterGaps`.
  */
  const membership = p.companyMemberships[0] ?? null;

  return {
    email: p.user?.email ?? "",
    emailVerified: !!p.user?.email_verified,
    steps: REQUESTER_STEPS,
    resumeStep: rp.onboarding_step,
    completed: !!rp.completed_at,
    company: {
      /** Any CompanyMembership at all — PENDING counts. */
      bound: p.companyMemberships.length > 0,
      status: membership?.status ?? null,
      /**
       * The bound company has a `tax_type`, i.e. somebody actually DEFINED it
       * rather than binding to a bare placeholder. Null when unbound.
       */
      defined: membership ? membership.company.tax_type !== null : false,
      name: membership?.company.name ?? null,
    },
    profile: {
      firstName: p.first_name,
      lastName: p.last_name,
      /*
        `E281` — the requester gets a face and a role. ⚠ BOTH COLUMNS ALREADY
        EXISTED on `Person`; this is the wizard finally reading them.
        ⚠ `photo_url` IS NOT WRITTEN BY THIS MODULE. `POST /api/profile/photo`
        owns that column — it uploads, then writes `Person.photo_url` directly
        for anyone without a `providerProfile`. So the wizard READS it here to
        show what is already stored and never posts it back, which is why there
        is no `photoUrl` on `StepPayload` below.
      */
      photoUrl: p.photo_url,
      title: p.title,
      phone: p.phone,
      employeeId: rp.employee_id,
      companyId: p.company_id,
      companyName: p.company?.name ?? "",
      buyerName: rp.buyer_name,
      buyerEmail: rp.buyer_email,
      approverName: rp.approver_name,
      approverEmail: rp.approver_email,
      address: toAddress(addr),
      workLocation: toAddress(work),
      workSiteName: rp.workSite?.name ?? null,
    },
  };
}

/**
 * Write one Site + its Address, reusing the row if it already exists.
 *
 * Sites are created rather than updated-in-place across steps because a
 * requester who edits their address twice should not accumulate sites.
 */
async function upsertSiteAddress(
  companyId: string,
  siteId: string | null,
  name: string,
  addr: AddressInput
): Promise<string> {
  const data = {
    line1: addr.line1?.trim() ?? "",
    line2: addr.line2?.trim() || null,
    city: addr.city?.trim() || null,
    state: addr.state?.trim() || null,
    postal_code: addr.postalCode?.trim() || null,
    country: addr.country?.trim() || null,
  };

  if (siteId) {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, company_id: true, addresses: { take: 1, orderBy: { created_at: "asc" } } },
    });
    // A site that belongs to a different company is not ours to write — fall
    // through and make a fresh one under this company.
    if (site && site.company_id === companyId) {
      const existing = site.addresses[0];
      if (existing) {
        await prisma.address.update({ where: { id: existing.id }, data });
      } else {
        await prisma.address.create({ data: { site_id: site.id, ...data } });
      }
      return site.id;
    }
  }

  const site = await prisma.site.create({ data: { company_id: companyId, name } });
  await prisma.address.create({ data: { site_id: site.id, ...data } });
  return site.id;
}

export type StepPayload = {
  /** company — confirmation only; the binding itself is written by company.ts. */
  companyBound?: boolean;
  /** requester_info */
  firstName?: string;
  lastName?: string;
  /*
    `E281` — the requester's ROLE ("Director of Procurement"), not a provider's
    sales headline. Same `Person.title` column both sides write; THE DIFFERENCE IS
    THE COPY ASKING FOR IT, which lives in the wizard.
    ⚠ NO `photoUrl` HERE ON PURPOSE — `POST /api/profile/photo` already owns that
    column and writes it directly. A second writer would be two paths to one field.
  */
  title?: string | null;
  phone?: string | null;
  employeeId?: string | null;
  address?: AddressInput;
  /*
    ⚠⚠ THESE FOUR OUTLIVED THEIR STEP (`P1-J1.1-E263`, 2026-08-30).

    `buyer_approver` was removed from `REQUESTER_STEPS`, so NOTHING POSTS THESE
    TODAY and no branch below reads them. They are kept — here, in the step
    route's zod schema, and as columns on `RequesterProfile` — because Scott
    removed the SCREEN, not the model: *"we can leave it in the first
    onboarding page (for now), but it is likely to come out at some point."*
    ⚠ DO NOT "TIDY" THEM AWAY. Deleting them is a second, separate decision he
    has not made, and the columns already hold data for the profiles that
    completed the old five-step wizard.
  */
  buyerName?: string | null;
  buyerEmail?: string | null;
  approverName?: string | null;
  approverEmail?: string | null;
  /** work_location */
  workLocation?: AddressInput;
};

/**
 * Save one step and advance the resume point (save-as-you-go).
 *
 * The step name decides what is written, so a payload carrying extra keys can't
 * reach past the step it belongs to.
 */
export async function saveRequesterStep(
  viewer: Viewer,
  step: RequesterStep,
  payload: StepPayload
) {
  const p = await loadRequester(viewer);
  const rp = p.requesterProfile!;

  if (step === "company") {
    /*
      THE COMPANY IS WRITTEN BY src/lib/company.ts, not here
      (brief_company_model WS2).

      This step used to rename the placeholder or re-point the person straight
      from wizard input — an unverified attach with no attestation, no company
      ToS and no admin approval. Define/join now goes through the shared company
      building block, which records a real membership decision; all this step
      does is confirm the binding exists and advance the resume point.
    */
    /*
      ⚠⚠ NO BINDING CHECK ANY MORE (`P1-J1.1-E274`). The company is OPTIONAL at
      onboarding — see the block on `requesterGaps` above for the rule and for
      where it IS enforced.

      ⚠ SUPERSEDED, quoted not deleted: this step used to look up an APPROVED
      `CompanyMembership` and throw
      `OnboardingError("Choose or add your company before continuing", "INVALID")`
      when there was none.

      ⚠⚠ THIS WAS THE THIRD OF THREE GATES and the only SERVER-SIDE one, which
      makes it the dangerous one: removing the two client gates and leaving this
      would have produced a Continue button that posts, fails, and shows an error
      the user cannot act on — a worse defect than the block it replaced.

      ⚠ THE STEP STILL ADVANCES THE RESUME POINT, which is the whole of what it
      does now. Somebody who DOES bind a company still gets the membership
      written by `/api/company/define` or `/join`; this step never wrote it.
    */
  }

  if (step === "requester_info") {
    await prisma.person.update({
      where: { id: p.id },
      data: {
        ...(payload.firstName?.trim() ? { first_name: payload.firstName.trim() } : {}),
        ...(payload.lastName?.trim() ? { last_name: payload.lastName.trim() } : {}),
        /*
          `E281` — the requester's ROLE.
          ⚠ KEYED ON `!== undefined`, NOT ON TRUTHINESS, unlike the two names
          above. Those use `?.trim() ? ... : {}` so an empty string leaves the
          stored name alone — right for a name, wrong here: it would make the
          field impossible to CLEAR once set. An absent key means "not
          submitted"; an empty one means "cleared".
        */
        ...(payload.title !== undefined
          ? { title: payload.title?.trim() || null }
          : {}),
        phone: payload.phone?.trim() || null,
      },
    });
    await prisma.requesterProfile.update({
      where: { id: rp.id },
      data: { employee_id: payload.employeeId?.trim() || null },
    });
    if (payload.address) {
      // Re-read the company: the Company step may have moved this person.
      const current = await prisma.person.findUnique({
        where: { id: p.id },
        select: { company_id: true, site_id: true },
      });
      const siteId = await upsertSiteAddress(
        current!.company_id,
        current!.site_id,
        "Primary",
        payload.address
      );
      await prisma.person.update({ where: { id: p.id }, data: { site_id: siteId } });
    }
  }

  /*
    ⚠ SUPERSEDED, quoted not deleted (`P1-J1.1-E263`): a `buyer_approver` branch
    sat here and wrote `buyer_name` / `buyer_email` / `approver_name` /
    `approver_email`, normalising both addresses through `normalizeEmail`.

    It went with the step. It is NOT commented-out code kept "just in case" —
    `RequesterStep` no longer contains that value, so the comparison would not
    compile. If the step ever returns, the columns and the payload keys are
    still here and this branch is four lines of `prisma.requesterProfile.update`.
  */

  if (step === "work_location" && payload.workLocation) {
    const current = await prisma.person.findUnique({
      where: { id: p.id },
      select: { company_id: true },
    });
    const siteId = await upsertSiteAddress(
      current!.company_id,
      rp.work_site_id,
      "Work Location",
      payload.workLocation
    );
    await prisma.requesterProfile.update({
      where: { id: rp.id },
      data: { work_site_id: siteId },
    });
  }

  // The resume point only ever moves FORWARD. Stepping back to fix an answer
  // and saving it shouldn't rewind where a returning user lands.
  const next = REQUESTER_STEPS[REQUESTER_STEPS.indexOf(step) + 1] ?? "review";
  const furthest =
    REQUESTER_STEPS.indexOf(next) > REQUESTER_STEPS.indexOf(rp.onboarding_step as RequesterStep)
      ? next
      : (rp.onboarding_step as RequesterStep);
  await prisma.requesterProfile.update({
    where: { id: rp.id },
    data: { onboarding_step: furthest },
  });

  return getRequesterState(viewer);
}

/** What's still missing before the requester can finish. */
/**
 * ── ⚠ WHAT "HAS A COMPANY" MEANS, AND WHY THIS CHANGED (P1-J1.2-E003) ────────
 *
 * This function used to test `profile.companyName`, which is
 * `Person.company.name` — THE SIGNUP PLACEHOLDER, which every account gets
 * automatically and which therefore always has a name. So onboarding always
 * passed, while `getCompanyBinding` and `checkTransact` read
 * `Person.companyMemberships` and always failed. Two pieces of code disagreeing
 * about one word, and a person could satisfy the first forever without ever
 * satisfying the second — a closed loop with the only company form behind it.
 *
 * ⚠ PENDING COUNTS AS SATISFIED HERE. `joinCompany` on a company whose admin
 * must approve you legitimately leaves the membership PENDING, and the wizard
 * already has a branch that lets that move on. Requiring APPROVED would swap
 * this trap for a worse one: a requester frozen until a stranger clicks a
 * button. ONBOARDING NEEDS A MEMBERSHIP TO EXIST; TRANSACTING NEEDS IT
 * APPROVED. Two bars, both correct, and `verifyTransactAbility` owns the second.
 *
 * ⚠ THE NAME CHECK IS NOT DELETED, IT IS MOVED. A person bound to a company that
 * still has no `tax_type` is on a placeholder somebody joined without defining —
 * a real, different gap, so it keeps its own line worded for what it is.
 *
 * ⚠ THIS MAKES SOME "COMPLETE" REQUESTERS INCOMPLETE AGAIN. That is the intent
 * and it is the safe direction: they are already blocked from transacting, so
 * this only surfaces the block somewhere they can act on it. NO BACKFILL MINTS
 * MEMBERSHIPS — a `CompanyMembership` is an attestation a human made, and
 * manufacturing one silently binds a person to a company they never claimed.
 */
/*
  ── ⚠⚠ A GATE MAY ONLY REQUIRE WHAT THE WIZARD CAN COLLECT (`E263`/`E262`) ───

  ⚠⚠ THIS FUNCTION BLOCKED EVERY REQUESTER ON THE DAY THE STEPS CHANGED, and it
  is worth being explicit about because the brief said the opposite.

  `E263` removed the `buyer_approver` step on the stated premise that the four
  columns behind it are *"all `nullish()`, nothing gates on them."* THAT PREMISE
  WAS FALSE. This function required `approverName`, and it is the only thing
  standing between the Review step and `completed_at`. With the step gone and the
  check left in place, `Complete My Profile` failed for everybody with
  *"Still needed: Your approver."* — CAUGHT BY WALKING THE WIZARD, not by reading
  it, and it would have shipped as a dead-ended journey.

  ⚠ `Your address` WENT FOR THE SAME REASON, and it was a QUIETER version of the
  same defect. `E262` removed the address block from step 2, so the only source
  left is the country-only `Address` seeded at signup — and signup's `country` is
  `.optional()` in `api/onboarding/requester/account/route.ts:12`. A requester who
  signed up without one would have been permanently unable to finish, with NO
  SCREEN ANYWHERE that could supply the missing value. `E262` also says Work
  Location is now the only full address this journey captures, and the
  `workLocation` gap below already enforces exactly that.

  ⚠ THE OTHER THREE GATES ARE UNCHANGED and each still maps to a live step:
  company binding + business type (step 1), name (step 2), work location (step 3).
  ⚠ THE COLUMNS ARE NOT DELETED — `buyer_name` / `approver_name` and the seeded
  `Address` all still exist and still hold data for profiles that completed the
  old five-step wizard. This removes a REQUIREMENT, not a record.
*/
/*
  ── ⚠⚠ THE COMPANY IS OPTIONAL **HERE** AND MANDATORY **BEFORE HIRE** ────────
     (`P1-J1.1-E274` + `E280`, Scott 2026-08-30)

  ⚠⚠ IF YOU ARE BUILDING WORK ORDERS, THIS BLOCK IS ADDRESSED TO YOU. Read it
  before you decide what a buyer needs on file.

  THE RULE SCOTT SET, in his words: *"we still probably want to make the company
  optional at this point. We will need it before a work order could become a
  legal document."* And on why: *"we need to know what corporate or business
  entity we are contracting with."*

  So the requirement is:

      COMPANY + EIN + REGISTERED ADDRESS ARE REQUIRED BEFORE A BUYER CAN **HIRE**
      (web), AND BEFORE AN APPROVED **PO IS ACCEPTED** (ERP).
      They are NOT required to finish onboarding.

  ⚠⚠ THAT GATE IS NOT BUILT, AND DELIBERATELY SO — THERE IS NOTHING TO BUILD IT
  ON. There is no `WorkOrder` model and no hire route in this codebase;
  `WorkRequest` and `WorkRequestStatus` exist and the second half of the pipeline
  does not. A gate written here would fire at onboarding, which is the exact
  place Scott just said it must NOT fire. ⚠ A FAKE GATE WOULD BE WORSE THAN
  NONE: it would read as "the rule is enforced" while enforcing it in the wrong
  place, and the real one would never get written.

  ⚠ SO THE REQUIREMENT IS RECORDED HERE INSTEAD, where whoever adds the hire
  path will be reading. The three values are already captured and already
  nullable, so the check is a read, not a migration:
      · company    — `Person.company_id` + an APPROVED `CompanyMembership`
      · EIN        — `Company.tin`               (captured by `E273`)
      · registered address — the `Site` named `REGISTERED_SITE_NAME`
                     and its `Address`           (captured by `E280`)

  ── ⚠ WHY THE TWO COMPANY CHECKS CAME OUT OF THE LIST BELOW ─────────────────

  ⚠ SUPERSEDED, quoted not deleted:
      `if (!state.company.bound) gaps.push("Your company");`
      `else if (!state.company.defined) gaps.push("Your company's business type");`

  ⚠⚠ AND THEY DID NOT COME OUT ALONE. Two other gates enforced the same thing
  and ALL THREE had to go in one change, because leaving one standing is exactly
  what dead-ended every requester this morning when `approverName` survived
  `E263`:
      1. these two gaps;
      2. `continueDisabled={!companyValid}` on the company step;
      3. the `OnboardingError("Choose or add your company before continuing")`
         thrown by `saveRequesterStep` below — SERVER-SIDE, so removing only the
         client gate would have produced a Continue button that posted and
         failed.
  ⚠ A GATE IS NOT REMOVED UNTIL EVERY LAYER OF IT IS. Walk the flow, do not
  grep for one string.
*/
export function requesterGaps(state: RequesterState): string[] {
  const p = state.profile;
  const gaps: string[] = [];
  if (!p.firstName.trim() || !p.lastName.trim()) gaps.push("Your name");
  if (!p.workLocation?.country) gaps.push("A work location");
  return gaps;
}

/**
 * Finish onboarding → "Ready to Post Work Request".
 *
 * Refuses on a gap rather than completing a half-filled requester: the ready
 * state is a claim that this person can be put on a work request, and a
 * requester with no deliver-to cannot.
 */
export async function completeRequester(viewer: Viewer) {
  const state = await getRequesterState(viewer);
  const gaps = requesterGaps(state);
  if (gaps.length > 0) {
    throw new OnboardingError(
      `Still needed: ${gaps.join(", ")}.`,
      "INCOMPLETE"
    );
  }
  const p = await loadRequester(viewer);
  await prisma.requesterProfile.update({
    where: { id: p.requesterProfile!.id },
    data: { completed_at: new Date(), onboarding_step: "review" },
  });
  return getRequesterState(viewer);
}
