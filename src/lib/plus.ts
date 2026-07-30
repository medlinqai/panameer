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
