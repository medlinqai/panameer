import { clientNameVisibility } from "@/lib/plus";

// The one place that decides how a work request's buyer company is shown (explore, feed, detail, Who's Asking).
export const CONFIDENTIAL_BUYER = "Confidential buyer";

export type BuyerDisplay = {
  /** The real name, or null when it must not cross the wire. */
  name: string | null;
  /** For the /companies link — null when withheld or for signed-out viewers. */
  companyId: string | null;
  logoUrl: string | null;
  /** True when the buyer hires confidentially (or Plus-only and the viewer isn't Plus). */
  confidential: boolean;
  /** What to print: the name, the code name, "Confidential buyer", or null. */
  label: string | null;
};

export function buyerDisplay(
  req: { visibility: string; codeName?: string | null; company: { id: string; name: string; logo_url?: string | null } | null },
  viewer: { signedIn: boolean; isOwner?: boolean; isAdmin?: boolean; isPlus?: boolean }
): BuyerDisplay {
  const { clientName } = clientNameVisibility({
    visibility: req.visibility,
    isOwner: !!viewer.isOwner,
    isAdmin: !!viewer.isAdmin,
    isPlus: !!viewer.isPlus,
    clientName: req.company?.name ?? null,
  });
  const confidential = Boolean(req.company?.name) && clientName === null;
  return {
    name: clientName,
    companyId: clientName && viewer.signedIn ? (req.company?.id ?? null) : null,
    logoUrl: confidential ? null : (req.company?.logo_url ?? null),
    confidential,
    label: confidential ? req.codeName?.trim() || CONFIDENTIAL_BUYER : clientName,
  };
}
