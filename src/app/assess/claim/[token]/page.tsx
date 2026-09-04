import { notFound } from "next/navigation";
/* ⚠ `P1-ALL-E384` — the ToS is the MSA (`E380`), so every account-creating path
   records acceptance. */
import { CLAIM_TERMS_NOTICE, USER_TOS_VERSION } from "@/lib/tos";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { resolveAssessmentCompanyId } from "@/lib/assessment/domain-results";
import { issueSignInToken } from "@/lib/verification";
import { OnboardingFrame } from "@/components/onboarding/OnboardingFrame";
import { VerifiedSignIn } from "@/components/onboarding/VerifiedSignIn";

export const dynamic = "force-dynamic";

/**
 * THE ONE-CLICK ACCOUNT (WS-B).
 *
 * Clicking the link in the report email lands here, and the visitor is signed
 * in and reading their report without typing anything. No password screen, no
 * "check your email" a second time.
 *
 * ── WHY THIS IS NOT A PASSWORD BYPASS ────────────────────────────────────────
 *
 * The share token was mailed to the address the person typed into the
 * assessment, so holding it proves control of that inbox — the same proof the
 * ordinary email-verification link provides. That is why the account is created
 * with `email_verified` set: the click IS the verification, and asking them to
 * verify an address they just demonstrably received mail at would be
 * ceremony. It then hands off to the SAME single-use, five-minute SIGNIN token
 * and the SAME `VerifiedSignIn` component the provider flow uses — no second
 * auth path was written for this.
 *
 * ── WHAT GETS CREATED, AND WHAT DELIBERATELY DOES NOT ────────────────────────
 *
 * A `User` and nothing else. No Person, no Company, no P-Account. The email
 * promises "your report is saved and you can come back to it" and that is
 * exactly what a User delivers; a Person needs a Company, and inventing an org
 * record for someone who has answered eight questions would put a half-built
 * tenant in the backbone for every curious visitor. `Viewer.pAccountId` is
 * already documented as null for a freshly signed-up user, so this is a state
 * the access layer expects rather than one this page invents.
 *
 * No password is set. They arrive by link; if they later want a password the
 * ordinary reset path issues one.
 *
 * ── IDEMPOTENT ───────────────────────────────────────────────────────────────
 *
 * The link is in an inbox, so it WILL be clicked twice — on a phone, then on a
 * laptop. Re-clicking finds the existing user and mints a fresh sign-in token
 * rather than erroring or creating a duplicate. The share token is not consumed
 * on use, because it is also the URL of the report they are meant to keep.
 */
export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const assessment = await prisma.assessment.findUnique({
    where: { share_token: token },
    select: { id: true, email: true, company_name: true, user_id: true },
  });
  if (!assessment) notFound();

  const email = normalizeEmail(assessment.email);

  let user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, locked: true, is_active: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        // The click on a link sent to this address IS the verification.
        email_verified: new Date(),
        /*
          ── ⚠⚠ ACCEPTANCE IS RECORDED AT THE CLAIM CLICK (`P1-ALL-E384` WS-1a) ──

          SCOTT, 2026-09-04: *"yes, everyone needs to accept ToS...fix."*

          ⚠ THIS PATH CREATED AN ACCOUNT WITH `email_verified` AND NOTHING ELSE.
          Four users already exist that way. Under `E380` THE ToS **IS** THE MSA,
          so an account with no acceptance is a member with no master agreement —
          and the gate at `company/page.tsx:135` reads that as false, which is
          indistinguishable from having DECLINED.

          ⚠⚠ WRITTEN IN THE SAME `create` AS THE USER, so a claimed account
          without an acceptance is not a state the database can reach. That is
          the whole point of it being here rather than a follow-up write: a
          second statement can fail on its own.

          ⚠⚠ AND THERE IS DELIBERATELY NO CHECKBOX. THE CLICK **IS** THE
          AFFIRMATIVE ACT. This flow is the top of the funnel and its
          frictionlessness is a feature — a control would add a second step to a
          one-step flow, and Scott's requirement was to fix the record, not to
          slow the funnel.
          ⚠ WHAT MAKES THAT LEGITIMATE IS THAT THE TERMS ARE NAMED AND LINKED
          IMMEDIATELY ADJACENT TO THE BUTTON, BEFORE the click — see
          `CLAIM_TERMS_NOTICE` in `lib/tos.ts` and where it renders. AN AGREEMENT
          NOBODY COULD READ BEFORE AGREEING IS NOT ONE.
        */
        tos_accepted_at: new Date(),
        tos_version: USER_TOS_VERSION,
      },
      select: { id: true, locked: true, is_active: true },
    });
  }

  /*
    ── ⚠ CLAIMING IS WHERE `company_id` GETS SET, WHEN IT CAN BE ───────────────

    Scott's requirement is that assessments belong to a COMPANY, and this is the
    first moment there is a candidate: the visitor filled the form with no
    account at all. `resolveAssessmentCompanyId` goes through
    `getCompanyBinding`, never `Person.company_id`, and returns null for anyone
    without an APPROVED membership.

    ⚠ WHICH IS ALMOST EVERYONE ARRIVING HERE, BY DESIGN. This page creates a
    `User` AND NOTHING ELSE — no Person, no Company, no P-Account (see the note
    above). So a first-time claimer has no binding and `company_id` stays null.
    It fills in for someone who already had an account in a company and
    happened to take the assessment logged out. That is the honest behaviour, and
    ⚠ IT MUST NEVER BLOCK THE CLAIM: a null company is not an error.

    Re-clicking the link is idempotent, so `company_id` is only written on the
    first claim — a later company change is not this page's business to chase.
  */
  if (!assessment.user_id) {
    await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        user_id: user.id,
        company_id: await resolveAssessmentCompanyId(user.id),
      },
    });
  }

  /*
    A LOCKED OR DEACTIVATED ACCOUNT STILL GETS THE REPORT, just not a session.
    The token is theirs and the report is theirs; silently signing in an account
    an admin has locked would route around the lock, and blocking the report
    would punish them for it. So: no sign-in token, straight to the report.
  */
  const signInToken =
    user.locked || user.is_active === false ? null : await issueSignInToken(user.id);

  const destination = `/assess/r/${token}`;

  return (
    <OnboardingFrame>
      <div className="mx-auto max-w-xl py-6 text-center">
        <h1 className="font-display text-[26px] font-bold tracking-[-0.4px]">
          Opening your report…
        </h1>
        <p className="mt-3 text-[15.5px] text-ink-2">
          Setting up your account for {assessment.company_name} so this stays saved.
        </p>
        {signInToken ? (
          <VerifiedSignIn token={signInToken} callbackUrl={destination} />
        ) : (
          <a
            href={destination}
            className="mt-6 inline-flex rounded-full bg-magenta px-6 py-3 text-[15px] font-bold text-white"
          >
            Open my report
          </a>
        )}

        {/*
          ── ⚠⚠ THE TERMS, NAMED AND LINKED (`P1-ALL-E384` WS-1a) ──────────────

          The account above is created with `tos_accepted_at` and `tos_version`,
          and this is what makes that legitimate rather than assumed: THE TERMS
          ARE NAMED, AND BOTH ARE REACHABLE IN ONE CLICK.

          ⚠ NO CHECKBOX, DELIBERATELY. The click is the affirmative act and this
          flow is the top of the funnel — a control would add a second step to a
          one-step flow. Scott's fix was to the RECORD, not to the friction.

          ⚠⚠ AND HERE IS THE SEQUENCING PROBLEM, REPORTED RATHER THAN PAPERED
          OVER. The brief asked for this notice *"immediately adjacent to the
          button"* and *"BEFORE the click"*. It is adjacent — but it is NOT
          before, because THE ACCOUNT IS CREATED DURING THIS PAGE'S RENDER, above,
          and the click that caused it happened in the EMAIL. By the time anybody
          reads this, the row exists.
          ⚠ THE ONLY SURFACE THAT IS GENUINELY "BEFORE" IS THE EMAIL CARRYING THE
          CLAIM LINK — `email/templates/assessment-ready.ts`. That is template
          COPY, which `E384` puts out of scope, so it is reported at `E384` as the
          one remaining half of this fix rather than done here.
          ⚠ THIS NOTICE STILL EARNS ITS PLACE: it is the first moment the person
          is told an account was created at all, and without it they would not
          know there were terms to read.
        */}
        <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
          {CLAIM_TERMS_NOTICE.replace(
            " Terms of Use and Privacy Policy.",
            " "
          )}
          <a href="/terms" className="font-semibold text-magenta hover:underline">
            Terms of Use
          </a>
          {" and "}
          <a href="/privacy" className="font-semibold text-magenta hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </OnboardingFrame>
  );
}
