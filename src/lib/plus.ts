import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";

/**
 * Panameer **Plus** — the membership gate (PJv2 WS5 / E078b).
 *
 * Plus is a BUYER-COMPANY tier (decisions-01, 2026-07-29), and the enum already
 * exists as `BuyerProfile.subscription_tier = BUSINESS_PLUS`, so this is a real
 * check rather than a stub: whatever the eventual billing flow is, it will set
 * that column, and this reads it.
 *
 * The first thing Plus buys is the **validation contact** — the named person at
 * the client who confirmed a provider's work. That is the most valuable single
 * field on a profile (it is a warm reference), which is exactly why it is the
 * lever rather than something cosmetic.
 *
 * WHY THIS LIVES SERVER-SIDE: the gate is a REDACTION, not a CSS state. If the
 * contact address were sent to every viewer and merely hidden in the UI, anyone
 * could read it out of the network response and the tier would be worthless. The
 * address must never leave the server for a viewer who may not see it.
 */

/** Is this viewer entitled to see gated buyer-side detail? */
export async function viewerIsPlus(viewer: Viewer | null): Promise<boolean> {
  if (!viewer) return false;
  // Panameer staff can see everything — they support both sides of a dispute.
  if (viewer.isSystemAdmin) return true;

  const buyer = await prisma.buyerProfile.findFirst({
    where: { person: { user_id: viewer.userId } },
    select: { subscription_tier: true },
  });
  return buyer?.subscription_tier === "BUSINESS_PLUS";
}

/**
 * What a given viewer may see of a contact address.
 *
 * `owner` always wins: a provider looking at their own profile is not being sold
 * their own data back.
 */
export function contactVisibility({
  isOwner,
  isPlus,
  contactEmail,
}: {
  isOwner: boolean;
  isPlus: boolean;
  contactEmail: string | null | undefined;
}): { hasContact: boolean; contactEmail: string | null; locked: boolean } {
  const email = contactEmail?.trim() || null;
  if (!email) return { hasContact: false, contactEmail: null, locked: false };
  if (isOwner || isPlus) {
    return { hasContact: true, contactEmail: email, locked: false };
  }
  // Present but withheld — the UI needs to know it EXISTS to offer the upgrade,
  // and that is the only bit that crosses the wire.
  return { hasContact: true, contactEmail: null, locked: true };
}

/**
 * WHO MAY SEE A PROVIDER'S SURNAME (E049).
 *
 * The identity-masking decision: before a transaction, a buyer gets the
 * expertise, not the person. First name, photo, headline, skills, rate and
 * location are enough to decide whether an expert is worth talking to; the
 * surname is what turns a profile into a lead someone can take off-platform.
 *
 * ⚠ THE TRANSACTION TIER IS A STUB, and honestly so. `hasTransacted` is the
 * parameter that will eventually unmask — a buyer who has engaged this provider
 * has obviously earned their full name — but there are no engagements in the
 * system yet, so every caller passes `false` today. It is a named argument
 * rather than a TODO because the shape of the rule is knowable now and the
 * caller list is not something to go rediscover later.
 *
 * Owner and admin are unmasked for the same reasons they are everywhere else:
 * you cannot edit a profile you cannot see, and staff arbitrate disputes
 * against whole records.
 */
export function identityVisibility({
  isOwner,
  isAdmin,
  hasTransacted = false,
}: {
  isOwner: boolean;
  isAdmin: boolean;
  hasTransacted?: boolean;
}): { showSurname: boolean } {
  return { showSurname: isOwner || isAdmin || hasTransacted };
}

/**
 * Who may see a project's REAL client name (Walk6 WS3 / E114).
 *
 * The name is always STORED — it is required, and the validation email needs it
 * — so this is purely about who the render may reach. Three settings, and the
 * one that matters is that CONFIDENTIAL means confidential: not "styled as
 * hidden", not "hidden unless you read the payload".
 *
 *   PUBLIC        everyone
 *   PLUS_ONLY     the owner, Panameer staff, and paying (Plus) buyers
 *   CONFIDENTIAL  the owner and Panameer staff only
 *
 * Staff always see it because they arbitrate validation disputes and cannot do
 * that against a redacted record.
 */
export function clientNameVisibility({
  visibility,
  isOwner,
  isPlus,
  isAdmin,
  clientName,
}: {
  visibility: string;
  isOwner: boolean;
  isPlus: boolean;
  isAdmin: boolean;
  clientName: string | null | undefined;
}): { clientName: string | null; clientLocked: boolean } {
  const name = clientName?.trim() || null;
  if (!name) return { clientName: null, clientLocked: false };
  if (isOwner || isAdmin) return { clientName: name, clientLocked: false };
  if (visibility === "PUBLIC") return { clientName: name, clientLocked: false };
  if (visibility === "PLUS_ONLY" && isPlus) {
    return { clientName: name, clientLocked: false };
  }
  // Withheld. The card already shows the code name and industry; what matters
  // here is that the real name does not cross the wire.
  return { clientName: null, clientLocked: true };
}
