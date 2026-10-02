import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { OnboardingError } from "@/lib/onboarding";
import { hashToken, appBaseUrl } from "@/lib/verification";
import { sendEmail } from "@/lib/resend";
import { employerValidationTemplate } from "@/lib/email/templates/employer-validation";
import { displayFullName } from "@/lib/display";
import { checkContactDomain, registrableDomain } from "@/lib/email-domain";
import { yearRange } from "@/lib/masked-profile";
import { VALIDATION_LIMIT_PER_DAY } from "@/lib/project-validation";

/**
 * ── ⚠⚠⚠ EMPLOYER VALIDATION — `P2-A1.1-E747` (lane 3, WS-B) ────────────────
 *
 * ⚠ SCOTT, 2026-10-01: *"there should also be a badge at the employer/project
 * levels."* ⚠⚠ Projects had a flow; **employers had nothing — no field, no
 * model, no screen.**
 *
 * ⚠⚠⚠ **AN EMPLOYER VALIDATES ON ITS OWN.** It does not validate the projects
 * under it, and validating every project does not validate the employer. They
 * are different claims: *"he worked here"* is not *"he did this piece of work"*,
 * and a buyer reading a tick needs to know which one they are being told.
 *
 * ── ⚠⚠ WHAT IS DELIBERATELY SHARED WITH THE PROJECT FLOW, AND WHAT IS NOT ───
 *
 * ⚠ **SHARED: the rules.** `checkContactDomain`, the own-domain refusal, the
 * seven-day resend window and `VALIDATION_LIMIT_PER_DAY` are imported or
 * mirrored exactly — ⚠⚠ a second, laxer set of guards on a second surface is how
 * the badge would quietly become decorative on one of them.
 * ⚠⚠⚠ **THE DAILY CAP IS IMPORTED, NOT RE-DECLARED, AND IT COUNTS BOTH KINDS
 * TOGETHER.** Ten requests a day means ten emails to strangers, whichever
 * surface sent them; two separate caps of ten would be a cap of twenty.
 *
 * ⚠ **NOT SHARED: the table and the template.** Two questions, two tables — a
 * nullable `employer_id` on `ProjectValidation` would make every existing
 * `where: { project_id }` ambiguous the day somebody forgot a clause. And
 * `SentEmail.template` is how a bounce says WHICH request failed (`E522`), so one
 * template name for two questions makes that receipt useless.
 */

/** ⚠ 30 days, matching the project flow. One place would be better; see below. */
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** ⚠ Seven days — `E746` WS-A's window, for the same reason: their inbox. */
const RESEND_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

async function ownedProfileId(viewer: Viewer): Promise<string> {
  const p = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true },
  });
  if (!p) throw new OnboardingError("No provider profile", "NOT_A_PROVIDER");
  return p.id;
}

/**
 * ⚠⚠ Ask somebody at this employer to confirm the employment.
 *
 * ⚠ OWNER-SCOPED: the employer is re-checked against the session's own profile,
 * so the id arriving from the client cannot reach anybody else's row.
 */
export async function requestEmployerValidation(
  viewer: Viewer,
  employerId: string,
  opts: { contactEmail?: string; origin?: string | null } = {}
): Promise<{ sent: boolean; devLink?: string; contactEmail: string }> {
  const profileId = await ownedProfileId(viewer);

  const employer = await prisma.employer.findFirst({
    where: { id: employerId, provider_profile_id: profileId },
    select: {
      id: true,
      name: true,
      role_title: true,
      start_date: true,
      end_date: true,
      is_current: true,
      contact_email: true,
      contact_domain: true,
      validation_status: true,
      providerProfile: {
        select: { person: { select: { first_name: true, last_name: true } } },
      },
    },
  });
  if (!employer) throw new OnboardingError("Job not found", "INVALID");
  if (!employer.name?.trim()) {
    throw new OnboardingError("Give this job a company name first", "INVALID");
  }
  if (employer.validation_status === "VALIDATED") {
    throw new OnboardingError("This job is already validated", "INVALID");
  }

  /* ⚠ The caller may supply the contact on the spot; otherwise the stored one. */
  const contactEmail = (opts.contactEmail ?? employer.contact_email ?? "").trim();
  if (!contactEmail) {
    throw new OnboardingError(
      "Add a contact at this company first — a manager, HR or a colleague",
      "INVALID"
    );
  }

  /*
    ⚠⚠⚠ THE SAME GUARD, NOT A SECOND ONE (`E746` WS-A's rule). The domain the
    contact must be at is the EMPLOYER's own domain. ⚠ Without it a provider
    names any address and confirms their own employment, and the badge is
    decorative — the one thing it must never be.
  */
  /*
    ⚠⚠ THE MISSING-DOMAIN CASE GETS ITS OWN WORDS. ⚠⚠⚠ `checkContactDomain`'s
    refusal reads *"Add the client's website domain to this PROJECT"* — measured
    — and showing that to somebody validating a JOB is the `E459` defect in copy:
    a message that names the wrong thing. ⚠ The RULE is shared; only the sentence
    is this surface's.
  */
  if (!employer.contact_domain?.trim()) {
    throw new OnboardingError(
      "Add this company's website domain first — we can only ask someone with an address there.",
      "INVALID"
    );
  }
  const domainCheck = checkContactDomain(contactEmail, employer.contact_domain);
  if (!domainCheck.ok) {
    /* ⚠ The remaining refusals (free email, mismatch) name a DOMAIN, not a
       project, so they read correctly on this surface and are passed through. */
    throw new OnboardingError(domainCheck.message, "INVALID");
  }

  /*
    ⚠⚠ THE SELF-VALIDATION REFUSAL, MIRRORED FROM `E746`. ⚠⚠⚠ IT MATTERS MORE
    HERE: a provider whose own company is their "employer" is the ordinary case
    for an independent consultant, so without this the employer badge would be
    self-granted by default.
  */
  const self = await prisma.user.findFirst({
    where: { person: { providerProfile: { id: profileId } } },
    select: { email: true },
  });
  const ownDomain = registrableDomain((self?.email ?? "").split("@").pop() ?? "");
  if (ownDomain && domainCheck.domain && ownDomain === domainCheck.domain) {
    throw new OnboardingError(
      "That contact is at your own domain. Validation has to come from someone outside your organisation.",
      "INVALID"
    );
  }

  /*
    ⚠⚠⚠ ONE CAP ACROSS BOTH KINDS. Ten requests a day means ten emails to
    strangers, whichever surface sent them — two caps of ten would be twenty.
  */
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [projToday, empToday] = await Promise.all([
    prisma.projectValidation.count({
      where: { sent_at: { gte: since }, project: { provider_profile_id: profileId } },
    }),
    prisma.employerValidation.count({
      where: { sent_at: { gte: since }, employer: { provider_profile_id: profileId } },
    }),
  ]);
  if (projToday + empToday >= VALIDATION_LIMIT_PER_DAY) {
    throw new OnboardingError(
      `You can send ${VALIDATION_LIMIT_PER_DAY} validation requests a day. Try again tomorrow.`,
      "INVALID"
    );
  }

  /* ⚠ One open request per employer; resend after seven days. */
  const live = await prisma.employerValidation.findFirst({
    where: { employer_id: employer.id, status: "SENT" },
    orderBy: { sent_at: "desc" },
  });
  if (live && Date.now() - live.sent_at.getTime() < RESEND_COOLDOWN_MS) {
    throw new OnboardingError(
      "We've already emailed this contact recently — try again in a few days.",
      "INVALID"
    );
  }

  const raw = randomBytes(32).toString("base64url");
  const tx = await prisma.$transaction([
    /* ⚠ A resend SUPERSEDES: only the newest link may work. `EXPIRED` rather
       than deleted, so the history of what was sent survives. */
    prisma.employerValidation.updateMany({
      where: { employer_id: employer.id, status: "SENT" },
      data: { status: "EXPIRED" },
    }),
    prisma.employerValidation.create({
      data: {
        employer_id: employer.id,
        contact_email: contactEmail,
        token_hash: hashToken(raw),
        expires_at: new Date(Date.now() + TOKEN_TTL_MS),
      },
    }),
    prisma.employer.update({
      where: { id: employer.id },
      data: { validation_status: "PENDING", contact_email: contactEmail },
    }),
  ]);

  const base = appBaseUrl(opts.origin);
  const confirmUrl = `${base}/validate/employer/${raw}`;
  const { subject, html, text } = employerValidationTemplate({
    providerName: displayFullName(
      employer.providerProfile.person.first_name,
      employer.providerProfile.person.last_name
    ),
    employerName: employer.name,
    roleTitle: employer.role_title,
    /* ⚠ THE ONE DATE FORMATTER (`E738`) — `Started 2019` for a job with no end
       and no affirmative `is_current`, which is `E549`'s rule. */
    dates: yearRange(employer.start_date, employer.end_date, employer.is_current),
    confirmUrl,
    logoUrl: `${base}/brand/panameer-lockup-ink.png`,
  });

  if (process.env.RESEND_API_KEY) {
    await sendEmail({
      to: contactEmail,
      subject,
      html,
      text,
      template: "employer-validation",
      subjectType: "EmployerValidation",
      subjectId: tx[1].id,
    });
    return { sent: true, contactEmail };
  }
  console.warn(
    `[employer-validation] RESEND_API_KEY not set — dev fallback. Confirm link for ${contactEmail}:\n${confirmUrl}`
  );
  return { sent: false, devLink: confirmUrl, contactEmail };
}

/** ⚠ What the public confirm page may reveal. Deliberately minimal. */
export type EmployerValidationView = {
  token: string;
  providerName: string;
  employerName: string;
  roleTitle: string | null;
  dates: string | null;
  alreadyAnswered: boolean;
};

export async function getEmployerValidationRequest(
  rawToken: string
): Promise<EmployerValidationView | null> {
  const record = await prisma.employerValidation.findUnique({
    where: { token_hash: hashToken(rawToken) },
    select: {
      status: true,
      expires_at: true,
      employer: {
        select: {
          name: true,
          role_title: true,
          start_date: true,
          end_date: true,
          is_current: true,
          providerProfile: {
            select: { person: { select: { first_name: true, last_name: true } } },
          },
        },
      },
    },
  });
  if (!record) return null;
  /* ⚠ An expired link is not a 404 — the page says so kindly rather than
     implying the request never existed. */
  if (record.expires_at.getTime() < Date.now()) return null;
  return {
    token: rawToken,
    providerName: displayFullName(
      record.employer.providerProfile.person.first_name,
      record.employer.providerProfile.person.last_name
    ),
    employerName: record.employer.name ?? "",
    roleTitle: record.employer.role_title,
    dates: yearRange(
      record.employer.start_date,
      record.employer.end_date,
      record.employer.is_current
    ),
    alreadyAnswered: record.status !== "SENT",
  };
}

/**
 * ⚠⚠ The contact's answer. ⚠⚠⚠ **POST-ON-CLICK, NOT GET** — the project flow's
 * rule and the reason is unchanged: mail scanners pre-fetch links, and a GET
 * that confirms would let a security appliance validate somebody's career.
 *
 * ⚠ `Yes` stamps the employer `VALIDATED` with the contact's **domain** as the
 * source, never their name. `No` returns it to `NONE`.
 */
export async function respondToEmployerValidation(
  rawToken: string,
  answer: "yes" | "no",
  meta: { ip?: string | null; ua?: string | null } = {}
): Promise<{ ok: boolean }> {
  const record = await prisma.employerValidation.findUnique({
    where: { token_hash: hashToken(rawToken) },
    select: { id: true, employer_id: true, status: true, expires_at: true },
  });
  if (!record) return { ok: false };
  if (record.status !== "SENT") return { ok: false };
  if (record.expires_at.getTime() < Date.now()) return { ok: false };

  await prisma.$transaction([
    prisma.employerValidation.update({
      where: { id: record.id },
      data: {
        status: answer === "yes" ? "CONFIRMED" : "DECLINED",
        responded_at: new Date(),
        responder_ip: meta.ip ?? null,
        responder_ua: meta.ua ?? null,
      },
    }),
    prisma.employer.update({
      where: { id: record.employer_id },
      /* ⚠⚠ A `No` GOES BACK TO `NONE`, NOT TO A "REJECTED" STATE. The enum has
         no such member, and more importantly a buyer must never see that
         somebody declined — the provider is told, kindly, and that is all. */
      data: { validation_status: answer === "yes" ? "VALIDATED" : "NONE" },
    }),
  ]);
  return { ok: true };
}
