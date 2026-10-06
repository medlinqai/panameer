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

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

async function ownedProfileId(viewer: Viewer): Promise<string> {
  const p = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true },
  });
  if (!p) throw new OnboardingError("No provider profile", "NOT_A_PROVIDER");
  return p.id;
}

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

  const contactEmail = (opts.contactEmail ?? employer.contact_email ?? "").trim();
  if (!contactEmail) {
    throw new OnboardingError(
      "Add a contact at this company first — a manager, HR or a colleague",
      "INVALID"
    );
  }

  if (!employer.contact_domain?.trim()) {
    throw new OnboardingError(
      "Add this company's website domain first — we can only ask someone with an address there.",
      "INVALID"
    );
  }
  const domainCheck = checkContactDomain(contactEmail, employer.contact_domain);
  if (!domainCheck.ok) {
    throw new OnboardingError(domainCheck.message, "INVALID");
  }

  const self = await prisma.user.findFirst({
    where: { person: { providerProfile: { id: profileId } } },
    select: { email: true },
  });
  const ownDomain = registrableDomain((self?.email ?? "").split("@").pop() ?? "");
  if (ownDomain && domainCheck.domain && ownDomain === domainCheck.domain) {
    throw new OnboardingError(
      "That contact is at your own domain. Validation has to come from someone outside your organization.",
      "INVALID"
    );
  }

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

  /* One open request per employer; resend after seven days. */
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
    // A resend SUPERSEDES: only the newest link may work. `EXPIRED` rather
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
    // THE ONE DATE FORMATTER — `Started 2019` for a job with no end
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

/** What the public confirm page may reveal. Deliberately minimal. */
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
  // An expired link is not a 404 — the page says so kindly rather than
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

/** The contact's answer. POST-ON-CLICK, NOT GET — the project flow's */
export async function respondToEmployerValidation(
  rawToken: string,
  answer: "yes" | "no",
  meta: { ip?: string | null; ua?: string | null } = {}
): Promise<{ ok: boolean }> {
  const record = await prisma.employerValidation.findUnique({
    where: { token_hash: hashToken(rawToken) },
    select: {
      id: true,
      employer_id: true,
      status: true,
      expires_at: true,
      /* `P2-A1.1-E749` WS-D — who to tell, and what to call the thing. */
      employer: {
        select: {
          name: true,
          providerProfile: { select: { person_id: true } },
        },
      },
    },
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
      // A `No` GOES BACK TO `NONE`, NOT TO A "REJECTED" STATE. The enum has
      data: { validation_status: answer === "yes" ? "VALIDATED" : "NONE" },
    }),
  ]);

  // TELL THE PROVIDER , WS-D)
  try {
    const { notify } = await import("@/lib/notifications");
    await notify({
      event: answer === "yes" ? "validation.confirmed" : "validation.declined",
      personId: record.employer.providerProfile.person_id,
      vars: { subject: record.employer.name ?? "Your job" },
      dedupeKey: `validation:${record.id}`,
    });
  } catch (e) {
    console.error("[employer-validation] could not record a notification:", e);
  }
  return { ok: true };
}
