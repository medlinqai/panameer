import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";

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

export function clientNameVisibility({
  visibility,
  isOwner,
  isPlus,
  isAdmin,
  isVisitor = false,
  clientName,
}: {
  visibility: string;
  isOwner: boolean;
  isPlus: boolean;
  isAdmin: boolean;
  isVisitor?: boolean;
  clientName: string | null | undefined;
}): { clientName: string | null; clientLocked: boolean } {
  const name = clientName?.trim() || null;
  if (!name) return { clientName: null, clientLocked: false };
  if (isOwner || isAdmin) return { clientName: name, clientLocked: false };
  if (isVisitor) return { clientName: null, clientLocked: true };
  if (visibility === "PUBLIC") return { clientName: name, clientLocked: false };
  if (visibility === "PLUS_ONLY" && isPlus) {
    return { clientName: name, clientLocked: false };
  }
  // Withheld. The card already shows the code name and industry; what matters
  // here is that the real name does not cross the wire.
  return { clientName: null, clientLocked: true };
}
