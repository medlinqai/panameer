import { guardPage } from "@/lib/guard";
import { getIdentity } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";
import { IdentityVerificationPanel } from "@/components/settings/IdentityVerification";

/**
 * IDENTITY VERIFICATION (J2.4 WS-H / E019).
 *
 * FREE, and distinct from "Validated" (Confirm #3). Two things the surface this
 * replaces got wrong in one panel:
 *
 *   THE CONNECTS COST IS STRIPPED. It charged 35 Connects; Connects do not
 *   exist on Panameer, and the KYC partner that would make verification cost
 *   anything is deferred. Free is the truthful price today.
 *
 *   IT IS NOT THE MERIT BADGE. "Validated" is granted by Panameer on the
 *   quality of somebody's work and is never purchasable. This says the person
 *   is who they claim to be. Conflating them would let identity — which anyone
 *   with a passport can obtain — read as an endorsement.
 */
export const metadata = { title: "Identity Verification · Panameer" };

export default async function IdentityPage() {
  const viewer = await guardPage("canProvideServices");
  const [idv, profile] = await Promise.all([
    getIdentity(viewer),
    prisma.providerProfile.findFirst({
      where: ownedProviderProfile(viewer),
      select: { validation_status: true },
    }),
  ]);

  return (
    <IdentityVerificationPanel
      status={idv?.status ?? "NOT_STARTED"}
      document={idv?.document ?? null}
      submittedAt={idv?.submitted_at?.toISOString().slice(0, 10) ?? null}
      expiresAt={idv?.expires_at?.toISOString().slice(0, 10) ?? null}
      note={idv?.note ?? null}
      validated={profile?.validation_status === "VALIDATED"}
    />
  );
}
