import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { requestPasswordReset } from "@/lib/password-reset";
import { issueEmailVerification } from "@/lib/verification";
import { writeAudit } from "./audit";
import { notify } from "@/lib/notifications";
import { buildCompletenessInput } from "@/lib/onboarding";
import { missingRequired } from "@/lib/completeness";
import { adminAddToCompany } from "@/lib/company";

export class UserEditError extends Error {
  constructor(message: string, public code: "INVALID" | "NOT_FOUND" | "CONFIRM") {
    super(message);
    this.name = "UserEditError";
  }
}

async function load(personId: string) {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: {
      id: true,
      user_id: true,
      first_name: true,
      last_name: true,
      is_service_buyer: true,
      is_service_provider: true,
      is_service_coordinator: true,
      user: { select: { id: true, email: true, email_verified: true, locked: true, is_active: true } },
    },
  });
  if (!person) throw new UserEditError("That person is gone.", "NOT_FOUND");
  return person;
}

function refuseSelf(viewer: Viewer, userId: string | null, what: string) {
  if (userId && userId === viewer.userId) {
    throw new UserEditError(`You cannot ${what} your own account from here.`, "INVALID");
  }
}

/* ── name ───────────────────────────────────────────────────────────────── */

export async function setName(viewer: Viewer, personId: string, first: string, last: string) {
  const p = await load(personId);
  const f = first.trim();
  const l = last.trim();
  /** A person with no name at all is how a row becomes unfindable — the */
  if (!f && !l) throw new UserEditError("A person needs a first or last name.", "INVALID");

  await prisma.person.update({ where: { id: personId }, data: { first_name: f, last_name: l } });
  /** spellings of one person is on the most-searched field. */
  if (p.user_id) {
    await prisma.user.update({ where: { id: p.user_id }, data: { first_name: f, last_name: l } });
  }
  await writeAudit(viewer, {
    action: "user.rename",
    targetTable: "people",
    targetId: p.user_id ?? personId,
    detail: {
      field: "name",
      before: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
      after: `${f} ${l}`.trim(),
    },
  });
}

/* ── email ──────────────────────────────────────────────────────────────── */

/** CHANGING AN EMAIL UN-VERIFIES IT AND SENDS A FRESH VERIFICATION. An */
export async function setEmail(viewer: Viewer, personId: string, rawEmail: string, origin?: string | null) {
  const p = await load(personId);
  if (!p.user_id || !p.user) throw new UserEditError("That person has no account to change.", "INVALID");

  const email = normalizeEmail(rawEmail);
  if (!email || !email.includes("@")) throw new UserEditError("That is not an email address.", "INVALID");
  if (email === normalizeEmail(p.user.email)) return { changed: false, sent: false };

  const taken = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (taken) throw new UserEditError("Another account already uses that address.", "INVALID");

  await prisma.user.update({
    where: { id: p.user_id },
    data: { email, email_verified: null },
  });
  await writeAudit(viewer, {
    action: "user.email_change",
    targetTable: "users",
    targetId: p.user_id,
    detail: { field: "email", before: p.user.email, after: email, verified: "cleared" },
  });

  /** The send is best-effort and reported — a mail outage must not leave the */
  const r = await issueEmailVerification(p.user_id, { origin, throttle: false });
  return { changed: true, sent: r.ok ? r.sent : false };
}

export async function markEmailVerified(viewer: Viewer, personId: string, reason?: string) {
  const p = await load(personId);
  if (!p.user_id || !p.user) throw new UserEditError("That person has no account.", "INVALID");
  if (p.user.email_verified) return;
  const now = new Date();
  await prisma.user.update({ where: { id: p.user_id }, data: { email_verified: now } });
  await writeAudit(viewer, {
    action: "user.mark_verified",
    targetTable: "users",
    targetId: p.user_id,
    /** RECORDED AS AN ADMIN OVERRIDE, because that is what it is: nobody */
    detail: { field: "email_verified", before: null, after: now.toISOString(), by: "admin override", reason: reason?.trim() || null },
  });
}

/* ── roles ──────────────────────────────────────────────────────────────── */

export async function setRoles(
  viewer: Viewer,
  personId: string,
  roles: { buyer?: boolean; provider?: boolean; coordinator?: boolean },
) {
  const p = await load(personId);
  const next = {
    is_service_buyer: roles.buyer ?? p.is_service_buyer,
    is_service_provider: roles.provider ?? p.is_service_provider,
    is_service_coordinator: roles.coordinator ?? p.is_service_coordinator,
  };
  await prisma.person.update({ where: { id: personId }, data: next });
  await writeAudit(viewer, {
    action: "user.set_roles",
    targetTable: "people",
    targetId: p.user_id ?? personId,
    detail: {
      field: "roles",
      before: { buyer: p.is_service_buyer, provider: p.is_service_provider, coordinator: p.is_service_coordinator },
      after: { buyer: next.is_service_buyer, provider: next.is_service_provider, coordinator: next.is_service_coordinator },
    },
  });
}

/* ── lock / deactivate ──────────────────────────────────────────────────── */

/** LOCK AND DEACTIVATE ARE DIFFERENT THINGS AND BOTH ALREADY EXISTED */
export async function setLocked(viewer: Viewer, personId: string, locked: boolean, confirmed: boolean) {
  const p = await load(personId);
  if (!p.user_id || !p.user) throw new UserEditError("That person has no account.", "INVALID");
  /** Refused BEFORE the confirmation is considered: a question whose only */
  if (locked) refuseSelf(viewer, p.user_id, "lock");
  if (locked && !confirmed) throw new UserEditError("Locking signs this person out. Confirm first.", "CONFIRM");
  if (p.user.locked === locked) return;

  await prisma.user.update({
    where: { id: p.user_id },
    /** Unlocking clears the counter and the window too, or the next sign-in */
    data: locked
      ? { locked: true }
      : { locked: false, failed_login_attempts: 0, locked_until: null },
  });
  await writeAudit(viewer, {
    action: locked ? "user.lock" : "user.unlock",
    targetTable: "users",
    targetId: p.user_id,
    detail: { field: "locked", before: p.user.locked, after: locked },
  });
}

/** SOFT, AND THAT IS THE POINT. It blocks sign-in (`auth.ts` already reads */
export async function setActive(viewer: Viewer, personId: string, active: boolean, confirmed: boolean) {
  const p = await load(personId);
  if (!p.user_id || !p.user) throw new UserEditError("That person has no account.", "INVALID");
  if (!active) refuseSelf(viewer, p.user_id, "deactivate");
  if (!active && !confirmed) {
    throw new UserEditError("Deactivating signs this person out and hides them. Confirm first.", "CONFIRM");
  }
  if (p.user.is_active === active) return;

  await prisma.user.update({ where: { id: p.user_id }, data: { is_active: active } });
  await writeAudit(viewer, {
    action: active ? "user.reactivate" : "user.deactivate",
    targetTable: "users",
    targetId: p.user_id,
    detail: { field: "is_active", before: p.user.is_active, after: active, note: "soft — no rows removed" },
  });
}

/* ── password reset ─────────────────────────────────────────────────────── */

/** IT REUSES 's PATH, which carries the 1-hour expiry, the 3-per-hour */
export async function sendPasswordReset(viewer: Viewer, personId: string, origin?: string | null) {
  const p = await load(personId);
  if (!p.user_id || !p.user) throw new UserEditError("That person has no account.", "INVALID");

  await requestPasswordReset(p.user.email, { origin });
  await writeAudit(viewer, {
    action: "user.password_reset_sent",
    targetTable: "users",
    targetId: p.user_id,
    /** The address is recorded; no token and no link ever is. */
    detail: { to: p.user.email, via: "E528 reset path" },
  });
  /** The caller is told it was SENT, not whether the address exists — the */
  return { sent: true };
}

/* ── lifecycle fixes (admin user detail) ─────────────────────────────── */

const listOf = (a: string[]) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} and ${a.at(-1)}` : a[0] ?? "");

/** Step 3: "finish your profile" — one notice naming exactly what's missing. */
export async function nudgeFinishProfile(viewer: Viewer, personId: string) {
  const p = await prisma.person.findUnique({ where: { id: personId }, select: { user_id: true, providerProfile: { select: { id: true } } } });
  if (!p?.providerProfile) throw new UserEditError("This person has no seller profile to finish.", "INVALID");
  const input = await buildCompletenessInput(p.providerProfile.id);
  const missing = input ? missingRequired(input) : [];
  if (!missing.length) throw new UserEditError("Their profile checklist is already complete.", "INVALID");
  await notify({ event: "profile.score_reweight", personId, entityType: "provider_profile", entityId: p.providerProfile.id, dedupeKey: `profile.nudge:${new Date().toISOString().slice(0, 10)}`, vars: { missing: listOf(missing) } });
  await writeAudit(viewer, { action: "user.nudge_profile", targetTable: "people", targetId: p.user_id ?? personId, detail: { missing } });
  return { missing };
}

/** Step 4: add the person to a company as a member (one company per person). */
export async function addToCompany(viewer: Viewer, personId: string, companyId: string, reason?: string) {
  const p = await load(personId);
  const co = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } });
  if (!co) throw new UserEditError("That company is gone.", "NOT_FOUND");
  await adminAddToCompany(personId, companyId);
  await writeAudit(viewer, { action: "user.add_to_company", targetTable: "company_memberships", targetId: p.user_id ?? personId, detail: { company: co.name, companyId, role: "MEMBER", reason: reason?.trim() || null } });
}
