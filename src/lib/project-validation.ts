import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { OnboardingError } from "@/lib/onboarding";
import { hashToken, appBaseUrl } from "@/lib/verification";
import { sendEmail } from "@/lib/resend";
import { projectValidationTemplate } from "@/lib/email/templates/project-validation";
import { projectValidatedTemplate } from "@/lib/email/templates/project-validated";
import { displayFullName } from "@/lib/display";
import { checkContactDomain } from "@/lib/email-domain";

/**
 * Project validation — the trust loop (brief_project_validation).
 *
 *   provider requests → contact gets a branded email → they confirm or decline
 *   → the project earns (or doesn't earn) its Validated ✓ badge.
 *
 * The contact has NO ACCOUNT, so the emailed token is the entire authorization.
 * It therefore follows the same contract as every other token in this codebase
 * (decisions-01): a 32-byte random value, stored only as a SHA-256 HASH, with
 * an expiry, consumed on first use. A leaked database gives an attacker
 * hashes, not usable links.
 */

/** 30 days — a client contact will not answer within 24 hours. */
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Don't let a provider re-send at a client contact more than hourly. */
const RESEND_COOLDOWN_MS = 60 * 60 * 1000;

export type ValidationState = {
  /** The project's badge state. */
  status: "NONE" | "PENDING" | "VALIDATED";
  /** When a CONFIRMED response landed — drives "Confirmed March 2026". */
  validatedAt: string | null;
  /** Live request, if any (provider-facing only). */
  requestedAt: string | null;
  contactEmail: string | null;
};

/** Resolve the viewer's OWN provider profile id. Fails closed. */
async function ownedProfileId(viewer: Viewer): Promise<string> {
  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true },
  });
  if (!profile) {
    throw new OnboardingError("No provider profile for this user", "NOT_A_PROVIDER");
  }
  return profile.id;
}

/**
 * Send (or re-send) a validation request for one project.
 *
 * OWNER-SCOPED: the project is re-checked against the session's own profile, so
 * a foreign project id resolves to nothing rather than emailing someone else's
 * client.
 *
 * Returns `devLink` when no Resend key is configured, so the loop stays
 * walkable locally — the same dev affordance the verify-email flow uses (E048).
 */
export async function requestProjectValidation(
  viewer: Viewer,
  projectId: string,
  opts: { origin?: string | null } = {}
): Promise<{ sent: boolean; devLink?: string; contactEmail: string }> {
  const profileId = await ownedProfileId(viewer);

  const project = await prisma.project.findFirst({
    where: { id: projectId, provider_profile_id: profileId },
    include: {
      providerProfile: {
        select: {
          person: { select: { first_name: true, last_name: true } },
        },
      },
    },
  });
  if (!project) throw new OnboardingError("Project not found", "INVALID");

  const contactEmail = (project.contact_email ?? "").trim();
  if (!contactEmail) {
    throw new OnboardingError(
      "Add a client contact email to this project first",
      "INVALID"
    );
  }

  /**
   * THE DOMAIN GUARD (brief_validation_domain_guard) — a HARD BLOCK, and it
   * lives HERE rather than only in the modal because the modal is not a
   * security boundary. Anything that can POST to this endpoint gets the same
   * refusal.
   *
   * Without it the Validated ✓ badge is decorative: a provider could name their
   * own personal address as the "client contact" and confirm their own work.
   */
  const domainCheck = checkContactDomain(contactEmail, project.client_domain);
  if (!domainCheck.ok) {
    throw new OnboardingError(domainCheck.message, "INVALID");
  }
  if (project.validation_status === "VALIDATED") {
    throw new OnboardingError("This project is already validated", "INVALID");
  }

  // Cooldown: a provider hammering "Resend" must not turn into a client
  // contact being mailed repeatedly. Their inbox is the marketing asset here.
  const live = await prisma.projectValidation.findFirst({
    where: { project_id: project.id, status: "SENT" },
    orderBy: { sent_at: "desc" },
  });
  if (live) {
    const age = Date.now() - live.sent_at.getTime();
    if (age < RESEND_COOLDOWN_MS) {
      throw new OnboardingError(
        "We've already emailed this contact recently — try again in a little while.",
        "INVALID"
      );
    }
  }

  const raw = randomBytes(32).toString("base64url");

  await prisma.$transaction([
    // A resend SUPERSEDES: only the newest link may work. Marked EXPIRED rather
    // than deleted so the history of what was sent survives.
    prisma.projectValidation.updateMany({
      where: { project_id: project.id, status: "SENT" },
      data: { status: "EXPIRED" },
    }),
    prisma.projectValidation.create({
      data: {
        project_id: project.id,
        contact_email: contactEmail,
        token_hash: hashToken(raw),
        expires_at: new Date(Date.now() + TOKEN_TTL_MS),
      },
    }),
    prisma.project.update({
      where: { id: project.id },
      data: { validation_status: "PENDING" },
    }),
  ]);

  const base = appBaseUrl(opts.origin);
  const confirmUrl = `${base}/validate/${raw}`;
  const providerName = displayFullName(
    project.providerProfile.person.first_name,
    project.providerProfile.person.last_name
  );

  const { subject, html, text } = projectValidationTemplate({
    providerName,
    projectName: project.name,
    clientName: project.client_name,
    confirmUrl,
    logoUrl: `${base}/brand/panameer-logo-transparent.png`,
  });

  if (process.env.RESEND_API_KEY) {
    await sendEmail({ to: contactEmail, subject, html, text });
    return { sent: true, contactEmail };
  }

  console.warn(
    `[project-validation] RESEND_API_KEY not set — dev fallback. Confirm link for ${contactEmail}:\n${confirmUrl}`
  );
  return { sent: false, devLink: confirmUrl, contactEmail };
}

/** What the public confirm page may reveal. Deliberately minimal. */
export type ValidationRequestView = {
  token: string;
  providerName: string;
  projectName: string;
  clientName: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
};

/**
 * Look up a request by its RAW token for the public page.
 *
 * Returns only what the contact needs to answer the question — provider,
 * project, client, dates. No rate, no bio, no other projects, no session. The
 * token proves they were asked about THIS project and nothing more.
 */
export async function getValidationRequest(
  rawToken: string
): Promise<
  | { ok: true; request: ValidationRequestView }
  | { ok: false; reason: "invalid" | "expired" | "used" }
> {
  if (!rawToken) return { ok: false, reason: "invalid" };

  const record = await prisma.projectValidation.findUnique({
    where: { token_hash: hashToken(rawToken) },
    include: {
      project: {
        include: {
          providerProfile: {
            select: {
              person: { select: { first_name: true, last_name: true } },
            },
          },
        },
      },
    },
  });

  if (!record) return { ok: false, reason: "invalid" };
  if (record.status === "CONFIRMED" || record.status === "DECLINED") {
    return { ok: false, reason: "used" };
  }
  if (record.status === "EXPIRED") return { ok: false, reason: "expired" };
  if (record.expires_at.getTime() < Date.now()) {
    await prisma.projectValidation.update({
      where: { id: record.id },
      data: { status: "EXPIRED" },
    });
    return { ok: false, reason: "expired" };
  }

  const p = record.project;
  return {
    ok: true,
    request: {
      token: rawToken,
      providerName: displayFullName(
        p.providerProfile.person.first_name,
        p.providerProfile.person.last_name
      ),
      projectName: p.name,
      clientName: p.client_name,
      startDate: p.start_date ? p.start_date.toISOString().slice(0, 10) : null,
      endDate: p.end_date ? p.end_date.toISOString().slice(0, 10) : null,
      isCurrent: p.is_current,
    },
  };
}

/**
 * Record the contact's answer. Single-use: the token is spent either way, so a
 * "Decline" cannot be re-opened and clicked "Confirm" by whoever the mail was
 * forwarded to.
 *
 * Only CONFIRM touches the project's badge. DECLINED and EXPIRED leave it
 * exactly as it was — an unanswered or refused request is not evidence of
 * anything, and must never look like it is.
 */
export async function respondToValidation(
  rawToken: string,
  decision: "confirm" | "decline",
  meta: { ip?: string | null; ua?: string | null } = {}
): Promise<
  | { ok: true; decision: "confirm" | "decline"; projectName: string }
  | { ok: false; reason: "invalid" | "expired" | "used" }
> {
  const found = await getValidationRequest(rawToken);
  if (!found.ok) return found;

  const record = await prisma.projectValidation.findUnique({
    where: { token_hash: hashToken(rawToken) },
    include: { project: true },
  });
  if (!record) return { ok: false, reason: "invalid" };

  const now = new Date();
  await prisma.$transaction([
    prisma.projectValidation.update({
      where: { id: record.id },
      data: {
        status: decision === "confirm" ? "CONFIRMED" : "DECLINED",
        responded_at: now,
        responder_ip: meta.ip?.slice(0, 64) ?? null,
        responder_ua: meta.ua?.slice(0, 400) ?? null,
      },
    }),
    prisma.project.update({
      where: { id: record.project_id },
      data: {
        validation_status: decision === "confirm" ? "VALIDATED" : "NONE",
      },
    }),
  ]);

  // One event, no noise (brief §6): tell the provider only on a CONFIRM. A
  // decline is a conversation to have offline, not a push notification.
  if (decision === "confirm") {
    void notifyProviderValidated(record.project_id).catch((e) =>
      console.error("[project-validation] provider notify failed (non-fatal):", e)
    );
  }

  return { ok: true, decision, projectName: record.project.name };
}

/** Tell the provider their project earned its badge. Best-effort. */
async function notifyProviderValidated(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      providerProfile: {
        select: {
          person: {
            select: {
              first_name: true,
              user: { select: { email: true } },
            },
          },
        },
      },
    },
  });
  const email = project?.providerProfile.person.user?.email;
  if (!project || !email) return;

  const base = appBaseUrl();
  const { subject, html, text } = projectValidatedTemplate({
    firstName: project.providerProfile.person.first_name ?? "",
    projectName: project.name,
    clientName: project.client_name,
    profileUrl: `${base}/dashboard`,
    logoUrl: `${base}/brand/panameer-logo-transparent.png`,
  });

  if (process.env.RESEND_API_KEY) {
    await sendEmail({ to: email, subject, html, text });
    return;
  }
  console.warn(
    `[project-validation] validated notice for ${email} (dev, not sent): ${project.name}`
  );
}

/**
 * Per-project validation state for the provider's own surfaces.
 * Keyed by project id.
 */
export async function validationStateFor(
  profileId: string
): Promise<Record<string, ValidationState>> {
  const projects = await prisma.project.findMany({
    where: { provider_profile_id: profileId },
    select: {
      id: true,
      contact_email: true,
      validation_status: true,
      validations: {
        orderBy: { sent_at: "desc" },
        select: { status: true, sent_at: true, responded_at: true },
      },
    },
  });

  const out: Record<string, ValidationState> = {};
  for (const p of projects) {
    const confirmed = p.validations.find((v) => v.status === "CONFIRMED");
    const live = p.validations.find((v) => v.status === "SENT");
    out[p.id] = {
      status: p.validation_status as ValidationState["status"],
      validatedAt: confirmed?.responded_at?.toISOString() ?? null,
      requestedAt: live?.sent_at?.toISOString() ?? null,
      contactEmail: p.contact_email,
    };
  }
  return out;
}
