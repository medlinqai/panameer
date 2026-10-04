import { guardPage } from "@/lib/guard";
import { getIdentity } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";
import { IdentityVerificationPanel } from "@/components/settings/IdentityVerification";

export const metadata = { title: "Identity Verification · Panameer" };

export default async function IdentityPage() {
  const viewer = await guardPage("authenticated");
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
