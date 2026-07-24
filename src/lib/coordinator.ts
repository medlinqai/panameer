import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { hashToken, appBaseUrl } from "@/lib/verification";
import { inviteProviderTemplate } from "@/lib/email/templates/invite-provider";
import { isMarketplaceVisible, type Viewer } from "@/lib/access";

/**
 * Coordinator → provider invites (brief_I). Reuses the hash-only token pattern
 * and the Resend send infra (dev fallback) from the email-verification flow —
 * nothing is duplicated. Access is by identity: the inviter is always the
 * viewer's own coordinator Person; invite mutations are owner-scoped to it.
 */

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class CoordinatorError extends Error {
  constructor(
    message: string,
    public code: "NOT_A_COORDINATOR" | "NOT_FOUND" | "INVALID" | "EMAIL_MISMATCH" | "NOT_A_PROVIDER"
  ) {
    super(message);
    this.name = "CoordinatorError";
  }
}

/** Resolve the viewer's own coordinator Person. Fails closed. */
async function resolveCoordinator(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true, first_name: true, last_name: true, is_service_coordinator: true },
  });
  if (!person || !person.is_service_coordinator) {
    throw new CoordinatorError("Not a coordinator", "NOT_A_COORDINATOR");
  }
  return person;
}

const coordinatorName = (p: { first_name: string; last_name: string }) =>
  `${p.first_name} ${p.last_name}`.trim();

/** Send (or dev-log) an invite email for an existing invite row. */
async function sendInviteEmail(invite: {
  invitee_email: string;
  invitee_first_name: string | null;
  message: string | null;
  rawToken: string;
  coordinator: { first_name: string; last_name: string };
}): Promise<{ sent: boolean; devLink?: string }> {
  const acceptUrl = `${appBaseUrl()}/invite/accept?token=${invite.rawToken}`;
  const { subject, html, text } = inviteProviderTemplate({
    coordinatorName: coordinatorName(invite.coordinator),
    inviteeFirstName: invite.invitee_first_name,
    acceptUrl,
    message: invite.message,
  });
  if (process.env.RESEND_API_KEY) {
    await sendEmail({ to: invite.invitee_email, subject, html, text });
    return { sent: true };
  }
  console.warn(
    `[coordinator] RESEND_API_KEY not set — dev fallback. Invite link for ${invite.invitee_email}:\n${acceptUrl}`
  );
  return { sent: false, devLink: acceptUrl };
}

/**
 * Create a PENDING invite + send the branded email. Re-inviting the same email
 * revokes any prior PENDING invites from this coordinator.
 */
export async function createInvite(
  viewer: Viewer,
  input: { email: string; firstName?: string; lastName?: string; message?: string }
): Promise<{ ok: true; inviteId: string; sent: boolean; devLink?: string }> {
  const coordinator = await resolveCoordinator(viewer);
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new CoordinatorError("A valid email is required", "INVALID");
  }

  // Revoke prior PENDING invites to the same email from this coordinator.
  await prisma.coordinatorInvite.updateMany({
    where: {
      inviter_person_id: coordinator.id,
      invitee_email: email,
      status: "PENDING",
    },
    data: { status: "REVOKED" },
  });

  const rawToken = randomBytes(32).toString("base64url");
  const invite = await prisma.coordinatorInvite.create({
    data: {
      inviter_person_id: coordinator.id,
      invitee_email: email,
      invitee_first_name: input.firstName?.trim() || null,
      invitee_last_name: input.lastName?.trim() || null,
      message: input.message?.trim() || null,
      token_hash: hashToken(rawToken),
      status: "PENDING",
      expires_at: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  const res = await sendInviteEmail({
    invitee_email: email,
    invitee_first_name: invite.invitee_first_name,
    message: invite.message,
    rawToken,
    coordinator,
  });

  return { ok: true, inviteId: invite.id, sent: res.sent, devLink: res.devLink };
}

/** Re-send an invite (owner-scoped) — refreshes the token + 7-day expiry. */
export async function resendInvite(viewer: Viewer, inviteId: string) {
  const coordinator = await resolveCoordinator(viewer);
  const invite = await prisma.coordinatorInvite.findFirst({
    where: { id: inviteId, inviter_person_id: coordinator.id },
  });
  if (!invite) throw new CoordinatorError("Invite not found", "NOT_FOUND");
  if (invite.status !== "PENDING") {
    throw new CoordinatorError("Only pending invites can be resent", "INVALID");
  }
  const rawToken = randomBytes(32).toString("base64url");
  await prisma.coordinatorInvite.update({
    where: { id: invite.id },
    data: {
      token_hash: hashToken(rawToken),
      expires_at: new Date(Date.now() + INVITE_TTL_MS),
    },
  });
  const res = await sendInviteEmail({
    invitee_email: invite.invitee_email,
    invitee_first_name: invite.invitee_first_name,
    message: invite.message,
    rawToken,
    coordinator,
  });
  return { ok: true, sent: res.sent, devLink: res.devLink };
}

/** Revoke a pending invite (owner-scoped). */
export async function revokeInvite(viewer: Viewer, inviteId: string) {
  const coordinator = await resolveCoordinator(viewer);
  const invite = await prisma.coordinatorInvite.findFirst({
    where: { id: inviteId, inviter_person_id: coordinator.id },
  });
  if (!invite) throw new CoordinatorError("Invite not found", "NOT_FOUND");
  if (invite.status === "PENDING") {
    await prisma.coordinatorInvite.update({
      where: { id: invite.id },
      data: { status: "REVOKED" },
    });
  }
  return { ok: true };
}

/** The coordinator's roster: represented providers + pending invites. */
export async function getRoster(viewer: Viewer) {
  const coordinator = await resolveCoordinator(viewer);

  const reps = await prisma.providerProfile.findMany({
    where: { coordinator_person_id: coordinator.id },
    include: {
      person: { select: { first_name: true, last_name: true } },
    },
    orderBy: { updated_at: "desc" },
  });

  // Lazily mark expired pending invites, then read the pending set.
  await prisma.coordinatorInvite.updateMany({
    where: {
      inviter_person_id: coordinator.id,
      status: "PENDING",
      expires_at: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
  const pending = await prisma.coordinatorInvite.findMany({
    where: { inviter_person_id: coordinator.id, status: "PENDING" },
    orderBy: { created_at: "desc" },
  });

  return {
    coordinatorName: coordinatorName(coordinator),
    providers: reps.map((p) => ({
      id: p.id,
      name: `${p.person.first_name} ${p.person.last_name}`.trim(),
      headline: p.headline || null,
      // brief_K: status + derived visibility + validation (no approval/publish).
      status: p.status,
      validationStatus: p.validation_status,
      completeness: p.completeness,
      visible: isMarketplaceVisible(p),
    })),
    pendingInvites: pending.map((i) => ({
      id: i.id,
      email: i.invitee_email,
      name: [i.invitee_first_name, i.invitee_last_name].filter(Boolean).join(" ") || null,
      invitedAt: i.created_at,
      expiresAt: i.expires_at,
    })),
  };
}

// ---------------------------------------------------------------------------
// Accept side (public token lookup + authenticated linking).
// ---------------------------------------------------------------------------

export type InviteLookup =
  | {
      ok: true;
      inviteeEmail: string;
      inviteeFirstName: string | null;
      inviteeLastName: string | null;
      coordinatorName: string;
      message: string | null;
      accountExists: boolean;
    }
  | { ok: false; reason: "invalid" | "expired" | "revoked" | "used" };

/**
 * Validate a raw invite token WITHOUT side effects beyond lazily flipping a
 * past-due PENDING invite to EXPIRED. Used by the accept page + the wizard
 * pre-fill. Never links anything.
 */
export async function lookupInvite(rawToken: string): Promise<InviteLookup> {
  if (!rawToken) return { ok: false, reason: "invalid" };
  const invite = await prisma.coordinatorInvite.findUnique({
    where: { token_hash: hashToken(rawToken) },
    include: {
      inviter: { select: { first_name: true, last_name: true } },
    },
  });
  if (!invite) return { ok: false, reason: "invalid" };
  if (invite.status === "REVOKED") return { ok: false, reason: "revoked" };
  if (invite.status === "ACCEPTED") return { ok: false, reason: "used" };
  if (invite.status === "EXPIRED" || invite.expires_at.getTime() < Date.now()) {
    if (invite.status === "PENDING") {
      await prisma.coordinatorInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
    }
    return { ok: false, reason: "expired" };
  }

  const account = await prisma.user.findUnique({
    where: { email: invite.invitee_email },
    select: { id: true },
  });

  return {
    ok: true,
    inviteeEmail: invite.invitee_email,
    inviteeFirstName: invite.invitee_first_name,
    inviteeLastName: invite.invitee_last_name,
    coordinatorName: coordinatorName(invite.inviter),
    message: invite.message,
    accountExists: account != null,
  };
}

/**
 * AUTHORITATIVE link: attach the accepting user's provider profile to the
 * inviting coordinator and mark the invite ACCEPTED. Used by BOTH accept paths
 * (new user after account creation, existing provider logged-in accept).
 *
 * Enforces `user.email === invite.invitee_email` — so a token can never
 * reassign someone else's provider; only the invitee, authenticated as their
 * own account, can accept. Requires the user to have a ProviderProfile.
 */
export async function acceptInviteForUser(
  userId: string,
  rawToken: string
): Promise<
  | { ok: true; coordinatorName: string }
  | { ok: false; reason: "invalid" | "expired" | "revoked" | "used" | "email_mismatch" | "not_a_provider" }
> {
  const invite = await prisma.coordinatorInvite.findUnique({
    where: { token_hash: hashToken(rawToken) },
    include: { inviter: { select: { id: true, first_name: true, last_name: true } } },
  });
  if (!invite) return { ok: false, reason: "invalid" };
  if (invite.status === "REVOKED") return { ok: false, reason: "revoked" };
  if (invite.status === "ACCEPTED") return { ok: false, reason: "used" };
  if (invite.expires_at.getTime() < Date.now()) {
    await prisma.coordinatorInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    return { ok: false, reason: "expired" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { person: { include: { providerProfile: { select: { id: true } } } } },
  });
  if (!user) return { ok: false, reason: "invalid" };

  // The accepting user must BE the invitee — no cross-account reassignment.
  if (user.email.toLowerCase() !== invite.invitee_email.toLowerCase()) {
    return { ok: false, reason: "email_mismatch" };
  }
  const providerProfile = user.person?.providerProfile;
  if (!providerProfile) return { ok: false, reason: "not_a_provider" };

  await prisma.$transaction([
    prisma.providerProfile.update({
      where: { id: providerProfile.id },
      data: { coordinator_person_id: invite.inviter.id },
    }),
    prisma.coordinatorInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", accepted_provider_id: providerProfile.id },
    }),
  ]);

  return { ok: true, coordinatorName: coordinatorName(invite.inviter) };
}
